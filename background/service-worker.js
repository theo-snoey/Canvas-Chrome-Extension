// Canvas LMS Assistant - Background Service Worker
// Handles extension lifecycle, tab management, and background tasks

console.log('Canvas Assistant background service worker loaded');

// Global state
let currentPageInfo = null;
let activeCanvasTabs = new Set();

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Canvas Assistant extension installed');
  initializeStorage();
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Canvas Assistant extension started');
});

// Initialize storage
function initializeStorage() {
  chrome.storage.local.set({
    canvasPages: [],
    lastDetection: null,
    userPreferences: {
      autoDetect: true,
      showChatButton: true
    }
  });
}

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.action) {
    case 'PAGE_DETECTED':
      handlePageDetected(request.data, sender);
      sendResponse({ success: true });
      break;

    case 'GET_CURRENT_PAGE_INFO':
      sendResponse(currentPageInfo);
      break;

    case 'GET_CANVAS_TABS':
      sendResponse(Array.from(activeCanvasTabs));
      break;

    case 'OPEN_POPUP':
      openPopup();
      sendResponse({ success: true });
      break;

    case 'REFRESH_DETECTION':
      refreshDetection().then(result => {
        sendResponse(result);
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep message channel open

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * Handle page detection from content script
 */
function handlePageDetected(pageInfo, sender) {
  console.log('Canvas page detected:', pageInfo);

  // Update global state
  currentPageInfo = pageInfo;

  // Track active Canvas tabs
  if (sender.tab && sender.tab.id) {
    activeCanvasTabs.add(sender.tab.id);
  }

  // Store page info
  chrome.storage.local.set({
    lastDetection: pageInfo,
    lastDetectionTime: new Date().toISOString()
  });

  // Notify popup of page detection
  chrome.runtime.sendMessage({
    action: 'PAGE_INFO_UPDATED',
    data: pageInfo
  }).catch(() => {
    // Ignore errors if popup is not open
  });
}

/**
 * Open the extension popup
 */
function openPopup() {
  chrome.action.openPopup();
}

/**
 * Refresh Canvas detection across all tabs
 */
async function refreshDetection() {
  try {
    const tabs = await chrome.tabs.query({});
    let detectionCount = 0;

    for (const tab of tabs) {
      if (tab.url && (tab.url.includes('canvas') || tab.url.includes('instructure'))) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'REFRESH_PAGE_INFO'
          });
          detectionCount++;
        } catch (error) {
          // Tab might not have content script loaded yet
          console.log(`Could not refresh tab ${tab.id}:`, error.message);
        }
      }
    }

    return {
      success: true,
      refreshedTabs: detectionCount
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle tab updates
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if this is a Canvas page
    if (tab.url.includes('canvas') || tab.url.includes('instructure')) {
      activeCanvasTabs.add(tabId);
    } else {
      activeCanvasTabs.delete(tabId);
    }
  }
});

/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  activeCanvasTabs.delete(tabId);
});

/**
 * Handle browser action click
 */
chrome.action.onClicked.addListener((tab) => {
  // Check if current tab is Canvas
  if (tab.url && (tab.url.includes('canvas') || tab.url.includes('instructure'))) {
    // If Canvas tab, open popup
    chrome.action.openPopup();
  } else {
    // If not Canvas tab, show info
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff6b6b' });

    // Clear badge after 3 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
});

/**
 * Tab management functions (for future phases)
 */
const tabManager = {
  /**
   * Create a ghost tab for data extraction
   */
  createGhostTab: async (url) => {
    console.log('Creating ghost tab for:', url);

    try {
      const tab = await chrome.tabs.create({
        url: url,
        active: false, // Keep invisible
        pinned: false
      });

      console.log('Ghost tab created:', tab.id);
      return tab;
    } catch (error) {
      console.error('Error creating ghost tab:', error);
      throw error;
    }
  },

  /**
   * Extract data from a tab
   */
  extractData: async (tabId, extractor) => {
    console.log('Extracting data from tab:', tabId);

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: extractor
      });

      return results[0].result;
    } catch (error) {
      console.error('Error extracting data:', error);
      throw error;
    }
  },

  /**
   * Close a ghost tab
   */
  closeGhostTab: async (tabId) => {
    try {
      await chrome.tabs.remove(tabId);
      console.log('Ghost tab closed:', tabId);
    } catch (error) {
      console.error('Error closing ghost tab:', error);
    }
  }
};

// Export for use in other modules
export { tabManager };
