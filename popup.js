document.addEventListener('DOMContentLoaded', async () => {
  const { API_KEY } = await chrome.storage.local.get('API_KEY');
  if (!API_KEY) {
    const summaryDiv = document.getElementById('summary');
    summaryDiv.innerHTML = `
      <p>Please set your API key to use the summarizer.</p>
      <p>1. Get your API key from <a href="https://openrouter.ai/keys" target="_blank">OpenRouter</a></p>
      <p>2. Click the extension icon and select "Options"</p>
      <p>3. Enter your API key and save</p>
    `;
    document.getElementById('summarize').disabled = true;
  }
});

API_KEY = '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'

document.getElementById('summarize').addEventListener('click', async () => {
  const summaryDiv = document.getElementById('summary');
  summaryDiv.textContent = 'Extracting content...';
  summaryDiv.className = 'loading';

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    // Extract text content from the page
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getPageContent,
    });

    // Simplified content validation
    if (!result || result === 'Page has no text content.') {
      throw new Error('No text content found on this page');
    }

    console.log('Extracted text length:', result.length);
    summaryDiv.textContent = 'Calling API...';

    // Call DeepSeek API
    const summary = await getSummary(result);
    
    summaryDiv.textContent = summary;
    summaryDiv.className = '';
  } catch (error) {
    console.error('Error:', error);
    if (error.message.includes('Rate limit')) {
      summaryDiv.textContent = 'Error: API rate limit reached. Please try again in a few seconds.';
    } else if (error.message.includes('API key')) {
      summaryDiv.textContent = error.message;
    } else {
      summaryDiv.textContent = 'Error: ' + error.message;
    }
    summaryDiv.className = 'error';
  }
});

// Function to extract content from the page
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

// Improved text cleaning function
function cleanText(text, maxChars) {
  return text
    .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n')   // Replace multiple newlines with single newline
    .replace(/[^\S\r\n]+/g, ' ') // Replace multiple spaces (but not newlines) with single space
    .replace(/\t/g, ' ')         // Replace tabs with spaces
    .replace(/\u200B/g, '')      // Remove zero-width spaces
    .replace(/\u00A0/g, ' ')     // Replace non-breaking spaces with regular spaces
    .trim()
    .substring(0, maxChars);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Modified getSummary function
async function getSummary(text, retryCount = 0) {
  // Get API key from storage instead of config
  const { API_KEY } = await chrome.storage.local.get('API_KEY');
  if (!API_KEY) {
    throw new Error('API key not set. Please set your API key in the options page.');
  }
  
  const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 2000;

  // Modified request body with a different model and more specific parameters
  const requestBody = {
    model: "mistralai/mistral-7b-instruct:free",  // Changed model
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that provides concise summaries."
      },
      {
        role: "user",
        content: `Please shortly summarize the following text:\n\n${text}`
      }
    ],
    temperature: 0.5,  // Lower temperature for more focused responses
    max_tokens: 200,
    top_p: 0.9,
    frequency_penalty: 0.0,
    presence_penalty: 0.0
  };
  
  try {
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'https://github.com',
        'X-Title': 'Chrome Extension'
      },
      body: JSON.stringify(requestBody)
    }).catch(error => {
      console.error('Fetch error:', error);
      throw new Error('Network error: Unable to connect to the API');
    });

    const rawResponse = await response.text();
    console.log('Response Status:', response.status);
    console.log('Raw Response:', rawResponse);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('API key is invalid');
      }
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        console.log('Rate limited, retrying...');
        await sleep(RETRY_DELAY);
        return getSummary(text, retryCount + 1);
      }
      throw new Error(`API error: ${response.status} - ${rawResponse}`);
    }

    let data;
    try {
      data = JSON.parse(rawResponse);
      console.log('Parsed Response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Parse Error:', e);
      throw new Error('Invalid response from API');
    }

    // Simplified validation
    if (!data?.choices?.[0]?.message?.content) {
      console.error('Invalid Response Structure:', data);
      throw new Error('Invalid response format');
    }

    const summary = data.choices[0].message.content.trim();
    console.log('Generated Summary:', summary);
    return summary;

  } catch (error) {
    console.error('Full Error:', error);
    if (retryCount < MAX_RETRIES && 
        (error.message.includes('Network error') || 
         error.message.includes('timed out'))) {
      console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY);
      return getSummary(text, retryCount + 1);
    }
    throw error;
  }
} 

setTimeout(() => {
  (adsbygoogle = window.adsbygoogle || []).push({});
}, 3000); // Delays ad loading to prevent script race conditions