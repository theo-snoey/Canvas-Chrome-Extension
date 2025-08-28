// Canvas LMS Assistant - Content Script
// Runs on Canvas pages to detect LMS presence and provide page-level functionality

import { canvasDetector } from './canvas-detector.js';

console.log('Canvas Assistant content script loaded');

// Global state
let currentPageInfo = null;
let isInitialized = false;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeContentScript);

// Also initialize on navigation changes (for SPAs)
window.addEventListener('popstate', () => {
  setTimeout(initializeContentScript, 500);
});

// Handle dynamic content loading
const observer = new MutationObserver((mutations) => {
  if (!isInitialized) {
    initializeContentScript();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

/**
 * Initialize the content script on Canvas pages
 */
async function initializeContentScript() {
  try {
    // Prevent multiple initializations
    if (isInitialized) return;

    // Check if this is a Canvas page
    if (!canvasDetector.isCanvasPage()) {
      console.log('Not a Canvas page, content script inactive');
      return;
    }

    console.log('Canvas page detected! Initializing...');
    isInitialized = true;

    // Analyze the current page
    currentPageInfo = canvasDetector.analyzePage();

    console.log('Page analysis:', currentPageInfo);

    // Send page information to background script
    await sendPageInfoToBackground(currentPageInfo);

    // Initialize page-specific features
    await initializePageFeatures(currentPageInfo);

    // Set up periodic updates for dynamic content
    setInterval(updatePageInfo, 5000);

  } catch (error) {
    console.error('Error initializing content script:', error);
  }
}

/**
 * Send page information to background script
 */
async function sendPageInfoToBackground(pageInfo) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'PAGE_DETECTED',
      data: pageInfo
    });

    console.log('Page info sent to background:', response);
  } catch (error) {
    console.error('Error sending page info to background:', error);
  }
}

/**
 * Initialize page-specific features based on page type
 */
async function initializePageFeatures(pageInfo) {
  const { pageType } = pageInfo.detection;

  console.log(`Initializing features for page type: ${pageType}`);

  switch (pageType) {
    case 'dashboard':
      await initializeDashboardFeatures();
      break;
    case 'course':
      await initializeCourseFeatures();
      break;
    case 'assignment':
      await initializeAssignmentFeatures();
      break;
    case 'grades':
      await initializeGradesFeatures();
      break;
    default:
      console.log(`No specific features for page type: ${pageType}`);
  }

  // Inject floating chat button for all Canvas pages
  injectChatInterface();
}

/**
 * Initialize dashboard-specific features
 */
async function initializeDashboardFeatures() {
  console.log('Dashboard features initialized');
  // TODO: Add dashboard-specific functionality in future phases
}

/**
 * Initialize course page features
 */
async function initializeCourseFeatures() {
  console.log('Course page features initialized');
  // TODO: Add course-specific functionality in future phases
}

/**
 * Initialize assignment page features
 */
async function initializeAssignmentFeatures() {
  console.log('Assignment page features initialized');
  // TODO: Add assignment-specific functionality in future phases
}

/**
 * Initialize grades page features
 */
async function initializeGradesFeatures() {
  console.log('Grades page features initialized');
  // TODO: Add grades-specific functionality in future phases
}

/**
 * Inject floating chat interface
 */
function injectChatInterface() {
  // Check if chat interface already exists
  if (document.getElementById('canvas-assistant-chat')) {
    return;
  }

  // Create floating chat button
  const chatButton = document.createElement('div');
  chatButton.id = 'canvas-assistant-chat';
  chatButton.innerHTML = `
    <div class="chat-button">
      <span class="chat-icon">💬</span>
      <span class="chat-text">Canvas Assistant</span>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #canvas-assistant-chat {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .chat-button {
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      border: none;
      font-size: 14px;
      font-weight: 500;
    }

    .chat-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .chat-icon {
      font-size: 18px;
      margin-right: 8px;
    }

    .chat-text {
      white-space: nowrap;
    }

    /* Hide on mobile screens */
    @media (max-width: 768px) {
      .chat-text {
        display: none;
      }
      .chat-button {
        padding: 12px;
      }
    }
  `;

  // Add event listener
  chatButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'OPEN_POPUP'
    });
  });

  // Inject into page
  document.body.appendChild(style);
  document.body.appendChild(chatButton);

  console.log('Chat interface injected');
}

/**
 * Update page information periodically
 */
async function updatePageInfo() {
  try {
    const updatedInfo = canvasDetector.analyzePage();

    // Check if page has changed
    if (JSON.stringify(updatedInfo) !== JSON.stringify(currentPageInfo)) {
      currentPageInfo = updatedInfo;
      console.log('Page updated:', currentPageInfo);

      // Send updated info to background
      await sendPageInfoToBackground(currentPageInfo);
    }
  } catch (error) {
    console.error('Error updating page info:', error);
  }
}

/**
 * Handle messages from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  switch (request.action) {
    case 'GET_PAGE_INFO':
      sendResponse(currentPageInfo);
      break;

    case 'REFRESH_PAGE_INFO':
      updatePageInfo().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Clean up when page unloads
 */
window.addEventListener('beforeunload', () => {
  observer.disconnect();
  isInitialized = false;
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeContentScript,
    canvasDetector
  };
}
