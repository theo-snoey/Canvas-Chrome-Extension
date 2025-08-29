// Canvas LMS Assistant - Background Service Worker
// Handles extension lifecycle, tab management, and autonomous background tasks

console.log('Canvas Assistant background service worker loaded');

// Autonomous Background System Configuration
const AUTONOMOUS_CONFIG = {
  syncInterval: 5 * 60 * 1000, // 5 minutes in milliseconds
  maxRetries: 3,
  retryDelay: 30000, // 30 seconds base delay
  sessionCheckInterval: 60 * 1000, // Check session every minute
  dataCollectionTimeout: 120000, // 2 minutes per collection task
  queueMaxSize: 50 // Maximum queued tasks
};

// Tab Manager Class (inline to avoid import issues)
class TabManager {
  constructor() {
    this.activeTabs = new Map(); // tabId -> { tab, purpose, createdAt, lastUsed }
    this.tabQueue = []; // Queue for pending tab requests
    this.maxConcurrentTabs = 3; // Limit concurrent ghost tabs
    this.tabTimeout = 30000; // 30 second timeout for tab operations
    this.cleanupInterval = 60000; // Clean up old tabs every minute

    // Autonomous features for Phase 4.1
    this.dataCollectionQueue = []; // Queue for autonomous data collection tasks
    this.retryQueue = new Map(); // taskId -> { task, retries, nextRetryTime, lastError }
    this.sessionState = {
      isAuthenticated: false,
      lastCheck: null,
      canvasDomain: null,
      sessionId: null
    };
    this.autonomousEnabled = false;

    // Start cleanup process
    this.startCleanupProcess();

    // Start autonomous processes
    this.initializeAutonomousSystem();
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

    // Start retry queue processor for autonomous system
    setInterval(() => {
      if (this.autonomousEnabled) {
        this.processRetryQueue();
      }
    }, 10000); // Check retry queue every 10 seconds
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

  // ============ AUTONOMOUS SYSTEM METHODS (Phase 4.1) ============

  /**
   * Initialize the autonomous background system
   */
  initializeAutonomousSystem() {
    console.log('Initializing autonomous background system...');

    // Start session monitoring
    this.startSessionMonitoring();

    // Set up autonomous sync alarms
    this.setupAutonomousAlarms();

    // Enable autonomous mode
    this.autonomousEnabled = true;

    console.log('Autonomous background system initialized');
  }

  /**
   * Set up Chrome alarms for autonomous sync
   */
  setupAutonomousAlarms() {
    // Clear any existing alarms
    chrome.alarms.clearAll();

    // Create main sync alarm (5-minute intervals)
    chrome.alarms.create('canvas-autonomous-sync', {
      delayInMinutes: 1, // Start after 1 minute
      periodInMinutes: 5 // Repeat every 5 minutes
    });

    // Create session check alarm (every minute)
    chrome.alarms.create('canvas-session-check', {
      delayInMinutes: 0.5, // Start after 30 seconds
      periodInMinutes: 1 // Repeat every minute
    });

    console.log('Autonomous alarms set up: sync (5min) and session check (1min)');
  }

  /**
   * Start session monitoring system
   */
  startSessionMonitoring() {
    // Check session immediately
    this.checkCanvasSession();

    // Set up periodic session checks
    setInterval(() => {
      this.checkCanvasSession();
    }, AUTONOMOUS_CONFIG.sessionCheckInterval);
  }

  /**
   * Check Canvas authentication status
   */
  async checkCanvasSession() {
    try {
      // Try to access a Canvas page to check authentication
      const canvasUrls = [
        'https://canvas.instructure.com/',
        'https://*.canvas.com/',
        'https://*.instructure.com/'
      ];

      // Create a temporary tab to check session
      const sessionCheckTab = await this.createGhostTab(canvasUrls[0], 'session-check');

      // Execute session check script
      const sessionResult = await this.executeInTab(sessionCheckTab, () => {
        // Check for authentication indicators
        const loginForm = document.querySelector('form[action*="login"]');
        const logoutLink = document.querySelector('a[href*="logout"], a[href*="sign_out"]');
        const userMenu = document.querySelector('[data-user-id], .user-info, .ic-user-info');

        return {
          isAuthenticated: !loginForm && (logoutLink || userMenu),
          hasLoginForm: !!loginForm,
          hasUserMenu: !!userMenu,
          currentUrl: window.location.href
        };
      });

      // Update session state
      const wasAuthenticated = this.sessionState.isAuthenticated;
      this.sessionState.isAuthenticated = sessionResult.isAuthenticated;
      this.sessionState.lastCheck = new Date().toISOString();

      if (!sessionResult.isAuthenticated) {
        this.sessionState.canvasDomain = null;
        this.sessionState.sessionId = null;
      } else {
        // Extract domain from URL
        const url = new URL(sessionResult.currentUrl);
        this.sessionState.canvasDomain = url.hostname;
      }

      // Notify if authentication status changed
      if (wasAuthenticated !== sessionResult.isAuthenticated) {
        this.handleAuthenticationChange(sessionResult.isAuthenticated);
      }

      // Clean up session check tab
      await this.closeGhostTab(sessionCheckTab);

      console.log('Session check completed:', {
        isAuthenticated: sessionResult.isAuthenticated,
        domain: this.sessionState.canvasDomain
      });

    } catch (error) {
      console.error('Session check failed:', error);
      this.sessionState.isAuthenticated = false;
      this.sessionState.lastCheck = new Date().toISOString();
    }
  }

  /**
   * Handle authentication status changes
   */
  handleAuthenticationChange(isAuthenticated) {
    if (isAuthenticated) {
      console.log('User authenticated to Canvas - enabling autonomous sync');

      // Clear retry queue on successful authentication
      this.retryQueue.clear();

      // Trigger immediate data collection
      this.triggerAutonomousSync();

      // Notify user
      this.notifyUser('Canvas session detected - autonomous sync enabled');

    } else {
      console.log('Canvas authentication lost - pausing autonomous sync');

      // Pause autonomous operations
      this.pauseAutonomousOperations();

      // Notify user to re-authenticate
      this.notifyUser('Canvas session expired - please log in to continue autonomous sync', 'warning');
    }
  }

  /**
   * Add task to data collection queue
   */
  queueDataCollectionTask(task) {
    if (this.dataCollectionQueue.length >= AUTONOMOUS_CONFIG.queueMaxSize) {
      console.warn('Data collection queue full, dropping task');
      return false;
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedTask = {
      id: taskId,
      ...task,
      queuedAt: new Date().toISOString(),
      status: 'queued',
      retries: 0
    };

    this.dataCollectionQueue.push(queuedTask);
    console.log(`Queued data collection task: ${taskId} (${task.type})`);

    // Process queue
    this.processDataCollectionQueue();

    return taskId;
  }

  /**
   * Process data collection queue
   */
  async processDataCollectionQueue() {
    if (!this.sessionState.isAuthenticated || this.activeTabs.size >= this.maxConcurrentTabs) {
      return; // Wait for authentication or available tabs
    }

    const pendingTasks = this.dataCollectionQueue.filter(task => task.status === 'queued');

    for (const task of pendingTasks) {
      if (this.activeTabs.size >= this.maxConcurrentTabs) {
        break; // Wait for available tabs
      }

      try {
        await this.executeDataCollectionTask(task);
      } catch (error) {
        console.error(`Failed to execute task ${task.id}:`, error);
        this.handleTaskFailure(task, error);
      }
    }
  }

  /**
   * Execute a data collection task
   */
  async executeDataCollectionTask(task) {
    console.log(`Executing data collection task: ${task.id} (${task.type})`);

    // Update task status
    task.status = 'running';
    task.startedAt = new Date().toISOString();

    // Create ghost tab for the task
    const tabId = await this.createGhostTab(task.url, `autonomous-${task.type}`);

    try {
      // Execute the data extraction
      const result = await this.executeInTab(tabId, task.extractorFunction);

      // Process successful result
      await this.handleTaskSuccess(task, result);

    } finally {
      // Always clean up the tab
      await this.closeGhostTab(tabId);
    }
  }

  /**
   * Handle successful task execution
   */
  async handleTaskSuccess(task, result) {
    console.log(`Task ${task.id} completed successfully`);

    // Update task status
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;

    // Store result in chrome storage
    await this.storeTaskResult(task, result);

    // Remove from queue
    this.removeFromQueue(task.id);

    // Trigger next task processing
    this.processDataCollectionQueue();
  }

  /**
   * Handle task execution failure
   */
  handleTaskFailure(task, error) {
    console.error(`Task ${task.id} failed:`, error);

    task.lastError = error.message;
    task.retries = (task.retries || 0) + 1;

    if (task.retries < AUTONOMOUS_CONFIG.maxRetries) {
      // Schedule retry with exponential backoff
      const retryDelay = AUTONOMOUS_CONFIG.retryDelay * Math.pow(2, task.retries - 1);
      task.nextRetryTime = Date.now() + retryDelay;
      task.status = 'retry-scheduled';

      console.log(`Scheduling retry for task ${task.id} in ${retryDelay}ms (attempt ${task.retries}/${AUTONOMOUS_CONFIG.maxRetries})`);

      // Add to retry queue
      this.retryQueue.set(task.id, task);

    } else {
      // Max retries exceeded
      task.status = 'failed';
      console.error(`Task ${task.id} failed permanently after ${AUTONOMOUS_CONFIG.maxRetries} retries`);

      // Remove from queue
      this.removeFromQueue(task.id);
    }
  }

  /**
   * Remove task from queue
   */
  removeFromQueue(taskId) {
    this.dataCollectionQueue = this.dataCollectionQueue.filter(task => task.id !== taskId);
    this.retryQueue.delete(taskId);
  }

  /**
   * Process retry queue
   */
  processRetryQueue() {
    const now = Date.now();

    for (const [taskId, task] of this.retryQueue) {
      if (task.nextRetryTime && now >= task.nextRetryTime) {
        // Move task back to main queue for retry
        task.status = 'queued';
        task.nextRetryTime = null;

        this.dataCollectionQueue.push(task);
        this.retryQueue.delete(taskId);

        console.log(`Moving task ${taskId} back to queue for retry`);
      }
    }
  }

  /**
   * Trigger autonomous sync cycle
   */
  triggerAutonomousSync() {
    if (!this.sessionState.isAuthenticated) {
      console.log('Skipping autonomous sync - not authenticated');
      return;
    }

    console.log('Triggering autonomous data collection sync...');

    // Generate sync tasks for current semester data
    const syncTasks = this.generateSyncTasks();

    // Queue the tasks
    for (const task of syncTasks) {
      this.queueDataCollectionTask(task);
    }

    console.log(`Queued ${syncTasks.length} autonomous sync tasks`);
  }

  /**
   * Generate autonomous sync tasks
   */
  generateSyncTasks() {
    const tasks = [];

    // Only generate tasks if we have a canvas domain
    if (!this.sessionState.canvasDomain) {
      return tasks;
    }

    const baseUrl = `https://${this.sessionState.canvasDomain}`;

    // Dashboard data task
    tasks.push({
      type: 'dashboard',
      url: `${baseUrl}/`,
      extractorFunction: () => {
        // This would call the existing data extractor
        if (window.CanvasDataExtractor) {
          return window.CanvasDataExtractor.extractCurrentPage();
        }
        return { type: 'dashboard', error: 'DataExtractor not available' };
      }
    });

    // Courses data task
    tasks.push({
      type: 'courses-list',
      url: `${baseUrl}/courses`,
      extractorFunction: () => {
        if (window.CanvasDataExtractor) {
          return window.CanvasDataExtractor.extractCurrentPage();
        }
        return { type: 'courses', error: 'DataExtractor not available' };
      }
    });

    return tasks;
  }

  /**
   * Store task result in chrome storage
   */
  async storeTaskResult(task, result) {
    try {
      const storageKey = `autonomous_data_${task.type}`;
      const storageData = {
        [storageKey]: {
          result,
          taskId: task.id,
          timestamp: new Date().toISOString(),
          dataType: task.type
        }
      };

      await chrome.storage.local.set(storageData);
      console.log(`Stored autonomous data for ${task.type}`);
    } catch (error) {
      console.error('Failed to store task result:', error);
    }
  }

  /**
   * Pause autonomous operations
   */
  pauseAutonomousOperations() {
    console.log('Pausing autonomous operations...');
    this.autonomousEnabled = false;

    // Clear any pending tasks
    this.dataCollectionQueue = [];
    this.retryQueue.clear();
  }

  /**
   * Resume autonomous operations
   */
  resumeAutonomousOperations() {
    console.log('Resuming autonomous operations...');
    this.autonomousEnabled = true;

    // Trigger immediate sync
    this.triggerAutonomousSync();
  }

  /**
   * Notify user (could be extended to show notifications)
   */
  notifyUser(message, type = 'info') {
    console.log(`User notification (${type}): ${message}`);

    // For now, just log. Could be extended to show browser notifications
    // or update popup state to show messages
  }

  /**
   * Get autonomous system statistics
   */
  getAutonomousStats() {
    return {
      autonomousEnabled: this.autonomousEnabled,
      sessionState: { ...this.sessionState },
      dataCollectionQueueLength: this.dataCollectionQueue.length,
      retryQueueLength: this.retryQueue.size,
      activeTabs: this.activeTabs.size,
      config: AUTONOMOUS_CONFIG
    };
  }
}

// Create tab manager instance
const tabManager = new TabManager();

console.log('Tab Manager initialized:', tabManager.getStats());

// Global state
let currentPageInfo = null;
let activeCanvasTabs = new Set();

// Handle extension startup (moved to bottom with autonomous system)

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

    case 'DATA_EXTRACTED':
      handleDataExtracted(request.data, sender);
      sendResponse({ success: true });
      break;

    case 'GET_EXTRACTED_DATA':
      sendResponse({ success: true, data: getLastExtractedData() });
      break;

    // ============ AUTONOMOUS SYSTEM MESSAGE HANDLERS ============

    case 'GET_AUTONOMOUS_STATS':
      sendResponse({
        success: true,
        stats: tabManager.getAutonomousStats()
      });
      break;

    case 'TRIGGER_AUTONOMOUS_SYNC':
      tabManager.triggerAutonomousSync();
      sendResponse({ success: true });
      break;

    case 'PAUSE_AUTONOMOUS':
      tabManager.pauseAutonomousOperations();
      sendResponse({ success: true });
      break;

    case 'RESUME_AUTONOMOUS':
      tabManager.resumeAutonomousOperations();
      sendResponse({ success: true });
      break;

    case 'CHECK_CANVAS_SESSION':
      tabManager.checkCanvasSession().then(result => {
        sendResponse({ success: true, sessionState: tabManager.sessionState });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'QUEUE_DATA_COLLECTION_TASK':
      const taskId = tabManager.queueDataCollectionTask(request.data.task);
      sendResponse({ success: true, taskId });
      break;

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

// ============ AUTONOMOUS SYSTEM ALARM HANDLERS ============

/**
 * Handle Chrome alarms for autonomous operations
 */
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name);

  switch (alarm.name) {
    case 'canvas-autonomous-sync':
      console.log('5-minute autonomous sync alarm triggered');
      if (tabManager.autonomousEnabled) {
        tabManager.triggerAutonomousSync();
      }
      break;

    case 'canvas-session-check':
      console.log('Session check alarm triggered');
      if (tabManager.autonomousEnabled) {
        tabManager.checkCanvasSession();
      }
      break;

    default:
      console.log('Unknown alarm:', alarm.name);
  }
});

/**
 * Handle autonomous system initialization on extension startup
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('Canvas Assistant extension started - initializing autonomous system');

  // Re-initialize autonomous system on startup
  if (tabManager && typeof tabManager.initializeAutonomousSystem === 'function') {
    tabManager.initializeAutonomousSystem();
  }
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Canvas Assistant extension installed:', details.reason);

  // Initialize storage
  initializeStorage();

  // Initialize autonomous system
  if (tabManager && typeof tabManager.initializeAutonomousSystem === 'function') {
    tabManager.initializeAutonomousSystem();
  }

  // Set up initial alarms if this is a fresh install
  if (details.reason === 'install') {
    console.log('Fresh install - setting up autonomous alarms');
    if (tabManager && typeof tabManager.setupAutonomousAlarms === 'function') {
      tabManager.setupAutonomousAlarms();
    }
  }
});

// Global data storage
let lastExtractedData = null;

/**
 * Handle data extraction from content script - Enhanced for Phase 3.3
 */
function handleDataExtracted(extractedData, sender) {
  console.log('Data extracted from Canvas page:', extractedData);
  lastExtractedData = extractedData;
  
  // Enhanced storage with processing metadata
  const storageData = {
    lastExtractedData: extractedData,
    lastExtractionTime: new Date().toISOString(),
    processingVersion: extractedData.metadata?.processingVersion || '1.0.0',
    dataQuality: extractedData.metadata?.dataQuality || 0,
    pageType: extractedData.type || 'unknown'
  };
  
  // Store in chrome.storage for persistence
  chrome.storage.local.set(storageData);

  // Log data quality metrics
  if (extractedData.metadata?.dataQuality) {
    console.log(`Data quality score: ${extractedData.metadata.dataQuality}%`);
  }

  // Log cache and processing stats
  if (extractedData.summary) {
    console.log('Data summary:', extractedData.summary);
  }

  // Notify popup if it's open
  chrome.runtime.sendMessage({
    action: 'DATA_EXTRACTION_COMPLETED',
    data: extractedData,
    quality: extractedData.metadata?.dataQuality || 0
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}

/**
 * Get the last extracted data
 */
function getLastExtractedData() {
  return lastExtractedData;
}

console.log('Canvas Assistant background service worker fully initialized');
