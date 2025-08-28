// Canvas LMS Data Extractor - Minimal Framework
// Phase 3.1: DOM Scraping Foundation

console.log('Canvas Data Extractor loading...');

// Simple data extractor class - minimal version
class CanvasDataExtractor {
  constructor() {
    this.currentPageType = null;
    this.extractedData = null;
    console.log('CanvasDataExtractor initialized');
  }

  /**
   * Test method to verify the extractor is working
   */
  test() {
    console.log('CanvasDataExtractor test method called');
    return {
      status: 'working',
      timestamp: new Date().toISOString(),
      message: 'Data extractor is functional'
    };
  }

  /**
   * Detect the type of Canvas page we're on
   */
  detectPageType() {
    const url = window.location.href;
    const path = window.location.pathname;

    console.log('Detecting page type for:', path);

    // Dashboard/Home
    if (url.includes('/dashboard') || path === '/' || (url.includes('/courses') && !path.includes('/courses/'))) {
      return 'dashboard';
    }

    // Course main page
    if (path.match(/\/courses\/\d+$/) || path.match(/\/courses\/\d+\/?$/)) {
      return 'course';
    }

    // Assignments
    if (path.includes('/assignments')) {
      return 'assignments';
    }

    // Grades
    if (path.includes('/grades') || path.includes('/gradebook')) {
      return 'grades';
    }

    // Syllabus
    if (path.includes('/syllabus')) {
      return 'syllabus';
    }

    // Modules
    if (path.includes('/modules')) {
      return 'modules';
    }

    // Default to course if we can't determine
    return 'course';
  }

  /**
   * Safe DOM query with error handling
   */
  safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (error) {
      console.warn(`Failed to query selector: ${selector}`, error);
      return null;
    }
  }

  /**
   * Safe DOM query all with error handling
   */
  safeQueryAll(selector, context = document) {
    try {
      return Array.from(context.querySelectorAll(selector));
    } catch (error) {
      console.warn(`Failed to query all selector: ${selector}`, error);
      return [];
    }
  }

  /**
   * Extract text content safely
   */
  safeTextContent(element) {
    if (!element) return '';
    try {
      return element.textContent?.trim() || '';
    } catch (error) {
      console.warn('Failed to extract text content:', error);
      return '';
    }
  }

  /**
   * Extract attribute value safely
   */
  safeAttribute(element, attribute) {
    if (!element) return '';
    try {
      return element.getAttribute(attribute) || '';
    } catch (error) {
      console.warn(`Failed to extract attribute ${attribute}:`, error);
      return '';
    }
  }

  /**
   * Extract data from the current Canvas page
   */
  async extractCurrentPage() {
    try {
      const pageType = this.detectPageType();
      this.currentPageType = pageType;

      console.log(`Extracting data for page type: ${pageType}`);

      let extractedData = null;

      // Extract data based on page type
      switch (pageType) {
        case 'dashboard':
          extractedData = this.extractDashboardData();
          break;
        case 'course':
          extractedData = this.extractCourseData();
          break;
        default:
          extractedData = this.extractGenericData();
      }

      this.extractedData = extractedData;

      return {
        pageType: pageType,
        data: extractedData,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

    } catch (error) {
      console.error('Data extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract dashboard data (courses, announcements, assignments)
   */
  extractDashboardData() {
    console.log('Extracting dashboard data...');
    
    const data = {
      type: 'dashboard',
      courses: [],
      announcements: [],
      upcomingAssignments: []
    };

    // Extract course list - try multiple selectors
    const courseSelectors = [
      '.course-list-item',
      '.course-card', 
      '.dashboard-card',
      '[data-testid="course-card"]',
      '.ic-DashboardCard'
    ];

    for (const selector of courseSelectors) {
      const courseElements = this.safeQueryAll(selector);
      if (courseElements.length > 0) {
        console.log(`Found ${courseElements.length} courses using selector: ${selector}`);
        data.courses = courseElements.map((course, index) => {
          // Try multiple methods to get course name
          const nameElement = this.safeQuery('.course-name, .course-title, h3, h4, .ic-DashboardCard__header_title', course);
          const codeElement = this.safeQuery('.course-code, .course-subtitle, .subtitle', course);
          const linkElement = this.safeQuery('a', course);
          
          // Get name from aria-label if nameElement is null
          let name = this.safeTextContent(nameElement);
          if (!name) {
            name = this.safeAttribute(course, 'aria-label') || '';
          }
          
          const code = this.safeTextContent(codeElement);
          const url = this.safeAttribute(linkElement, 'href') || this.safeAttribute(course, 'href');
          
          return {
            name: name,
            code: code,
            url: url
          };
        }).filter(course => course.name);
        
        break; // Stop after finding courses
      }
    }

    // Extract announcements
    const announcementSelectors = [
      '.announcement',
      '.dashboard-news',
      '[data-testid="announcement"]',
      '.ic-DashboardCard__action-container'
    ];

    for (const selector of announcementSelectors) {
      const announcementElements = this.safeQueryAll(selector);
      if (announcementElements.length > 0) {
        data.announcements = announcementElements.map(announcement => {
          const titleElement = this.safeQuery('.announcement-title, h3, h4, .title', announcement);
          const contentElement = this.safeQuery('.announcement-content, .content, p', announcement);
          
          return {
            title: this.safeTextContent(titleElement),
            content: this.safeTextContent(contentElement)
          };
        }).filter(announcement => announcement.title);
        
        break;
      }
    }

    console.log('Dashboard extraction completed:', data);
    return data;
  }

    /**
   * Extract course page data - Enhanced for Phase 3.2
   */
  extractCourseData() {
    console.log('Extracting comprehensive course data...');
    
    const data = {
      type: 'course',
      courseInfo: {},
      navigation: [],
      announcements: [],
      instructor: {},
      stats: {}
    };

    // Extract course information
    this.extractCourseBasicInfo(data);
    this.extractCourseNavigation(data);
    this.extractCourseAnnouncements(data);
    this.extractInstructorInfo(data);
    this.extractCourseStats(data);

    console.log('Enhanced course extraction completed:', data);
    return data;
  }

  /**
   * Extract basic course information
   */
  extractCourseBasicInfo(data) {
    // Course name from multiple sources
    const courseNameSelectors = [
      '.course-title',
      '.page-title',
      'h1',
      '.course-header h1',
      '.ic-app-course-nav .course-title',
      '#breadcrumbs .ellipsible',
      '.ic-app-course-menu .ic-app-course-menu__header'
    ];

    for (const selector of courseNameSelectors) {
      const nameElement = this.safeQuery(selector);
      if (nameElement && this.safeTextContent(nameElement)) {
        data.courseInfo.name = this.safeTextContent(nameElement);
        break;
      }
    }

    // Course code/number
    const codeSelectors = [
      '.course-code',
      '.course-subtitle',
      '[data-course-code]'
    ];

    for (const selector of codeSelectors) {
      const codeElement = this.safeQuery(selector);
      if (codeElement && this.safeTextContent(codeElement)) {
        data.courseInfo.code = this.safeTextContent(codeElement);
        break;
      }
    }

    // Course ID from URL
    const urlMatch = window.location.pathname.match(/\/courses\/(\d+)/);
    if (urlMatch) {
      data.courseInfo.id = urlMatch[1];
    }

    // Course term/semester
    const termSelectors = [
      '.course-term',
      '.term-name',
      '[data-term]'
    ];

    for (const selector of termSelectors) {
      const termElement = this.safeQuery(selector);
      if (termElement && this.safeTextContent(termElement)) {
        data.courseInfo.term = this.safeTextContent(termElement);
        break;
      }
    }
  }

  /**
   * Extract course navigation menu
   */
  extractCourseNavigation(data) {
    const navSelectors = [
      '.ic-app-course-nav .ic-app-course-menu a',
      '.course-navigation a',
      '.navigation a',
      '.nav-item a',
      '#section-tabs a'
    ];

    for (const selector of navSelectors) {
      const navElements = this.safeQueryAll(selector);
      if (navElements.length > 0) {
        data.navigation = navElements.map(nav => {
          const text = this.safeTextContent(nav);
          const url = this.safeAttribute(nav, 'href');
          const isActive = nav.classList.contains('active') || 
                          nav.classList.contains('selected') || 
                          nav.classList.contains('ic-app-course-nav__menu-list-item--active');
          
          // Extract icon if present
          const iconElement = this.safeQuery('i, .icon, svg', nav);
          const icon = iconElement ? this.safeAttribute(iconElement, 'class') : '';

          return {
            text: text,
            url: url,
            active: isActive,
            icon: icon
          };
        }).filter(nav => nav.text && nav.text.trim());

        break;
      }
    }
  }

  /**
   * Extract course announcements
   */
  extractCourseAnnouncements(data) {
    const announcementSelectors = [
      '.announcement',
      '.ic-announcement',
      '.discussion-entry',
      '.announcement-content',
      '[data-testid="announcement"]'
    ];

    for (const selector of announcementSelectors) {
      const announcementElements = this.safeQueryAll(selector);
      if (announcementElements.length > 0) {
        data.announcements = announcementElements.map(announcement => {
          const titleElement = this.safeQuery('.announcement-title, .discussion-title, h3, h4, .title', announcement);
          const contentElement = this.safeQuery('.announcement-content, .content, .message, p', announcement);
          const dateElement = this.safeQuery('.announcement-date, .date, .published-date, time', announcement);
          const authorElement = this.safeQuery('.announcement-author, .author, .user-name', announcement);

          return {
            title: this.safeTextContent(titleElement),
            content: this.safeTextContent(contentElement),
            date: this.safeTextContent(dateElement) || this.safeAttribute(dateElement, 'datetime'),
            author: this.safeTextContent(authorElement)
          };
        }).filter(announcement => announcement.title);

        break;
      }
    }
  }

  /**
   * Extract instructor information
   */
  extractInstructorInfo(data) {
    const instructorSelectors = [
      '.instructor-info',
      '.teacher-info',
      '.course-instructor',
      '.instructor-name',
      '[data-testid="instructor"]'
    ];

    for (const selector of instructorSelectors) {
      const instructorElement = this.safeQuery(selector);
      if (instructorElement) {
        const nameElement = this.safeQuery('.name, .instructor-name, h3, h4', instructorElement);
        const emailElement = this.safeQuery('.email, a[href^="mailto:"]', instructorElement);
        const avatarElement = this.safeQuery('.avatar, .profile-pic, img', instructorElement);

        data.instructor = {
          name: this.safeTextContent(nameElement),
          email: this.safeTextContent(emailElement) || this.safeAttribute(emailElement, 'href')?.replace('mailto:', ''),
          avatar: this.safeAttribute(avatarElement, 'src')
        };
        break;
      }
    }
  }

  /**
   * Extract course statistics
   */
  extractCourseStats(data) {
    // Student count
    const studentCountSelectors = [
      '.student-count',
      '.enrollment-count',
      '[data-student-count]'
    ];

    for (const selector of studentCountSelectors) {
      const countElement = this.safeQuery(selector);
      if (countElement) {
        const countText = this.safeTextContent(countElement);
        const countMatch = countText.match(/(\d+)/);
        if (countMatch) {
          data.stats.studentCount = parseInt(countMatch[1]);
        }
        break;
      }
    }

    // Course status
    const statusSelectors = [
      '.course-status',
      '.published-status',
      '[data-course-status]'
    ];

    for (const selector of statusSelectors) {
      const statusElement = this.safeQuery(selector);
      if (statusElement) {
        data.stats.status = this.safeTextContent(statusElement);
        break;
      }
    }
  }

  /**
   * Extract generic data for unknown page types
   */
  extractGenericData() {
    console.log('Extracting generic page data...');
    
    return {
      type: 'generic',
      title: document.title,
      url: window.location.href,
      headings: this.safeQueryAll('h1, h2, h3').map(h => this.safeTextContent(h)).filter(text => text),
      links: this.safeQueryAll('a[href]').length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get basic page information
   */
  getBasicPageInfo() {
    const pageType = this.detectPageType();
    this.currentPageType = pageType;

    return {
      url: window.location.href,
      title: document.title,
      pageType: pageType,
      timestamp: new Date().toISOString()
    };
  }
}

// Make CanvasDataExtractor available globally
window.CanvasDataExtractor = CanvasDataExtractor;

console.log('Canvas Data Extractor loaded successfully');
console.log('CanvasDataExtractor class available:', typeof CanvasDataExtractor);

// Test the data extractor immediately
try {
  const testExtractor = new CanvasDataExtractor();
  const testResult = testExtractor.test();
  console.log('✅ Data extractor test successful:', testResult);
  
  const basicInfo = testExtractor.getBasicPageInfo();
  console.log('✅ Basic page info:', basicInfo);

  // Test full page extraction
  testExtractor.extractCurrentPage().then(extractedData => {
    if (extractedData) {
      console.log('✅ Full page extraction successful:', extractedData);
      console.log(`   - Page type: ${extractedData.pageType}`);
      console.log(`   - Data keys: ${Object.keys(extractedData.data)}`);
      
      // Show specific data based on page type
      if (extractedData.pageType === 'dashboard' && extractedData.data.courses) {
        console.log(`   - Found ${extractedData.data.courses.length} courses`);
      }
      if (extractedData.pageType === 'course' && extractedData.data.navigation) {
        console.log(`   - Found ${extractedData.data.navigation.length} navigation items`);
      }
    } else {
      console.warn('⚠️ Full page extraction returned null');
    }
  }).catch(error => {
    console.error('❌ Full page extraction failed:', error);
  });

} catch (error) {
  console.error('❌ Data extractor test failed:', error);
}
// Force reload Thu Aug 28 16:04:17 PDT 2025
// Force reload Thu Aug 28 16:17:12 PDT 2025
