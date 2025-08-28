# Canvas LMS Assistant

An AI-powered Chrome extension that provides a chat interface for Canvas LMS, helping students with coursework, grades, assignments, and more.

## 🚀 Features

- **Smart Chat Interface**: Natural language queries about your Canvas coursework
- **Grade Calculator**: Calculate required scores to achieve target grades
- **Assignment Tracker**: Get reminders and details about upcoming assignments
- **Course Overview**: Quick access to all your enrolled courses
- **Reading Assistant**: Summarize course materials and readings
- **AI-Powered**: Intelligent responses using advanced language models

## 🛠️ Development Setup

### Prerequisites
- Google Chrome browser
- Basic knowledge of JavaScript/HTML/CSS

### Installation for Development

1. **Clone or download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select this folder
5. **The extension should now appear** in your extensions list

### Hot Reload Development

For faster development, you can use Chrome's extension auto-reload:

1. Make changes to your code
2. Go to `chrome://extensions/`
3. Click the refresh button on the Canvas Assistant extension
4. Test your changes

## 📁 Project Structure

```
Canvas-chr-ext/
├── manifest.json          # Extension configuration
├── background/
│   ├── service-worker.js  # Background processes and tab management
│   └── tab-manager.js     # Ghost tab creation and management
├── content/
│   ├── content-script.js  # Canvas page detection and interaction
│   ├── canvas-detector.js # Detect Canvas LMS pages
│   └── dom-scraper.js     # Data extraction from DOM
├── popup/
│   ├── popup.html         # Extension popup interface
│   ├── popup.js           # Popup functionality
│   └── popup.css          # Popup styling
├── utils/
│   ├── storage.js         # Data storage utilities
│   ├── canvas-selectors.js # CSS selectors for Canvas elements
│   └── data-parser.js     # Data processing and normalization
└── test/
    ├── test-data/         # Test data files
    └── test-scripts/      # Testing utilities
```

## 🎯 Current Status

**Phase 1.1 - Project Setup**: ✅ Complete
- Directory structure created
- Git repository initialized
- Basic manifest.json configured
- Core files created with placeholders

**Next Steps**: Phase 1.2 - Canvas Detection System

## 🔧 Usage

1. **Install the extension** following the development setup above
2. **Navigate to your Canvas LMS** page and log in
3. **Click the extension icon** in Chrome toolbar
4. **Start chatting!** Ask questions like:
   - "What's my current grade in Math?"
   - "What assignments are due this week?"
   - "What grade do I need on the final to get an A?"

## 🤝 Contributing

This is a personal project for learning and experimentation. Feel free to fork and modify for your own use.

## 📝 License

This project is for educational purposes. Please respect Canvas LMS terms of service when using this extension.

## ⚠️ Disclaimer

This extension is not affiliated with Canvas LMS or Instructure. Use at your own risk and ensure compliance with your institution's policies.
