// Load current API key when options page opens
document.addEventListener('DOMContentLoaded', async () => {
  const { API_KEY } = await chrome.storage.local.get('API_KEY');
  if (API_KEY) {
    document.getElementById('apiKey').value = API_KEY;
  }
});

document.getElementById('save').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  if (!apiKey) {
    alert('Please enter an API key');
    return;
  }
  chrome.storage.local.set({ API_KEY: apiKey }, () => {
    alert('API key saved!');
  });
}); 