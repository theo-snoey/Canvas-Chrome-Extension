// Canvas LMS Assistant - Background Service Worker
// Handles extension lifecycle, tab management, and background tasks

console.log('Canvas Assistant background service worker loaded');

// Tab Manager Class (inline to avoid import issues)
class TabManager {
  constructor() {
    this.activeTabs = new Map(); // tabId -> { tab, purpose, createdAt, lastUsed }
    this.tabQueue = []; // Queue for pending tab requests
    this.maxConcurrentTabs = 3; // Limit concurrent ghost tabs
    this.tabTimeout = 30000; // 30 second timeout for tab operations
    this.cleanupInterval = 60000; // Clean up old tabs every minute

    // Start cleanup process
    this.startCleanupProcess();
  }

  /**
   * Create a ghost tab for data extraction
   */
  async createGhostTab(url, purpose = 'data-extraction') {
    console.log(`Creating ghost tab for: ${url} (purpose: ${purpose})`);

    // Check if we're at the concurrent tab limit
    if (this.activeTabs.size >= this.maxConcurrentTabs) {
      // Queue the request
      return new Promise((resolve, reject) => {
        this.tabQueue.push({
          url,
          purpose,
          resolve,
          reject,
          timestamp: Date.now()
        });
        console.log(`Queued tab request (queue length: ${this.tabQueue.length})`);
      });
    }

    try {
      const tab = await chrome.tabs.create({
        url: url,
        active: false, // Keep invisible
        pinned: false
      });

      // Track the tab
      const tabInfo = {
        tab: tab,
        purpose: purpose,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      this.activeTabs.set(tab.id, tabInfo);

      console.log(`Ghost tab created: ${tab.id} for ${purpose}`);

      // Set up tab monitoring
      this.setupTabMonitoring(tab.id);

      return tab.id;

    } catch (error) {
      console.error('Failed to create ghost tab:', error);
      throw new Error(`Tab creation failed: ${error.message}`);
    }
  }

  /**
   * Execute a function in a ghost tab and get results
   */
  async executeInTab(tabId, extractorFunction) {
    console.log(`Executing extractor in tab: ${tabId}`);

    try {
      // Update last used time
      if (this.activeTabs.has(tabId)) {
        this.activeTabs.get(tabId).lastUsed = Date.now();
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: extractorFunction
      });

      console.log(`Extractor executed successfully in tab: ${tabId}`);
      return results[0].result;

    } catch (error) {
      console.error(`Failed to execute in tab ${tabId}:`, error);

      // If execution fails, mark tab for cleanup
      if (this.activeTabs.has(tabId)) {
        this.activeTabs.get(tabId).errorCount = (this.activeTabs.get(tabId).errorCount || 0) + 1;
      }

      throw new Error(`Tab execution failed: ${error.message}`);
    }
  }

  /**
   * Navigate an existing ghost tab to a new URL
   */
  async navigateTab(tabId, url) {
    console.log(`Navigating tab ${tabId} to: ${url}`);

    if (!this.activeTabs.has(tabId)) {
      throw new Error(`Tab ${tabId} not found in active tabs`);
    }

    try {
      await chrome.tabs.update(tabId, { url: url });

      // Wait for navigation to complete
      await this.waitForTabLoad(tabId);

      // Update tracking info
      this.activeTabs.get(tabId).lastUsed = Date.now();

      console.log(`Tab ${tabId} navigated successfully`);

    } catch (error) {
      console.error(`Failed to navigate tab ${tabId}:`, error);
      throw new Error(`Tab navigation failed: ${error.message}`);
    }
  }

  /**
   * Wait for a tab to finish loading
   */
  async waitForTabLoad(tabId, timeout = this.tabTimeout) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkTabStatus = () => {
        chrome.tabs.get(tabId).then(tab => {
          if (tab.status === 'complete') {
            resolve();
          } else if (Date.now() - startTime > timeout) {
            reject(new Error(`Tab load timeout after ${timeout}ms`));
          } else {
            // Check again in 100ms
            setTimeout(checkTabStatus, 100);
          }
        }).catch(error => {
          reject(new Error(`Tab status check failed: ${error.message}`));
        });
      };

      checkTabStatus();
    });
  }

  /**
   * Close a ghost tab
   */
  async closeGhostTab(tabId) {
    console.log(`Closing ghost tab: ${tabId}`);

    if (!this.activeTabs.has(tabId)) {
      console.warn(`Tab ${tabId} not in active tabs, may already be closed`);
      return;
    }

    try {
      await chrome.tabs.remove(tabId);
      this.activeTabs.delete(tabId);

      console.log(`Ghost tab closed: ${tabId}`);

      // Process next queued request if any
      this.processTabQueue();

    } catch (error) {
      console.error(`Failed to close tab ${tabId}:`, error);

      // Remove from tracking even if close failed
      this.activeTabs.delete(tabId);
    }
  }

  /**
   * Process the next item in the tab queue
   */
  async processTabQueue() {
    if (this.tabQueue.length === 0 || this.activeTabs.size >= this.maxConcurrentTabs) {
      return;
    }

    const nextRequest = this.tabQueue.shift();
    const { url, purpose, resolve, reject } = nextRequest;

    // Check if request is too old (5 minutes)
    if (Date.now() - nextRequest.timestamp > 300000) {
      reject(new Error('Queued tab request timed out'));
      return;
    }

    try {
      const tabId = await this.createGhostTab(url, purpose);
      resolve(tabId);
    } catch (error) {
      reject(error);
    }
  }

  /**
   * Set up monitoring for a tab
   */
  setupTabMonitoring(tabId) {
    // Set up a timeout to auto-close the tab if not used
    setTimeout(() => {
      if (this.activeTabs.has(tabId)) {
        const tabInfo = this.activeTabs.get(tabId);
        const timeSinceLastUse = Date.now() - tabInfo.lastUsed;

        // Auto-close if not used for 2 minutes
        if (timeSinceLastUse > 120000) {
          console.log(`Auto-closing unused tab: ${tabId}`);
          this.closeGhostTab(tabId);
        }
      }
    }, 120000); // 2 minutes
  }

  /**
   * Start the cleanup process for old tabs
   */
  startCleanupProcess() {
    setInterval(() => {
      this.cleanupOldTabs();
    }, this.cleanupInterval);
  }

  /**
   * Clean up old or problematic tabs
   */
  async cleanupOldTabs() {
    const now = Date.now();
    const tabsToClose = [];

    for (const [tabId, tabInfo] of this.activeTabs) {
      const timeSinceCreation = now - tabInfo.createdAt;
      const timeSinceLastUse = now - tabInfo.lastUsed;
      const errorCount = tabInfo.errorCount || 0;

      // Close tabs that are:
      // - Older than 10 minutes
      // - Unused for 5 minutes
      // - Have 3+ errors
      if (timeSinceCreation > 600000 ||
          timeSinceLastUse > 300000 ||
          errorCount >= 3) {
        tabsToClose.push(tabId);
      }
    }

    // Close problematic tabs
    for (const tabId of tabsToClose) {
      console.log(`Cleaning up old/problematic tab: ${tabId}`);
      await this.closeGhostTab(tabId);
    }

    if (tabsToClose.length > 0) {
      console.log(`Cleaned up ${tabsToClose.length} tabs`);
    }
  }

  /**
   * Get statistics about tab usage
   */
  getStats() {
    return {
      activeTabs: this.activeTabs.size,
      queuedRequests: this.tabQueue.length,
      maxConcurrentTabs: this.maxConcurrentTabs,
      tabTimeout: this.tabTimeout
    };
  }

  /**
   * Force cleanup of all tabs (for debugging/emergency)
   */
  async forceCleanup() {
    console.log('Force cleaning up all tabs...');

    const tabIds = Array.from(this.activeTabs.keys());
    for (const tabId of tabIds) {
      await this.closeGhostTab(tabId);
    }

    this.tabQueue = [];
    console.log('Force cleanup complete');
  }
}

// Create tab manager instance
const tabManager = new TabManager();

console.log('Tab Manager initialized:', tabManager.getStats());

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

    case 'CREATE_GHOST_TAB':
      tabManager.createGhostTab(request.data.url, request.data.purpose || 'data-extraction')
        .then(tabId => {
          sendResponse({ success: true, tabId });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'EXECUTE_IN_TAB':
      tabManager.executeInTab(request.data.tabId, request.data.extractor)
        .then(result => {
          sendResponse({ success: true, result });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'NAVIGATE_TAB':
      tabManager.navigateTab(request.data.tabId, request.data.url)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'CLOSE_GHOST_TAB':
      tabManager.closeGhostTab(request.data.tabId)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'GET_TAB_STATS':
      sendResponse({
        success: true,
        stats: tabManager.getStats(),
        activeCanvasTabs: Array.from(activeCanvasTabs)
      });
      break;

    case 'FORCE_CLEANUP':
      tabManager.forceCleanup()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

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

console.log('Canvas Assistant background service worker fully initialized');
