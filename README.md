# Web Page Summarizer

A Chrome extension that summarizes web pages using AI.

## Features
- Summarizes any webpage in 6 bullet points
- Shows 3 points initially with option to see more
- Dark mode interface
- Side panel integration

## Installation
1. Clone this repository
   ```bash
   git clone https://github.com/MaxorPaxor/Summarize.git
   ```
2. Get an API key from [OpenRouter](https://openrouter.ai/keys)
3. Copy `config.template.js` to `config.js` and add your API key
4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Development
1. Create `config.js` from template:
   ```bash
   cp config.template.js config.js
   ```
2. Add your API key to `config.js`
3. Make your changes
4. Reload the extension in Chrome

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details 