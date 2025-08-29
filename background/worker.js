// Canvas LMS Assistant - Background Service Worker
// Handles extension lifecycle, tab management, and autonomous background tasks

console.log('Canvas Assistant background service worker loaded');

// Import Storage Manager for Phase 4.4
// Note: Using importScripts for service worker compatibility
try {
  importScripts('storage-manager.js');
  console.log('📦 Storage Manager loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Storage Manager:', error);
}

// Import NLP Processor for Phase 5.2
try {
  importScripts('nlp-processor.js');
  console.log('🧠 NLP Processor loaded successfully');
} catch (error) {
  console.error('❌ Failed to load NLP Processor:', error);
}

// Debug: Log when the script is fully loaded
console.log('🚀 Background worker initialization starting...');

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
      sessionId: null,
      authenticationHistory: [],
      lastAuthenticationLoss: null,
      consecutiveFailures: 0,
      supportedDomains: [
        'canvas.instructure.com',
        '*.instructure.com',
        '*.canvas.com',
        '*.canvas.edu',
        '*.canvas.net',
        '*.canvas.org'
      ],
      userDomains: [] // User-configured domains
    };
    this.autonomousEnabled = false;

    // Initialize Storage Manager for Phase 4.4
    try {
      this.storageManager = new CanvasStorageManager();
      console.log('🗄️ Advanced Storage Manager initialized');
    } catch (error) {
      console.error('❌ Storage Manager initialization failed:', error);
      this.storageManager = null;
    }

    // Initialize NLP Processor for Phase 5.2
    try {
      this.nlpProcessor = new CanvasNLPProcessor();
      console.log('🧠 Natural Language Processor initialized');
    } catch (error) {
      console.error('❌ NLP Processor initialization failed:', error);
      this.nlpProcessor = null;
    }

    // Start cleanup process
    this.startCleanupProcess();

    // Start autonomous processes
    this.initializeAutonomousSystem();

    // Load user domain configuration
    this.loadUserDomainConfiguration();
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
   * Enhanced Canvas authentication status check (Phase 4.3)
   */
  async checkCanvasSession() {
    const checkStartTime = Date.now();
    console.log('🔍 Starting enhanced session check...');

    try {
      // Get potential Canvas domains to check
      const domainsToCheck = await this.getCanvasDomainsToCheck();
      let authenticationFound = false;
      let authenticatedDomain = null;
      let sessionDetails = null;

      // Check each potential Canvas domain
      for (const domain of domainsToCheck) {
        try {
          console.log(`🔐 Checking authentication on: ${domain}`);
          
          const sessionCheckTab = await this.createGhostTab(`https://${domain}/`, 'session-check');
          
          // Enhanced session check with more authentication indicators
          const sessionResult = await this.executeInTab(sessionCheckTab, () => {
            // Multiple authentication indicators
            const loginForm = document.querySelector('form[action*="login"], #login_form, .login-form');
            const logoutLink = document.querySelector('a[href*="logout"], a[href*="sign_out"], .logout');
            const userMenu = document.querySelector('[data-user-id], .user-info, .ic-user-info, .ic-avatar, .user_name');
            const dashboardElements = document.querySelector('.ic-Dashboard, .dashboard, .course-list');
            const canvasHeader = document.querySelector('.ic-app-header, .canvas-header, #header');
            
            // Check for Canvas-specific elements
            const isCanvasPage = document.querySelector('[data-brand-config], .ic-app, .canvas') || 
                                document.title.toLowerCase().includes('canvas') ||
                                window.location.href.includes('canvas') ||
                                window.location.href.includes('instructure');

            // Determine authentication status
            const isAuthenticated = isCanvasPage && !loginForm && 
                                  (logoutLink || userMenu || dashboardElements);

            return {
              isAuthenticated,
              isCanvasPage,
              hasLoginForm: !!loginForm,
              hasLogoutLink: !!logoutLink,
              hasUserMenu: !!userMenu,
              hasDashboard: !!dashboardElements,
              hasCanvasHeader: !!canvasHeader,
              currentUrl: window.location.href,
              pageTitle: document.title,
              domain: window.location.hostname
            };
          });

          await this.closeGhostTab(sessionCheckTab);

          if (sessionResult.isAuthenticated) {
            authenticationFound = true;
            authenticatedDomain = sessionResult.domain;
            sessionDetails = sessionResult;
            console.log(`✅ Authentication found on: ${authenticatedDomain}`);
            break; // Found authentication, stop checking other domains
          }

        } catch (error) {
          console.error(`❌ Failed to check ${domain}:`, error.message);
          continue; // Try next domain
        }
      }

      // Update session state with enhanced tracking
      const wasAuthenticated = this.sessionState.isAuthenticated;
      const previousDomain = this.sessionState.canvasDomain;
      
      this.sessionState.isAuthenticated = authenticationFound;
      this.sessionState.lastCheck = new Date().toISOString();
      this.sessionState.canvasDomain = authenticatedDomain;

      // Track authentication history
      this.updateAuthenticationHistory(authenticationFound, authenticatedDomain, sessionDetails);

      // Handle authentication status changes
      if (wasAuthenticated !== authenticationFound) {
        await this.handleAuthenticationChange(authenticationFound, authenticatedDomain, previousDomain);
      }

      // Handle domain changes (user switched Canvas instances)
      if (authenticationFound && previousDomain && previousDomain !== authenticatedDomain) {
        console.log(`🔄 Canvas domain changed: ${previousDomain} → ${authenticatedDomain}`);
        await this.handleDomainChange(previousDomain, authenticatedDomain);
      }

      // Update failure tracking
      if (authenticationFound) {
        this.sessionState.consecutiveFailures = 0;
      } else {
        this.sessionState.consecutiveFailures++;
      }

      const checkDuration = Date.now() - checkStartTime;
      console.log(`🔍 Session check completed in ${checkDuration}ms:`, {
        isAuthenticated: authenticationFound,
        domain: authenticatedDomain,
        consecutiveFailures: this.sessionState.consecutiveFailures
      });

    } catch (error) {
      console.error('❌ Session check failed:', error);
      this.sessionState.isAuthenticated = false;
      this.sessionState.lastCheck = new Date().toISOString();
      this.sessionState.consecutiveFailures++;
      
      // If too many consecutive failures, suggest user action
      if (this.sessionState.consecutiveFailures >= 5) {
        this.notifyUser('Multiple session check failures - please check your Canvas access', 'error');
      }
    }
  }

  /**
   * Get list of Canvas domains to check for authentication
   */
  async getCanvasDomainsToCheck() {
    const domains = [];
    
    // Add user-configured domains first (highest priority)
    domains.push(...this.sessionState.userDomains);
    
    // Add last known domain if available
    if (this.sessionState.canvasDomain && !domains.includes(this.sessionState.canvasDomain)) {
      domains.push(this.sessionState.canvasDomain);
    }
    
    // Add domains from browser history/tabs
    const historyDomains = await this.getCanvasDomainsFromHistory();
    for (const domain of historyDomains) {
      if (!domains.includes(domain)) {
        domains.push(domain);
      }
    }
    
    // Add default domains as fallback
    const defaultDomains = [
      'canvas.instructure.com',
      'canvas.com'
    ];
    
    for (const domain of defaultDomains) {
      if (!domains.includes(domain)) {
        domains.push(domain);
      }
    }
    
    return domains.slice(0, 5); // Limit to 5 domains to avoid overwhelming
  }

  /**
   * Get Canvas domains from browser history and open tabs
   */
  async getCanvasDomainsFromHistory() {
    const domains = [];
    
    try {
      // Get domains from open tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && this.isCanvasUrl(tab.url)) {
          const domain = new URL(tab.url).hostname;
          if (!domains.includes(domain)) {
            domains.push(domain);
          }
        }
      }
      
      // Could extend to check browser history if needed
      // const history = await chrome.history.search({text: 'canvas', maxResults: 10});
      
    } catch (error) {
      console.error('Failed to get Canvas domains from history:', error);
    }
    
    return domains;
  }

  /**
   * Check if URL is a Canvas URL
   */
  isCanvasUrl(url) {
    if (!url) return false;
    
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('canvas') || 
           lowerUrl.includes('instructure') ||
           this.sessionState.supportedDomains.some(domain => {
             const pattern = domain.replace('*', '.*');
             return new RegExp(pattern).test(lowerUrl);
           });
  }

  /**
   * Update authentication history tracking
   */
  updateAuthenticationHistory(isAuthenticated, domain, sessionDetails) {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      isAuthenticated,
      domain,
      sessionDetails,
      checkDuration: Date.now() - this.lastCheckStartTime
    };
    
    this.sessionState.authenticationHistory.push(historyEntry);
    
    // Keep only last 50 entries
    if (this.sessionState.authenticationHistory.length > 50) {
      this.sessionState.authenticationHistory = this.sessionState.authenticationHistory.slice(-50);
    }
    
    // Update last authentication loss time
    if (!isAuthenticated && this.sessionState.isAuthenticated) {
      this.sessionState.lastAuthenticationLoss = new Date().toISOString();
    }
  }

  /**
   * Enhanced authentication status change handler (Phase 4.3)
   */
  async handleAuthenticationChange(isAuthenticated, authenticatedDomain, previousDomain) {
    const timestamp = new Date().toISOString();
    
    if (isAuthenticated) {
      console.log(`✅ User authenticated to Canvas on ${authenticatedDomain} - enabling autonomous sync`);

      // Clear retry queue and reset failure count on successful authentication
      this.retryQueue.clear();
      this.sessionState.consecutiveFailures = 0;

      // Store authentication success
      await this.storeAuthenticationEvent('authenticated', authenticatedDomain);

      // Trigger immediate comprehensive data collection
      this.triggerAutonomousSync();

      // Show success notification with domain info
      this.showAuthenticationNotification('success', authenticatedDomain);

      // Resume autonomous operations if they were paused
      this.resumeAutonomousOperations();

    } else {
      console.log('❌ Canvas authentication lost - pausing autonomous sync');

      // Store authentication loss
      await this.storeAuthenticationEvent('authentication_lost', previousDomain);

      // Pause autonomous operations
      this.pauseAutonomousOperations();

      // Show re-authentication prompt based on failure count
      await this.showReAuthenticationPrompt();
    }
  }

  /**
   * Handle Canvas domain changes (user switched Canvas instances)
   */
  async handleDomainChange(previousDomain, newDomain) {
    console.log(`🔄 Canvas domain changed: ${previousDomain} → ${newDomain}`);
    
    // Store domain change event
    await this.storeAuthenticationEvent('domain_changed', newDomain, { previousDomain });
    
    // Clear data from previous domain if user wants
    const shouldClearData = await this.shouldClearPreviousDomainData(previousDomain, newDomain);
    if (shouldClearData) {
      await this.clearDomainSpecificData(previousDomain);
    }
    
    // Add new domain to user domains if not already present
    if (!this.sessionState.userDomains.includes(newDomain)) {
      this.sessionState.userDomains.push(newDomain);
      await this.saveUserDomainConfiguration();
    }
    
    // Trigger immediate sync for new domain
    this.triggerAutonomousSync();
    
    this.notifyUser(`Switched to Canvas instance: ${newDomain}`, 'info');
  }

  /**
   * Show user-friendly re-authentication prompts
   */
  async showReAuthenticationPrompt() {
    const failureCount = this.sessionState.consecutiveFailures;
    const lastAuthLoss = this.sessionState.lastAuthenticationLoss;
    const timeSinceLastAuth = lastAuthLoss ? Date.now() - new Date(lastAuthLoss).getTime() : 0;
    
    let message = 'Canvas session expired - please log in to continue autonomous sync';
    let urgency = 'warning';
    
    // Escalate message based on failure count and time
    if (failureCount >= 3) {
      message = 'Multiple authentication failures detected - please check your Canvas login';
      urgency = 'error';
    } else if (timeSinceLastAuth > 3600000) { // 1 hour
      message = 'Canvas session has been expired for over an hour - please log in';
      urgency = 'error';
    }
    
    // Show notification
    this.showAuthenticationNotification('re_auth_needed', null, message);
    
    // Create re-authentication helper if failures persist
    if (failureCount >= 5) {
      await this.createReAuthenticationHelper();
    }
  }

  /**
   * Show authentication notifications with different types
   */
  showAuthenticationNotification(type, domain, customMessage) {
    let title = 'Canvas Assistant';
    let message = customMessage;
    let icon = 'info';
    
    switch (type) {
      case 'success':
        title = '✅ Canvas Connected';
        message = message || `Successfully connected to ${domain}`;
        icon = 'success';
        break;
        
      case 're_auth_needed':
        title = '🔐 Authentication Required';
        message = message || 'Please log in to Canvas to continue autonomous sync';
        icon = 'warning';
        break;
        
      case 'domain_changed':
        title = '🔄 Canvas Instance Changed';
        message = message || `Now using ${domain}`;
        icon = 'info';
        break;
        
      case 'multiple_failures':
        title = '❌ Authentication Issues';
        message = message || 'Multiple Canvas authentication failures detected';
        icon = 'error';
        break;
    }
    
    // Log notification (could be extended to show browser notifications)
    console.log(`🔔 ${title}: ${message}`);
    this.notifyUser(message, icon);
    
    // Store notification for history
    this.storeNotificationHistory(type, title, message, domain);
  }

  /**
   * Create re-authentication helper for persistent failures
   */
  async createReAuthenticationHelper() {
    console.log('🆘 Creating re-authentication helper due to persistent failures');
    
    // Could create a special popup or notification to guide user
    // For now, just provide detailed logging
    const knownDomains = this.sessionState.userDomains.length > 0 
      ? this.sessionState.userDomains 
      : ['canvas.instructure.com'];
    
    console.log('🔧 Re-authentication help:');
    console.log('   1. Try logging into one of these Canvas domains:');
    knownDomains.forEach(domain => {
      console.log(`      - https://${domain}/`);
    });
    console.log('   2. Make sure cookies are enabled');
    console.log('   3. Try refreshing your Canvas page');
    console.log('   4. Check if your school uses a different Canvas domain');
    
    this.notifyUser('Authentication helper created - check console for guidance', 'info');
  }

  /**
   * Store authentication events for tracking
   */
  async storeAuthenticationEvent(eventType, domain, metadata = {}) {
    try {
      const event = {
        type: eventType,
        domain,
        timestamp: new Date().toISOString(),
        metadata
      };
      
      const storageKey = 'canvas_auth_events';
      const existing = await chrome.storage.local.get(storageKey);
      const events = existing[storageKey] || [];
      
      events.push(event);
      
      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      await chrome.storage.local.set({ [storageKey]: events });
      console.log(`📝 Stored authentication event: ${eventType} on ${domain}`);
      
    } catch (error) {
      console.error('Failed to store authentication event:', error);
    }
  }

  /**
   * Store notification history
   */
  storeNotificationHistory(type, title, message, domain) {
    // Add to a simple in-memory history (could be persisted if needed)
    if (!this.notificationHistory) {
      this.notificationHistory = [];
    }
    
    this.notificationHistory.push({
      type,
      title,
      message,
      domain,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 notifications
    if (this.notificationHistory.length > 50) {
      this.notificationHistory = this.notificationHistory.slice(-50);
    }
  }

  /**
   * Check if should clear data from previous domain
   */
  async shouldClearPreviousDomainData(previousDomain, newDomain) {
    // For now, don't automatically clear data
    // Could be extended to ask user or have configurable behavior
    return false;
  }

  /**
   * Clear domain-specific data
   */
  async clearDomainSpecificData(domain) {
    try {
      const allData = await chrome.storage.local.get();
      const keysToRemove = [];
      
      for (const key of Object.keys(allData)) {
        if (key.includes(domain) || 
            (allData[key] && allData[key].domain === domain)) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`🧹 Cleared ${keysToRemove.length} data entries for domain: ${domain}`);
      }
      
    } catch (error) {
      console.error('Failed to clear domain-specific data:', error);
    }
  }

  /**
   * Save user domain configuration
   */
  async saveUserDomainConfiguration() {
    try {
      await chrome.storage.local.set({
        canvas_user_domains: this.sessionState.userDomains,
        canvas_domain_config_updated: new Date().toISOString()
      });
      console.log('💾 Saved user domain configuration:', this.sessionState.userDomains);
    } catch (error) {
      console.error('Failed to save user domain configuration:', error);
    }
  }

  /**
   * Get Canvas data for NLP processing (Phase 5.2)
   */
  async getCanvasDataForNLP() {
    try {
      console.log('📊 Gathering Canvas data for NLP processing...');
      
      // Get all autonomous data
      const allData = await chrome.storage.local.get();
      const canvasData = {
        courses: [],
        assignments: [],
        grades: [],
        announcements: [],
        discussions: [],
        calendar: [],
        todo: [],
        lastUpdated: null,
        dataQuality: 0
      };

      // Process autonomous data
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('autonomous_data_')) {
          const dataType = key.split('_')[2]; // Extract type from key
          
          if (value && value.result) {
            switch (dataType) {
              case 'dashboard':
                if (value.result.courses) {
                  canvasData.courses.push(...value.result.courses);
                }
                break;
              case 'courses':
                if (value.result.courses) {
                  canvasData.courses.push(...value.result.courses);
                }
                break;
              case 'assignments':
                if (value.result.assignments) {
                  canvasData.assignments.push(...value.result.assignments);
                }
                break;
              case 'grades':
                if (value.result.grades) {
                  canvasData.grades.push(...value.result.grades);
                }
                break;
              case 'announcements':
                if (value.result.announcements) {
                  canvasData.announcements.push(...value.result.announcements);
                }
                break;
              case 'discussions':
                if (value.result.discussions) {
                  canvasData.discussions.push(...value.result.discussions);
                }
                break;
              case 'calendar':
                if (value.result.events) {
                  canvasData.calendar.push(...value.result.events);
                }
                break;
              case 'todo':
                if (value.result.items) {
                  canvasData.todo.push(...value.result.items);
                }
                break;
            }
            
            // Track most recent update
            if (value.timestamp) {
              const updateTime = new Date(value.timestamp).getTime();
              if (!canvasData.lastUpdated || updateTime > new Date(canvasData.lastUpdated).getTime()) {
                canvasData.lastUpdated = value.timestamp;
              }
            }
            
            // Aggregate data quality
            if (value.dataQuality) {
              canvasData.dataQuality = Math.max(canvasData.dataQuality, value.dataQuality);
            }
          }
        }
      }

      // Remove duplicates from courses array
      canvasData.courses = canvasData.courses.filter((course, index, self) => 
        index === self.findIndex(c => c.id === course.id || c.name === course.name)
      );

      console.log(`📋 NLP Data Summary:`, {
        courses: canvasData.courses.length,
        assignments: canvasData.assignments.length,
        grades: canvasData.grades.length,
        announcements: canvasData.announcements.length,
        discussions: canvasData.discussions.length,
        calendar: canvasData.calendar.length,
        todo: canvasData.todo.length,
        lastUpdated: canvasData.lastUpdated,
        dataQuality: canvasData.dataQuality
      });

      return canvasData;

    } catch (error) {
      console.error('❌ Failed to gather Canvas data for NLP:', error);
      return {
        courses: [],
        assignments: [],
        grades: [],
        announcements: [],
        discussions: [],
        calendar: [],
        todo: [],
        lastUpdated: null,
        dataQuality: 0,
        error: error.message
      };
    }
  }

  /**
   * Load user domain configuration
   */
  async loadUserDomainConfiguration() {
    try {
      const result = await chrome.storage.local.get(['canvas_user_domains', 'canvas_domain_config_updated']);
      if (result.canvas_user_domains) {
        this.sessionState.userDomains = result.canvas_user_domains;
        console.log('📂 Loaded user domain configuration:', this.sessionState.userDomains);
      }
    } catch (error) {
      console.error('Failed to load user domain configuration:', error);
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
   * Process data collection queue with priority handling (Phase 4.2)
   */
  async processDataCollectionQueue() {
    if (!this.sessionState.isAuthenticated || this.activeTabs.size >= this.maxConcurrentTabs) {
      return; // Wait for authentication or available tabs
    }

    // Sort tasks by priority: high -> medium -> low
    const pendingTasks = this.dataCollectionQueue
      .filter(task => task.status === 'queued')
      .sort((a, b) => {
        const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      });

    console.log(`Processing ${pendingTasks.length} queued tasks (prioritized)`);

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
   * Generate comprehensive autonomous sync tasks for Phase 4.2
   */
  generateSyncTasks() {
    const tasks = [];

    // Only generate tasks if we have a canvas domain
    if (!this.sessionState.canvasDomain) {
      return tasks;
    }

    const baseUrl = `https://${this.sessionState.canvasDomain}`;

    // Phase 4.2: Comprehensive Semester Data Collection
    console.log('🎯 Generating comprehensive semester data collection tasks...');

    // 1. Dashboard - Get overview and enrolled courses
    tasks.push({
      type: 'dashboard',
      priority: 'high',
      url: `${baseUrl}/`,
      extractorFunction: () => {
        if (window.CanvasDataExtractor) {
          return window.CanvasDataExtractor.extractCurrentPage();
        }
        return { type: 'dashboard', error: 'DataExtractor not available' };
      }
    });

    // 2. Courses List - Get all available courses
    tasks.push({
      type: 'courses-list',
      priority: 'high',
      url: `${baseUrl}/courses`,
      extractorFunction: () => {
        if (window.CanvasDataExtractor) {
          return window.CanvasDataExtractor.extractCurrentPage();
        }
        return { type: 'courses', error: 'DataExtractor not available' };
      }
    });

    // 3. Get course IDs from storage for detailed scraping
    this.generateDetailedCourseTasks(tasks, baseUrl);

    // 4. Calendar - Get upcoming assignments and events
    tasks.push({
      type: 'calendar',
      priority: 'medium',
      url: `${baseUrl}/calendar`,
      extractorFunction: () => {
        return this.extractCalendarData();
      }
    });

    // 5. Grades - Overall grade summary
    tasks.push({
      type: 'grades-summary',
      priority: 'high',
      url: `${baseUrl}/grades`,
      extractorFunction: () => {
        return this.extractGradesSummary();
      }
    });

    // 6. To Do List - Current tasks
    tasks.push({
      type: 'todo',
      priority: 'high',
      url: `${baseUrl}/#todo`,
      extractorFunction: () => {
        return this.extractTodoList();
      }
    });

    console.log(`Generated ${tasks.length} comprehensive sync tasks`);
    return tasks;
  }

  /**
   * Generate detailed course-specific tasks
   */
  async generateDetailedCourseTasks(tasks, baseUrl) {
    try {
      // Get course IDs from previous dashboard extraction
      const storedData = await chrome.storage.local.get('autonomous_data_dashboard');
      const dashboardData = storedData.autonomous_data_dashboard;

      if (dashboardData && dashboardData.result && dashboardData.result.data && dashboardData.result.data.courses) {
        const courses = dashboardData.result.data.courses;
        console.log(`Found ${courses.length} courses for detailed scraping`);

        for (const course of courses.slice(0, 5)) { // Limit to 5 courses to avoid overwhelming
          const courseId = course.id || this.extractCourseIdFromUrl(course.url);
          
          if (courseId) {
            // Course home page
            tasks.push({
              type: 'course-home',
              priority: 'high',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}`,
              extractorFunction: () => {
                if (window.CanvasDataExtractor) {
                  return window.CanvasDataExtractor.extractCurrentPage();
                }
                return { type: 'course', error: 'DataExtractor not available' };
              }
            });

            // Course assignments
            tasks.push({
              type: 'course-assignments',
              priority: 'high',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}/assignments`,
              extractorFunction: () => {
                return this.extractAssignmentsData(courseId);
              }
            });

            // Course grades
            tasks.push({
              type: 'course-grades',
              priority: 'high',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}/grades`,
              extractorFunction: () => {
                return this.extractCourseGrades(courseId);
              }
            });

            // Course announcements
            tasks.push({
              type: 'course-announcements',
              priority: 'medium',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}/announcements`,
              extractorFunction: () => {
                return this.extractAnnouncementsData(courseId);
              }
            });

            // Course discussions
            tasks.push({
              type: 'course-discussions',
              priority: 'medium',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}/discussion_topics`,
              extractorFunction: () => {
                return this.extractDiscussionsData(courseId);
              }
            });

            // Course modules
            tasks.push({
              type: 'course-modules',
              priority: 'medium',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}/modules`,
              extractorFunction: () => {
                return this.extractModulesData(courseId);
              }
            });

            // Course syllabus
            tasks.push({
              type: 'course-syllabus',
              priority: 'low',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}/assignments/syllabus`,
              extractorFunction: () => {
                return this.extractSyllabusData(courseId);
              }
            });

            // Course files
            tasks.push({
              type: 'course-files',
              priority: 'low',
              courseId: courseId,
              courseName: course.name,
              url: `${baseUrl}/courses/${courseId}/files`,
              extractorFunction: () => {
                return this.extractFilesData(courseId);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error generating detailed course tasks:', error);
    }
  }

  /**
   * Extract course ID from Canvas URL
   */
  extractCourseIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/\/courses\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Store task result with smart data management (Phase 4.2)
   */
  async storeTaskResult(task, result) {
    try {
      const storageKey = `autonomous_data_${task.type}`;
      const courseKey = task.courseId ? `_${task.courseId}` : '';
      const fullKey = `${storageKey}${courseKey}`;
      
      // Get existing data for incremental updates
      const existingData = await chrome.storage.local.get(fullKey);
      const previousData = existingData[fullKey];
      
      // Calculate data quality score
      const dataQuality = this.calculateDataQuality(result, task.type);
      
      // Check if this is actually new/changed data
      const isNewData = this.isDataChanged(previousData?.result, result);
      
      // Use advanced storage manager if available (Phase 4.4)
      if (this.storageManager) {
        try {
          const storeResult = await this.storageManager.storeData(task.type, result, {
            id: task.courseId || 'default',
            version: (previousData?.version || 0) + 1,
            quality: dataQuality,
            source: 'autonomous',
            courseId: task.courseId,
            courseName: task.courseName,
            priority: task.priority
          });

          if (storeResult.success) {
            console.log(`🗄️ Advanced storage: ${task.type} (${storeResult.size} bytes, compressed: ${storeResult.compressed})`);
          }
        } catch (error) {
          console.warn('⚠️ Advanced storage failed, using fallback:', error.message);
        }
      }
      
      const storageData = {
        [fullKey]: {
          result,
          taskId: task.id,
          timestamp: new Date().toISOString(),
          dataType: task.type,
          courseId: task.courseId,
          courseName: task.courseName,
          priority: task.priority,
          dataQuality,
          isNewData,
          version: (previousData?.version || 0) + 1,
          lastChanged: isNewData ? new Date().toISOString() : previousData?.lastChanged,
          syncCount: (previousData?.syncCount || 0) + 1
        }
      };

      await chrome.storage.local.set(storageData);
      
      // Update comprehensive semester data index
      await this.updateSemesterDataIndex(task, result, dataQuality);
      
      console.log(`📊 Stored ${task.type} data (Quality: ${dataQuality}%, New: ${isNewData}, Version: ${storageData[fullKey].version})`);
      
      // Clean up old data if needed
      if (storageData[fullKey].version % 10 === 0) { // Every 10 versions
        await this.cleanupOldData(task.type);
      }
      
    } catch (error) {
      console.error('Failed to store task result:', error);
    }
  }

  /**
   * Calculate data quality score based on extracted data
   */
  calculateDataQuality(result, dataType) {
    if (!result || result.error) {
      return 0;
    }

    let score = 0;
    let maxScore = 0;

    switch (dataType) {
      case 'dashboard':
        maxScore = 100;
        if (result.data?.courses?.length > 0) score += 40;
        if (result.data?.announcements?.length > 0) score += 20;
        if (result.data?.upcomingAssignments?.length > 0) score += 20;
        if (result.title) score += 10;
        if (result.timestamp) score += 10;
        break;

      case 'course-home':
        maxScore = 100;
        if (result.data?.courseInfo?.name) score += 30;
        if (result.data?.instructor?.name) score += 20;
        if (result.data?.navigation?.length > 0) score += 25;
        if (result.data?.announcements) score += 15;
        if (result.data?.stats) score += 10;
        break;

      case 'course-assignments':
        maxScore = 100;
        if (result.assignments?.length > 0) score += 60;
        if (result.assignments?.some(a => a.dueDate)) score += 20;
        if (result.assignments?.some(a => a.points)) score += 20;
        break;

      case 'course-grades':
        maxScore = 100;
        if (result.grades?.length > 0) score += 70;
        if (result.grades?.some(g => g.percentage)) score += 30;
        break;

      default:
        maxScore = 100;
        if (result.count > 0) score += 50;
        if (result.extractedAt) score += 25;
        if (!result.error) score += 25;
    }

    return Math.min(Math.round((score / maxScore) * 100), 100);
  }

  /**
   * Check if data has actually changed (incremental updates)
   */
  isDataChanged(oldData, newData) {
    if (!oldData) return true; // First time data
    
    try {
      // Simple deep comparison for key fields
      const oldJson = JSON.stringify(this.normalizeDataForComparison(oldData));
      const newJson = JSON.stringify(this.normalizeDataForComparison(newData));
      return oldJson !== newJson;
    } catch (error) {
      return true; // Assume changed if comparison fails
    }
  }

  /**
   * Normalize data for comparison (remove timestamps, etc.)
   */
  normalizeDataForComparison(data) {
    if (!data) return null;
    
    const normalized = { ...data };
    
    // Remove timestamp fields that always change
    delete normalized.timestamp;
    delete normalized.extractedAt;
    delete normalized.lastSync;
    
    return normalized;
  }

  /**
   * Update comprehensive semester data index
   */
  async updateSemesterDataIndex(task, result, dataQuality) {
    try {
      const indexKey = 'autonomous_semester_index';
      const existingIndex = await chrome.storage.local.get(indexKey);
      const index = existingIndex[indexKey] || {
        lastUpdated: new Date().toISOString(),
        totalTasks: 0,
        completedTasks: 0,
        averageQuality: 0,
        dataTypes: {},
        courses: {},
        summary: {}
      };

      // Update task counts
      index.totalTasks++;
      index.completedTasks++;
      index.lastUpdated = new Date().toISOString();

      // Update data type tracking
      if (!index.dataTypes[task.type]) {
        index.dataTypes[task.type] = { count: 0, totalQuality: 0, averageQuality: 0 };
      }
      index.dataTypes[task.type].count++;
      index.dataTypes[task.type].totalQuality += dataQuality;
      index.dataTypes[task.type].averageQuality = Math.round(
        index.dataTypes[task.type].totalQuality / index.dataTypes[task.type].count
      );

      // Update course tracking
      if (task.courseId) {
        if (!index.courses[task.courseId]) {
          index.courses[task.courseId] = {
            name: task.courseName,
            dataTypes: {},
            totalQuality: 0,
            dataCount: 0
          };
        }
        const courseData = index.courses[task.courseId];
        courseData.dataTypes[task.type] = dataQuality;
        courseData.dataCount++;
        courseData.totalQuality = Math.round(
          Object.values(courseData.dataTypes).reduce((sum, q) => sum + q, 0) / courseData.dataCount
        );
      }

      // Update overall average quality
      const allQualities = Object.values(index.dataTypes).map(dt => dt.averageQuality);
      index.averageQuality = Math.round(
        allQualities.reduce((sum, q) => sum + q, 0) / allQualities.length
      );

      // Update summary
      index.summary = {
        coursesTracked: Object.keys(index.courses).length,
        dataTypesCollected: Object.keys(index.dataTypes).length,
        lastSyncQuality: dataQuality,
        totalDataPoints: index.completedTasks
      };

      await chrome.storage.local.set({ [indexKey]: index });
      console.log(`📈 Updated semester index: ${index.completedTasks} tasks, ${index.averageQuality}% avg quality`);

    } catch (error) {
      console.error('Failed to update semester data index:', error);
    }
  }

  /**
   * Clean up old data versions
   */
  async cleanupOldData(dataType) {
    try {
      console.log(`🧹 Cleaning up old ${dataType} data...`);
      
      // Get all storage keys
      const allData = await chrome.storage.local.get();
      const keysToClean = Object.keys(allData).filter(key => 
        key.startsWith(`autonomous_data_${dataType}`) && 
        allData[key].version && 
        allData[key].version > 20 // Keep last 20 versions
      );

      // Remove old versions (keep only most recent)
      for (const key of keysToClean) {
        const data = allData[key];
        if (data.version < Math.max(...keysToClean.map(k => allData[k].version)) - 10) {
          await chrome.storage.local.remove(key);
          console.log(`Cleaned up old version of ${key}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
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

  // ============ SPECIALIZED DATA EXTRACTION METHODS (Phase 4.2) ============

  /**
   * Extract calendar data
   */
  extractCalendarData() {
    try {
      const events = [];
      const calendarItems = document.querySelectorAll('.fc-event, .calendar-event, .planner-item');
      
      calendarItems.forEach(item => {
        const title = item.querySelector('.fc-title, .event-title, .planner-item-title')?.textContent?.trim();
        const date = item.querySelector('.fc-time, .event-date, .planner-item-date')?.textContent?.trim();
        const course = item.querySelector('.course-name, .context-name')?.textContent?.trim();
        
        if (title) {
          events.push({
            title,
            date,
            course,
            type: item.classList.contains('assignment') ? 'assignment' : 'event'
          });
        }
      });

      return {
        type: 'calendar',
        events,
        extractedAt: new Date().toISOString(),
        count: events.length
      };
    } catch (error) {
      return {
        type: 'calendar',
        error: error.message,
        events: []
      };
    }
  }

  /**
   * Extract grades summary
   */
  extractGradesSummary() {
    try {
      const grades = [];
      const gradeItems = document.querySelectorAll('.grades tr, .grade-summary-item, .course-grade');
      
      gradeItems.forEach(item => {
        const course = item.querySelector('.course-name, .course-title, td:first-child')?.textContent?.trim();
        const grade = item.querySelector('.grade, .current-grade, .final-grade')?.textContent?.trim();
        const score = item.querySelector('.score, .points')?.textContent?.trim();
        
        if (course && grade) {
          grades.push({
            course,
            grade,
            score,
            status: item.classList.contains('passing') ? 'passing' : 'unknown'
          });
        }
      });

      return {
        type: 'grades-summary',
        grades,
        extractedAt: new Date().toISOString(),
        count: grades.length
      };
    } catch (error) {
      return {
        type: 'grades-summary',
        error: error.message,
        grades: []
      };
    }
  }

  /**
   * Extract todo list
   */
  extractTodoList() {
    try {
      const todos = [];
      const todoItems = document.querySelectorAll('.todo-item, .to-do-item, .planner-item, .todo-list li');
      
      todoItems.forEach(item => {
        const title = item.querySelector('.todo-title, .item-title, .assignment-name')?.textContent?.trim();
        const dueDate = item.querySelector('.due-date, .todo-date, .due-at')?.textContent?.trim();
        const course = item.querySelector('.course-name, .context-name')?.textContent?.trim();
        const points = item.querySelector('.points, .todo-points')?.textContent?.trim();
        
        if (title) {
          todos.push({
            title,
            dueDate,
            course,
            points,
            priority: item.classList.contains('high-priority') ? 'high' : 'normal'
          });
        }
      });

      return {
        type: 'todo',
        todos,
        extractedAt: new Date().toISOString(),
        count: todos.length
      };
    } catch (error) {
      return {
        type: 'todo',
        error: error.message,
        todos: []
      };
    }
  }

  /**
   * Extract assignments data for a specific course
   */
  extractAssignmentsData(courseId) {
    try {
      const assignments = [];
      const assignmentItems = document.querySelectorAll('.assignment, .assignment-list-item, .ig-row');
      
      assignmentItems.forEach(item => {
        const name = item.querySelector('.ig-title, .assignment-title, .assignment-name a')?.textContent?.trim();
        const dueDate = item.querySelector('.due-date, .assignment-due-date, .due')?.textContent?.trim();
        const points = item.querySelector('.points, .assignment-points')?.textContent?.trim();
        const status = item.querySelector('.submission-status, .status')?.textContent?.trim();
        const submitted = item.classList.contains('submitted') || status?.includes('Submitted');
        
        if (name) {
          assignments.push({
            name,
            dueDate,
            points,
            status,
            submitted,
            courseId
          });
        }
      });

      return {
        type: 'course-assignments',
        courseId,
        assignments,
        extractedAt: new Date().toISOString(),
        count: assignments.length
      };
    } catch (error) {
      return {
        type: 'course-assignments',
        courseId,
        error: error.message,
        assignments: []
      };
    }
  }

  /**
   * Extract course grades
   */
  extractCourseGrades(courseId) {
    try {
      const grades = [];
      const gradeItems = document.querySelectorAll('.grades tr, .assignment-grade-cell, .gradebook-row');
      
      gradeItems.forEach(item => {
        const assignment = item.querySelector('.assignment-name, .gradebook-cell-title, td:first-child')?.textContent?.trim();
        const score = item.querySelector('.grade, .score, .points-earned')?.textContent?.trim();
        const outOf = item.querySelector('.points-possible, .out-of')?.textContent?.trim();
        const percentage = item.querySelector('.percentage, .grade-percentage')?.textContent?.trim();
        
        if (assignment && score) {
          grades.push({
            assignment,
            score,
            outOf,
            percentage,
            courseId
          });
        }
      });

      return {
        type: 'course-grades',
        courseId,
        grades,
        extractedAt: new Date().toISOString(),
        count: grades.length
      };
    } catch (error) {
      return {
        type: 'course-grades',
        courseId,
        error: error.message,
        grades: []
      };
    }
  }

  /**
   * Extract announcements data
   */
  extractAnnouncementsData(courseId) {
    try {
      const announcements = [];
      const announcementItems = document.querySelectorAll('.announcement, .discussion-topic, .ic-announcement-row');
      
      announcementItems.forEach(item => {
        const title = item.querySelector('.discussion-title, .announcement-title, .ig-title')?.textContent?.trim();
        const author = item.querySelector('.author, .discussion-author')?.textContent?.trim();
        const date = item.querySelector('.discussion-date, .announcement-date, .created-at')?.textContent?.trim();
        const content = item.querySelector('.discussion-summary, .announcement-content, .message')?.textContent?.trim();
        
        if (title) {
          announcements.push({
            title,
            author,
            date,
            content: content?.substring(0, 500), // Limit content length
            courseId
          });
        }
      });

      return {
        type: 'course-announcements',
        courseId,
        announcements,
        extractedAt: new Date().toISOString(),
        count: announcements.length
      };
    } catch (error) {
      return {
        type: 'course-announcements',
        courseId,
        error: error.message,
        announcements: []
      };
    }
  }

  /**
   * Extract discussions data
   */
  extractDiscussionsData(courseId) {
    try {
      const discussions = [];
      const discussionItems = document.querySelectorAll('.discussion-topic, .discussion, .ic-discussion-row');
      
      discussionItems.forEach(item => {
        const title = item.querySelector('.discussion-title, .ig-title')?.textContent?.trim();
        const author = item.querySelector('.author, .discussion-author')?.textContent?.trim();
        const replies = item.querySelector('.reply-count, .discussion-reply-count')?.textContent?.trim();
        const lastPost = item.querySelector('.last-post, .discussion-last-reply')?.textContent?.trim();
        
        if (title) {
          discussions.push({
            title,
            author,
            replies,
            lastPost,
            courseId
          });
        }
      });

      return {
        type: 'course-discussions',
        courseId,
        discussions,
        extractedAt: new Date().toISOString(),
        count: discussions.length
      };
    } catch (error) {
      return {
        type: 'course-discussions',
        courseId,
        error: error.message,
        discussions: []
      };
    }
  }

  /**
   * Extract modules data
   */
  extractModulesData(courseId) {
    try {
      const modules = [];
      const moduleItems = document.querySelectorAll('.context-module, .module, .ig-row');
      
      moduleItems.forEach(item => {
        const name = item.querySelector('.module-name, .ig-title, .context_module .name')?.textContent?.trim();
        const items = [];
        
        // Get module items
        const moduleItemElements = item.querySelectorAll('.context-module-item, .module-item');
        moduleItemElements.forEach(moduleItem => {
          const itemTitle = moduleItem.querySelector('.ig-title, .item-title')?.textContent?.trim();
          const itemType = moduleItem.querySelector('.type, .item-type')?.textContent?.trim();
          
          if (itemTitle) {
            items.push({
              title: itemTitle,
              type: itemType
            });
          }
        });
        
        if (name) {
          modules.push({
            name,
            items,
            courseId,
            itemCount: items.length
          });
        }
      });

      return {
        type: 'course-modules',
        courseId,
        modules,
        extractedAt: new Date().toISOString(),
        count: modules.length
      };
    } catch (error) {
      return {
        type: 'course-modules',
        courseId,
        error: error.message,
        modules: []
      };
    }
  }

  /**
   * Extract syllabus data
   */
  extractSyllabusData(courseId) {
    try {
      const syllabusContent = document.querySelector('.syllabus, .course-syllabus, .user_content')?.textContent?.trim();
      const syllabusEvents = [];
      
      // Extract syllabus events if present
      const eventItems = document.querySelectorAll('.syllabus-event, .event');
      eventItems.forEach(item => {
        const date = item.querySelector('.event-date, .date')?.textContent?.trim();
        const title = item.querySelector('.event-title, .title')?.textContent?.trim();
        
        if (date && title) {
          syllabusEvents.push({ date, title });
        }
      });

      return {
        type: 'course-syllabus',
        courseId,
        content: syllabusContent?.substring(0, 2000), // Limit content length
        events: syllabusEvents,
        extractedAt: new Date().toISOString(),
        hasContent: !!syllabusContent,
        eventCount: syllabusEvents.length
      };
    } catch (error) {
      return {
        type: 'course-syllabus',
        courseId,
        error: error.message,
        content: null,
        events: []
      };
    }
  }

  /**
   * Extract files data
   */
  extractFilesData(courseId) {
    try {
      const files = [];
      const fileItems = document.querySelectorAll('.file, .ef-item-row, .files-list li');
      
      fileItems.forEach(item => {
        const name = item.querySelector('.file-name, .ef-name-col, .filename')?.textContent?.trim();
        const size = item.querySelector('.file-size, .ef-size-col, .size')?.textContent?.trim();
        const modified = item.querySelector('.date-modified, .ef-date-created-col, .modified')?.textContent?.trim();
        const type = item.querySelector('.file-type, .ef-kind-col')?.textContent?.trim();
        
        if (name) {
          files.push({
            name,
            size,
            modified,
            type,
            courseId
          });
        }
      });

      return {
        type: 'course-files',
        courseId,
        files,
        extractedAt: new Date().toISOString(),
        count: files.length
      };
    } catch (error) {
      return {
        type: 'course-files',
        courseId,
        error: error.message,
        files: []
      };
    }
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

    // ============ PHASE 4.2: COMPREHENSIVE DATA ACCESS ============

    case 'GET_SEMESTER_DATA_INDEX':
      chrome.storage.local.get('autonomous_semester_index').then(result => {
        sendResponse({ 
          success: true, 
          index: result.autonomous_semester_index || null 
        });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'GET_COURSE_DATA':
      const courseId = request.data?.courseId;
      if (!courseId) {
        sendResponse({ success: false, error: 'Course ID required' });
        break;
      }
      
      chrome.storage.local.get().then(allData => {
        const courseData = {};
        
        // Collect all data for this course
        for (const [key, value] of Object.entries(allData)) {
          if (key.includes(`_${courseId}`) && key.startsWith('autonomous_data_')) {
            const dataType = key.replace('autonomous_data_', '').replace(`_${courseId}`, '');
            courseData[dataType] = value;
          }
        }
        
        sendResponse({ success: true, courseData });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'GET_ALL_AUTONOMOUS_DATA':
      chrome.storage.local.get().then(allData => {
        const autonomousData = {};
        
        // Filter and organize autonomous data
        for (const [key, value] of Object.entries(allData)) {
          if (key.startsWith('autonomous_data_') || key === 'autonomous_semester_index') {
            autonomousData[key] = value;
          }
        }
        
        sendResponse({ success: true, data: autonomousData });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'GET_DATA_BY_TYPE':
      const dataType = request.data?.dataType;
      if (!dataType) {
        sendResponse({ success: false, error: 'Data type required' });
        break;
      }
      
      chrome.storage.local.get().then(allData => {
        const typeData = {};
        
        // Collect all data of this type
        for (const [key, value] of Object.entries(allData)) {
          if (key.startsWith(`autonomous_data_${dataType}`)) {
            typeData[key] = value;
          }
        }
        
        sendResponse({ success: true, data: typeData });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'CLEAR_AUTONOMOUS_DATA':
      const clearType = request.data?.type || 'all';
      
      chrome.storage.local.get().then(allData => {
        const keysToRemove = [];
        
        if (clearType === 'all') {
          // Clear all autonomous data
          for (const key of Object.keys(allData)) {
            if (key.startsWith('autonomous_data_') || key === 'autonomous_semester_index') {
              keysToRemove.push(key);
            }
          }
        } else {
          // Clear specific data type
          for (const key of Object.keys(allData)) {
            if (key.startsWith(`autonomous_data_${clearType}`)) {
              keysToRemove.push(key);
            }
          }
        }
        
        if (keysToRemove.length > 0) {
          return chrome.storage.local.remove(keysToRemove);
        }
      }).then(() => {
        sendResponse({ success: true, cleared: clearType });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    // ============ PHASE 4.4: ADVANCED STORAGE & CACHING ============

    case 'GET_STORAGE_STATS':
      if (tabManager.storageManager) {
        tabManager.storageManager.getStorageStats().then(stats => {
          sendResponse({ success: true, stats });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Storage Manager not available' });
      }
      return true;

    case 'QUERY_DATA':
      if (tabManager.storageManager) {
        tabManager.storageManager.queryData(request.query).then(result => {
          sendResponse(result);
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Storage Manager not available' });
      }
      return true;

    case 'GET_ADVANCED_DATA':
      if (tabManager.storageManager) {
        const { dataType, id, options } = request.data || {};
        tabManager.storageManager.getData(dataType, id, options).then(result => {
          sendResponse(result);
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Storage Manager not available' });
      }
      return true;

    case 'CLEANUP_STORAGE':
      if (tabManager.storageManager) {
        const maxAge = request.data?.maxAge || (30 * 24 * 60 * 60 * 1000); // 30 days default
        tabManager.storageManager.cleanupOldData(maxAge).then(result => {
          sendResponse({ success: true, result });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Storage Manager not available' });
      }
      return true;

    case 'COMPRESS_DATA':
      if (tabManager.storageManager) {
        tabManager.storageManager.compressData(request.data).then(compressed => {
          sendResponse({ success: true, compressed });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Storage Manager not available' });
      }
      return true;

    // ============ PHASE 5.1: UNIVERSAL CHAT INTERFACE ============

    case 'CHAT_INTERFACE_READY':
      console.log('💬 Chat interface connected:', request.data?.conversationId);
      sendResponse({ 
        success: true, 
        message: 'Chat interface connected successfully',
        canvasStatus: {
          isAuthenticated: tabManager.sessionState.isAuthenticated,
          domain: tabManager.sessionState.canvasDomain,
          dataAvailable: true // TODO: Check actual data availability
        }
      });
      return true;

    case 'PROCESS_CHAT_MESSAGE':
      console.log('🤖 Processing chat message:', request.data?.message?.content);
      
      const userMessage = request.data?.message?.content || '';
      const conversationId = request.data?.conversationId || 'unknown';
      const messageId = request.data?.message?.id || 'unknown';
      
      // Enhanced NLP processing (Phase 5.2)
      if (tabManager.nlpProcessor) {
        // Get Canvas data for context
        tabManager.getCanvasDataForNLP().then(async (canvasData) => {
          try {
            const startTime = Date.now();
            
            // Process with NLP engine
            const nlpResult = await tabManager.nlpProcessor.processQuery(
              userMessage, 
              conversationId, 
              canvasData
            );
            
            const processingTime = Date.now() - startTime;
            
            sendResponse({
              success: true,
              reply: nlpResult.response,
              metadata: {
                processedAt: new Date().toISOString(),
                conversationId: conversationId,
                messageId: messageId,
                processingTime: processingTime,
                intent: nlpResult.intent,
                confidence: nlpResult.confidence,
                parameters: nlpResult.parameters,
                suggestions: nlpResult.suggestions,
                nlpEnabled: true
              }
            });
            
          } catch (error) {
            console.error('❌ NLP processing failed:', error);
            sendResponse({
              success: true,
              reply: "I'm having trouble processing your question right now. Could you please try rephrasing it?",
              metadata: {
                processedAt: new Date().toISOString(),
                conversationId: conversationId,
                messageId: messageId,
                processingTime: Date.now() - Date.now(),
                error: error.message,
                nlpEnabled: false
              }
            });
          }
        }).catch(error => {
          console.error('❌ Failed to get Canvas data for NLP:', error);
          sendResponse({
            success: true,
            reply: "I'm having trouble accessing your Canvas data right now. Please make sure you're logged into Canvas and try again.",
            metadata: {
              processedAt: new Date().toISOString(),
              conversationId: conversationId,
              messageId: messageId,
              error: error.message,
              nlpEnabled: false
            }
          });
        });
      } else {
        // Fallback to simple keyword-based responses
        let reply = '';
        
        if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
          reply = "Hello! I'm your Canvas Assistant. I can help you with questions about your coursework, grades, assignments, and more. What would you like to know?";
        } else if (userMessage.toLowerCase().includes('assignment')) {
          reply = "I can help you with assignment information! I have access to your Canvas data and can tell you about due dates, submission requirements, and grades. What specific assignment would you like to know about?";
        } else if (userMessage.toLowerCase().includes('grade')) {
          reply = "I can help you check your grades! I have access to your Canvas gradebook data. Would you like to see your current grades for a specific course or overall GPA?";
        } else if (userMessage.toLowerCase().includes('course')) {
          reply = "I can provide information about your courses! I have access to your course schedules, syllabi, announcements, and more. Which course would you like to know about?";
        } else {
          reply = `I understand you're asking about: "${userMessage}". I'm still learning to process complex queries, but I have access to all your Canvas data including courses, assignments, grades, announcements, and more. Could you be more specific about what you'd like to know?`;
        }

        // Simulate processing delay for realistic feel
        setTimeout(() => {
          sendResponse({
            success: true,
            reply: reply,
            metadata: {
              processedAt: new Date().toISOString(),
              conversationId: conversationId,
              messageId: messageId,
              processingTime: Math.floor(Math.random() * 1000) + 500,
              nlpEnabled: false,
              fallback: true
            }
          });
        }, Math.floor(Math.random() * 1000) + 500);
      }
      
      return true; // Keep message channel open for async response

    case 'OPEN_CHAT_WINDOW':
      console.log('🪟 Opening standalone chat window');
      
      chrome.windows.create({
        url: chrome.runtime.getURL('chat/chat.html'),
        type: 'popup',
        width: 800,
        height: 600,
        focused: true
      }).then((window) => {
        sendResponse({ 
          success: true, 
          windowId: window.id,
          message: 'Chat window opened successfully'
        });
      }).catch((error) => {
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
      
      return true;

    case 'GET_CHAT_CONTEXT':
      console.log('📋 Getting chat context data');
      
      // Gather relevant Canvas data for chat context
      const chatContext = {
        authentication: {
          isAuthenticated: tabManager.sessionState.isAuthenticated,
          domain: tabManager.sessionState.canvasDomain
        },
        dataAvailability: {
          courses: false,
          assignments: false,
          grades: false,
          announcements: false
        },
        lastSync: null,
        dataQuality: 0
      };

      // Check what data is available
      chrome.storage.local.get().then((allData) => {
        const canvasKeys = Object.keys(allData).filter(key => key.startsWith('autonomous_data_'));
        
        chatContext.dataAvailability.courses = canvasKeys.some(key => key.includes('dashboard') || key.includes('courses'));
        chatContext.dataAvailability.assignments = canvasKeys.some(key => key.includes('assignments'));
        chatContext.dataAvailability.grades = canvasKeys.some(key => key.includes('grades'));
        chatContext.dataAvailability.announcements = canvasKeys.some(key => key.includes('announcements'));
        
        // Find most recent sync
        const timestamps = canvasKeys.map(key => {
          const data = allData[key];
          return data?.timestamp ? new Date(data.timestamp).getTime() : 0;
        });
        
        if (timestamps.length > 0) {
          chatContext.lastSync = new Date(Math.max(...timestamps)).toISOString();
        }

        sendResponse({ success: true, context: chatContext });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      
      return true;

    // ============ PHASE 4.3: AUTHENTICATION MANAGEMENT ============

    case 'GET_AUTH_STATUS':
      sendResponse({
        success: true,
        authStatus: {
          isAuthenticated: tabManager.sessionState.isAuthenticated,
          domain: tabManager.sessionState.canvasDomain,
          lastCheck: tabManager.sessionState.lastCheck,
          consecutiveFailures: tabManager.sessionState.consecutiveFailures,
          authenticationHistory: tabManager.sessionState.authenticationHistory.slice(-10), // Last 10 entries
          supportedDomains: tabManager.sessionState.supportedDomains,
          userDomains: tabManager.sessionState.userDomains
        }
      });
      break;

    case 'ADD_CANVAS_DOMAIN':
      const domainToAdd = request.data?.domain;
      if (!domainToAdd) {
        sendResponse({ success: false, error: 'Domain required' });
        break;
      }
      
      if (!tabManager.sessionState.userDomains.includes(domainToAdd)) {
        tabManager.sessionState.userDomains.push(domainToAdd);
        tabManager.saveUserDomainConfiguration().then(() => {
          sendResponse({ success: true, userDomains: tabManager.sessionState.userDomains });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Domain already configured' });
      }
      return true;

    case 'REMOVE_CANVAS_DOMAIN':
      const domainToRemove = request.data?.domain;
      if (!domainToRemove) {
        sendResponse({ success: false, error: 'Domain required' });
        break;
      }
      
      const domainIndex = tabManager.sessionState.userDomains.indexOf(domainToRemove);
      if (domainIndex > -1) {
        tabManager.sessionState.userDomains.splice(domainIndex, 1);
        tabManager.saveUserDomainConfiguration().then(() => {
          sendResponse({ success: true, userDomains: tabManager.sessionState.userDomains });
        }).catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Domain not found in configuration' });
      }
      return true;

    case 'GET_AUTH_EVENTS':
      chrome.storage.local.get('canvas_auth_events').then(result => {
        sendResponse({
          success: true,
          events: result.canvas_auth_events || []
        });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'CLEAR_AUTH_EVENTS':
      chrome.storage.local.remove('canvas_auth_events').then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'FORCE_AUTH_CHECK':
      tabManager.checkCanvasSession().then(() => {
        sendResponse({
          success: true,
          authStatus: {
            isAuthenticated: tabManager.sessionState.isAuthenticated,
            domain: tabManager.sessionState.canvasDomain,
            lastCheck: tabManager.sessionState.lastCheck
          }
        });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'GET_NOTIFICATION_HISTORY':
      sendResponse({
        success: true,
        notifications: tabManager.notificationHistory || []
      });
      break;

    case 'RESET_AUTH_FAILURES':
      tabManager.sessionState.consecutiveFailures = 0;
      tabManager.sessionState.lastAuthenticationLoss = null;
      sendResponse({ success: true });
      break;

    case 'TRIGGER_AUTONOMOUS_COLLECTION':
      console.log('🚀 Manual autonomous collection triggered');
      
      try {
        // Trigger immediate data collection
        tabManager.processDataCollectionQueue();
        
        sendResponse({
          success: true,
          message: 'Autonomous data collection triggered'
        });
      } catch (error) {
        console.error('❌ Failed to trigger autonomous collection:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
      return true;

    case 'TEST_STORAGE_VALIDATION':
      console.log('🧪 Testing storage validation for:', request.dataType);
      
      try {
        if (tabManager.storageManager) {
          const validatedData = tabManager.storageManager.validateData(request.dataType, request.data);
          sendResponse({
            success: true,
            validatedData: validatedData
          });
        } else {
          sendResponse({
            success: false,
            error: 'Storage manager not available'
          });
        }
      } catch (error) {
        console.error('❌ Storage validation test failed:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
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
console.log('🎯 All message handlers registered and ready');
console.log('🤖 Autonomous system:', tabManager.autonomousEnabled ? 'ENABLED' : 'DISABLED');
