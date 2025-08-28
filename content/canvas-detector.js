// Canvas LMS Assistant - Canvas Detection System
// Detects and analyzes Canvas LMS pages for data extraction

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
   * @returns {boolean} True if Canvas page detected
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
   * @returns {boolean} True if Canvas indicators found
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
   * @returns {string} Page type constant
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
   * @returns {object} Basic page information
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
   * @returns {object} Page metadata
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
   * @returns {boolean} True if logged in
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
   * @returns {object} User information
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
   * @returns {object} Complete page analysis
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
   * @returns {object} Navigation structure
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

// Export for use in other modules
const canvasDetector = new CanvasDetector();
export { canvasDetector, CanvasDetector };
