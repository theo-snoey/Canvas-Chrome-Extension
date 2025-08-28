// Canvas LMS Assistant - Content Script
// Runs on Canvas pages to detect LMS presence and provide page-level functionality

console.log('Canvas Assistant content script loaded');

// Canvas Detector Class (inline to avoid import issues)
class CanvasDetector {
  constructor() {
    this.canvasDomains = [
      'canvas.instructure.com',
      'canvas.edu',
      'canvas.net',
      'canvas.org',
      'canvas.com'
    ];

    this.pageTypes = {
      DASHBOARD: 'dashboard',
      COURSE: 'course',
      ASSIGNMENT: 'assignment',
      GRADEBOOK: 'grades',
      MODULES: 'modules',
      FILES: 'files',
      ANNOUNCEMENTS: 'announcements',
      CALENDAR: 'calendar',
      PEOPLE: 'people',
      SETTINGS: 'settings',
      UNKNOWN: 'unknown'
    };
  }

  /**
   * Check if current page is a Canvas LMS page
   */
  isCanvasPage() {
    const hostname = window.location.hostname.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    // Check for known Canvas domains
    const isKnownDomain = this.canvasDomains.some(domain =>
      hostname.includes(domain) || domain.includes(hostname)
    );

    // Check for Canvas-specific patterns
    const hasCanvasIndicators = this.hasCanvasIndicators();

    return isKnownDomain || hasCanvasIndicators;
  }

  /**
   * Check for Canvas-specific page indicators
   */
  hasCanvasIndicators() {
    // Look for Canvas-specific elements, classes, or scripts
    const indicators = [
      // Canvas-specific meta tags
      'meta[name="canvas"]',
      'meta[content*="canvas"]',

      // Canvas-specific classes
      '.canvas-header',
      '.ic-app-header',
      '.canvas-navigation',
      '.ic-Navigation',

      // Canvas-specific IDs
      '#application',
      '#wrapper',

      // Canvas-specific scripts
      'script[src*="canvas"]',
      'script[src*="instructure"]',

      // Canvas branding
      'a[href*="canvas"]',
      'img[alt*="canvas"]'
    ];

    return indicators.some(selector => document.querySelector(selector));
  }

  /**
   * Determine the type of Canvas page
   */
  getPageType() {
    if (!this.isCanvasPage()) {
      return this.pageTypes.UNKNOWN;
    }

    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    // Dashboard
    if (pathname === '/' || pathname === '/dashboard' || pathname.includes('/dashboard')) {
      return this.pageTypes.DASHBOARD;
    }

    // Course pages
    if (pathname.includes('/courses/')) {
      if (pathname.includes('/assignments')) {
        return this.pageTypes.ASSIGNMENT;
      }
      if (pathname.includes('/gradebook') || pathname.includes('/grades')) {
        return this.pageTypes.GRADEBOOK;
      }
      if (pathname.includes('/modules')) {
        return this.pageTypes.MODULES;
      }
      if (pathname.includes('/files')) {
        return this.pageTypes.FILES;
      }
      if (pathname.includes('/announcements')) {
        return this.pageTypes.ANNOUNCEMENTS;
      }
      if (pathname.includes('/users') || pathname.includes('/people')) {
        return this.pageTypes.PEOPLE;
      }
      if (pathname.includes('/settings')) {
        return this.pageTypes.SETTINGS;
      }
      // Default to course page
      return this.pageTypes.COURSE;
    }

    // Calendar
    if (pathname.includes('/calendar')) {
      return this.pageTypes.CALENDAR;
    }

    // Profile/Account pages
    if (pathname.includes('/profile') || pathname.includes('/account')) {
      return this.pageTypes.SETTINGS;
    }

    return this.pageTypes.UNKNOWN;
  }

  /**
   * Extract basic information from current Canvas page
   */
  extractBasicInfo() {
    const info = {
      isCanvas: this.isCanvasPage(),
      pageType: this.getPageType(),
      url: window.location.href,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      courseId: null,
      userId: null,
      timestamp: new Date().toISOString()
    };

    // Extract course ID from URL
    const courseMatch = window.location.pathname.match(/\/courses\/(\d+)/);
    if (courseMatch) {
      info.courseId = courseMatch[1];
    }

    // Extract user ID if available
    const userMatch = window.location.pathname.match(/\/users\/(\d+)/);
    if (userMatch) {
      info.userId = userMatch[1];
    }

    return info;
  }

  /**
   * Get page-specific metadata
   */
  getPageMetadata() {
    const metadata = {
      title: document.title,
      description: '',
      courseName: '',
      instructorName: '',
      lastModified: null
    };

    // Extract page title
    const titleElement = document.querySelector('h1, .page-title, .ic-page-title');
    if (titleElement) {
      metadata.title = titleElement.textContent.trim();
    }

    // Extract course name from breadcrumb or header
    const courseNameElement = document.querySelector(
      '.breadcrumb .course-name, .ic-app-header__menu a[href*="/courses/"], .course-title'
    );
    if (courseNameElement) {
      metadata.courseName = courseNameElement.textContent.trim();
    }

    // Extract instructor name if available
    const instructorElement = document.querySelector(
      '.instructor-name, .teacher-name, [data-role="instructor"]'
    );
    if (instructorElement) {
      metadata.instructorName = instructorElement.textContent.trim();
    }

    // Try to get last modified date
    const lastModifiedMeta = document.querySelector('meta[name="last-modified"]');
    if (lastModifiedMeta) {
      metadata.lastModified = lastModifiedMeta.getAttribute('content');
    }

    return metadata;
  }

  /**
   * Check if user is logged into Canvas
   */
  isLoggedIn() {
    // Look for logout button or user menu as indicator of login status
    const logoutIndicators = [
      'a[href*="logout"]',
      'a[href*="sign_out"]',
      '.logout-link',
      '.user-menu',
      '.ic-user-menu',
      '#user_menu',
      '.ic-app-header__menu'
    ];

    return logoutIndicators.some(selector => document.querySelector(selector));
  }

  /**
   * Get current user information
   */
  getUserInfo() {
    const userInfo = {
      name: '',
      email: '',
      avatar: '',
      isLoggedIn: this.isLoggedIn()
    };

    if (!userInfo.isLoggedIn) {
      return userInfo;
    }

    // Extract user name
    const nameSelectors = [
      '.user-name',
      '.ic-user-menu__name',
      '.user-display-name',
      '[data-user-name]',
      '.user_info .name'
    ];

    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        userInfo.name = element.textContent.trim();
        break;
      }
    }

    // Extract user avatar
    const avatarSelectors = [
      '.user-avatar img',
      '.ic-user-menu__avatar img',
      '.avatar img',
      '.profile-picture img'
    ];

    for (const selector of avatarSelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        userInfo.avatar = img.src;
        break;
      }
    }

    return userInfo;
  }

  /**
   * Get comprehensive page analysis
   */
  analyzePage() {
    return {
      detection: this.extractBasicInfo(),
      metadata: this.getPageMetadata(),
      user: this.getUserInfo(),
      navigation: this.extractNavigationInfo(),
      detectedAt: new Date().toISOString()
    };
  }

  /**
   * Extract navigation information
   */
  extractNavigationInfo() {
    const navigation = {
      mainMenu: [],
      breadcrumbs: [],
      sidebar: []
    };

    // Extract main navigation menu
    const mainMenuSelectors = [
      '.ic-app-header__menu',
      '.main-navigation',
      '.nav-menu',
      '#main-menu'
    ];

    for (const selector of mainMenuSelectors) {
      const menu = document.querySelector(selector);
      if (menu) {
        const links = menu.querySelectorAll('a');
        navigation.mainMenu = Array.from(links).map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          active: link.classList.contains('active') || link.classList.contains('ic-app-header__menu-item--active')
        }));
        break;
      }
    }

    // Extract breadcrumbs
    const breadcrumbSelectors = [
      '.breadcrumb',
      '.breadcrumbs',
      '.ic-breadcrumbs'
    ];

    for (const selector of breadcrumbSelectors) {
      const breadcrumb = document.querySelector(selector);
      if (breadcrumb) {
        const links = breadcrumb.querySelectorAll('a');
        navigation.breadcrumbs = Array.from(links).map(link => ({
          text: link.textContent.trim(),
          href: link.href
        }));
        break;
      }
    }

    return navigation;
  }
}

// Create canvas detector instance
const canvasDetector = new CanvasDetector();

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

    // Send page information to background script (non-blocking)
    console.log('📤 About to send page info to background...');
    sendPageInfoToBackground(currentPageInfo).then(() => {
      console.log('✅ Page info sent successfully');
    }).catch(error => {
      console.warn('⚠️ Failed to send page info to background (non-critical):', error.message);
    });

    // Initialize page-specific features
    console.log('🎯 About to call initializePageFeatures...');
    await initializePageFeatures(currentPageInfo);
    console.log('✅ initializePageFeatures completed');

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
  console.log('🚀 initializePageFeatures called with:', pageInfo);
  const { pageType } = pageInfo.detection;

  console.log(`Initializing features for page type: ${pageType}`);

  // Initialize data extraction for all Canvas pages
  console.log('About to initialize data extraction...');
  await initializeDataExtraction(pageInfo);
  console.log('Data extraction initialization completed');

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
 * Initialize data extraction for all Canvas pages
 */
async function initializeDataExtraction(pageInfo) {
  try {
    console.log('Initializing automatic data extraction...');
    
    // Create data extractor instance
    const dataExtractor = new CanvasDataExtractor();
    
    // Extract data from current page
    const extractedData = await dataExtractor.extractCurrentPage();
    
    if (extractedData) {
      console.log('🎯 Automatic data extraction successful:', extractedData);
      
      // Send extracted data to background script
      chrome.runtime.sendMessage({
        action: 'DATA_EXTRACTED',
        data: extractedData
      }).catch(error => {
        console.warn('Could not send extracted data to background:', error.message);
      });

      // Store data locally for quick access
      window.lastExtractedData = extractedData;
      
    } else {
      console.warn('⚠️ Automatic data extraction returned no data');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize automatic data extraction:', error);
  }
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


