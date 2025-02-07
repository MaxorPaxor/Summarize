import { API_KEY } from './keys.js';

let allBulletPoints = [];

document.getElementById('summarize').addEventListener('click', async () => {
  const summaryDiv = document.getElementById('summary');
  const moreContainer = document.getElementById('more-container');
  
  // Show loading spinner
  summaryDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  summaryDiv.className = 'loading';
  moreContainer.className = 'hidden';

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    // Check if we're on a protected page
    const url = tab.url || tab.pendingUrl || '';
    if (url.startsWith('chrome://') || 
        url.startsWith('chrome-extension://') || 
        url.startsWith('https://chrome.google.com/webstore')) {
      throw new Error('Cannot summarize this page. Try a regular webpage instead.');
    }

    // Extract text content from the page
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getPageContent,
    });

    if (!result || result === 'Page has no text content.') {
      throw new Error('No text content found on this page');
    }

    // Call API for summary
    const summary = await getSummary(result);
    
    // Parse bullet points from summary
    allBulletPoints = summary.split('\n').filter(point => point.trim());
    
    // Show first 3 bullet points
    displayBulletPoints(0, 3);
    
    // Show "More" button if there are more points
    if (allBulletPoints.length > 3) {
      moreContainer.className = '';
    }
    
    summaryDiv.className = '';
  } catch (error) {
    console.error('Error:', error);
    summaryDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    summaryDiv.className = 'error';
  }
});

document.getElementById('more-btn').addEventListener('click', () => {
  displayBulletPoints(0, 6);
  document.getElementById('more-container').className = 'hidden';
});

function displayBulletPoints(start, end) {
  const summaryDiv = document.getElementById('summary');
  summaryDiv.innerHTML = allBulletPoints
    .slice(start, end)
    .map(point => `<div class="bullet-point">${point}</div>`)
    .join('');
}

// Modified getSummary function
async function getSummary(text, retryCount = 0) {
  const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  const requestBody = {
    model: "mistralai/mistral-7b-instruct:free",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that provides structured summaries. Always provide exactly 6 bullet points: first 3 bullets for main key points, followed by 3 bullets for additional interesting details."
      },
      {
        role: "user",
        content: `Please summarize the following text in exactly 6 bullet points and nothing else:
        • First 3 bullets: Main key points and core summary
        • Last 3 bullets: Additional interesting details or context
        
        Text to summarize:
        ${text}`
      }
    ],
    temperature: 0.5,
    max_tokens: 300,
    top_p: 0.9
  };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'Chrome Extension'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
      return getSummary(text, retryCount + 1);
    }
    throw error;
  }
}

// Add the getPageContent function
function getPageContent() {
  const MAX_CHARS = 4000;
  
  try {
    // Method 1: Get all visible text
    let content = document.body.innerText;

    // Basic cleanup
    content = content
      .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
      .replace(/\n+/g, '\n')   // Replace multiple newlines with single newline
      .trim();

    // If content is too short, try to wait for dynamic content
    if (content.length < 100) {
      return new Promise(resolve => {
        setTimeout(() => {
          content = document.body.innerText
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n')
            .trim();
          
          // Return whatever we have, even if it's short
          resolve(content.substring(0, MAX_CHARS));
        }, 1000);
      });
    }

    // Return the content, limited to MAX_CHARS
    return content.substring(0, MAX_CHARS);

  } catch (error) {
    console.error('Content extraction error:', error);
    // Return any text we can find
    return document.body.innerText.substring(0, MAX_CHARS) || 'Page has no text content.';
  }
}

// Add sleep function if not already present
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add AdSense initialization
window.addEventListener('load', () => {
  (adsbygoogle = window.adsbygoogle || []).push({});
}); 