// Canvas LMS Data Extractor - Enhanced Content Extraction
// Phase 3.1: DOM Scraping Foundation
// Phase 1.2: Enhanced Content Extraction with file processing and deep content parsing

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

    // Files - PHASE 1.2
    if (path.includes('/files')) {
      return 'files';
    }

    // Discussions - PHASE 1.2
    if (path.includes('/discussion')) {
      return 'discussions';
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
   * Extract data from the current Canvas page - Enhanced with Data Processing Pipeline
   */
  async extractCurrentPage() {
    try {
      const pageType = this.detectPageType();
      this.currentPageType = pageType;

      console.log(`Extracting data for page type: ${pageType}`);

      // Check if we have a data processor available
      const processor = window.CanvasDataProcessor ? new window.CanvasDataProcessor() : null;
      
      // Check cache first if processor is available
      if (processor) {
        const cachedData = processor.getCachedData(pageType);
        if (cachedData) {
          console.log('Using cached data for:', pageType);
          this.extractedData = cachedData.data;
          return cachedData;
        }
      }

      let extractedData = null;

      // Extract data based on page type
      switch (pageType) {
        case 'dashboard':
          extractedData = this.extractDashboardData();
          break;
        case 'assignments':
          extractedData = this.extractAssignmentsData();
          break;
        case 'course':
          extractedData = this.extractCourseData();
          break;
        case 'syllabus':
          // PHASE 1.2: Enhanced syllabus extraction
          extractedData = this.extractSyllabusData();
          break;
        case 'files':
          // PHASE 1.2: File information extraction
          extractedData = this.extractFilesData();
          break;
        case 'discussions':
          // PHASE 1.2: Discussion extraction with thread structure
          extractedData = this.extractDiscussionsData();
          break;
        default:
          extractedData = this.extractGenericData();
      }

      this.extractedData = extractedData;

      const rawResult = {
        pageType: pageType,
        data: extractedData,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };

      // Process data through pipeline if processor is available
      if (processor) {
        console.log('Processing extracted data through pipeline...');
        const processedResult = await processor.processData(extractedData, pageType);
        return processedResult;
      }

      // Return raw data if no processor
      return rawResult;

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
      '.ic-DashboardCard',
      '.new-course-card-selector' // Add new selector if needed
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
      '.ic-DashboardCard__action-container',
      '.new-announcement-selector' // Add new selector if needed
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
   * Extract assignments from the course assignments page
   */
  extractAssignmentsData() {
    console.log('Extracting assignments data...');

    const data = {
      type: 'assignments',
      courseId: null,
      courseName: '',
      items: []
    };

    // Course ID from URL
    const idMatch = window.location.pathname.match(/\/courses\/(\d+)/);
    if (idMatch) {
      data.courseId = idMatch[1];
    }

    // Try to read course name from breadcrumbs/header
    const courseNameSelectors = [
      '#breadcrumbs .ellipsible',
      '.ic-app-course-menu .ic-app-course-menu__header',
      '.course-title',
      'h1'
    ];
    for (const selector of courseNameSelectors) {
      const el = this.safeQuery(selector);
      if (el && this.safeTextContent(el)) {
        data.courseName = this.safeTextContent(el);
        break;
      }
    }

    // Candidate selectors for assignment rows/items (Canvas varies by theme)
    const rowSelectors = [
      '.ig-list .ig-row',
      '.assignment-group .assignment',
      'li.assignment',
      '.AssignmentList__Assignment',
      'tr.assignment',
      '.new-assignment-row-selector' // Add new selector if needed
    ];

    let rows = [];
    for (const selector of rowSelectors) {
      rows = this.safeQueryAll(selector);
      if (rows.length > 0) {
        console.log(`Found ${rows.length} assignment rows using selector: ${selector}`);
        break;
      }
    }

    // Helper to parse due date text to ISO
    const parseDue = (text) => {
      if (!text) return '';
      try {
        const d = new Date(text);
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch {}
      return String(text).trim();
    };

    // Extract fields from each row
    data.items = rows.map((row) => {
      // Title and URL
      const link = this.safeQuery('a[href*="/assignments/"]', row) || this.safeQuery('a', row);
      const title = this.safeTextContent(link) || this.safeTextContent(this.safeQuery('.title, h3, h4', row));
      const url = this.safeAttribute(link, 'href');

      // ID from URL
      let id = '';
      const idMatchLocal = url ? url.match(/\/assignments\/(\d+)/) : null;
      if (idMatchLocal) id = idMatchLocal[1];

      // Due date
      const dueEl = this.safeQuery('.due, .ig-details .due, [data-testid="assignment-date"], time', row);
      const dueText = this.safeTextContent(dueEl) || this.safeAttribute(dueEl, 'datetime');
      const dueDate = parseDue(dueText);

      // Points
      const pointsEl = this.safeQuery('.points, .assignment-points, [data-testid="assignment-points"]', row);
      let points = 0;
      const ptsText = this.safeTextContent(pointsEl);
      if (ptsText) {
        const m = ptsText.match(/(\d+(?:\.\d+)?)\s*pts?/i);
        if (m) points = Number(m[1]);
      }

      // Status
      const statusEl = this.safeQuery('.status, .submission-status, [data-testid="submission-status"]', row);
      const status = this.safeTextContent(statusEl);

      // Group/Section name
      let group = '';
      const groupContainer = row.closest('.assignment-group') || row.closest('.ig-header') || null;
      if (groupContainer) {
        const gEl = this.safeQuery('.assignment-group-name, .ig-header-title, h3, h4', groupContainer);
        group = this.safeTextContent(gEl);
      }

      return {
        id,
        title,
        url,
        dueDate,
        points,
        status,
        group
      };
    }).filter(item => item.title);

    console.log('Assignments extraction completed:', { count: data.items.length, courseId: data.courseId });
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

          // PHASE 1.2: Enhanced content extraction for announcements
          let content = this.safeTextContent(contentElement);
          let enhancedContent = null;
          
          if (contentElement) {
            enhancedContent = this.extractEnhancedHTMLContent(contentElement, {
              preserveFormatting: true,
              extractLinks: true,
              extractImages: true,
              extractTables: false
            });
            content = enhancedContent.text;
          }

          const announcementData = {
            title: this.safeTextContent(titleElement),
            content: content,
            date: this.safeTextContent(dateElement) || this.safeAttribute(dateElement, 'datetime'),
            author: this.safeTextContent(authorElement)
          };
          
          // Add enhanced content metadata if available
          if (enhancedContent) {
            announcementData.wordCount = enhancedContent.metadata.wordCount;
            announcementData.links = enhancedContent.metadata.links;
            announcementData.images = enhancedContent.metadata.images;
          }
          
          return announcementData;
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

// ============ PHASE 1.2: ENHANCED CONTENT EXTRACTION METHODS ============

/**
 * Enhanced HTML content extraction with deep text parsing
 */
CanvasDataExtractor.prototype.extractEnhancedHTMLContent = function(element, options = {}) {
  if (!element) return { text: '', structure: null, metadata: {} };
  
  const {
    preserveFormatting = true,
    extractLinks = true,
    extractImages = true,
    extractTables = true,
    maxDepth = 10
  } = options;
  
  console.log('🔍 Extracting enhanced HTML content...');
  
  const result = {
    text: '',
    structure: {},
    metadata: {
      wordCount: 0,
      links: [],
      images: [],
      tables: [],
      headings: [],
      lists: [],
      extractedAt: new Date().toISOString()
    }
  };
  
  try {
    // Extract clean text content
    result.text = this.extractCleanText(element, preserveFormatting);
    result.metadata.wordCount = result.text.split(/\s+/).filter(word => word.length > 0).length;
    
    // Extract structural elements
    if (extractLinks) {
      result.metadata.links = this.extractLinks(element);
    }
    
    if (extractImages) {
      result.metadata.images = this.extractImages(element);
    }
    
    if (extractTables) {
      result.metadata.tables = this.extractTables(element);
    }
    
    // Extract headings and structure
    result.metadata.headings = this.extractHeadings(element);
    result.metadata.lists = this.extractLists(element);
    
    console.log(`✅ Enhanced content extracted: ${result.metadata.wordCount} words, ${result.metadata.links.length} links, ${result.metadata.images.length} images`);
    
  } catch (error) {
    console.error('❌ Enhanced HTML extraction failed:', error);
    result.text = element.textContent || '';
  }
  
  return result;
};

/**
 * Extract clean, readable text while preserving important formatting
 */
CanvasDataExtractor.prototype.extractCleanText = function(element, preserveFormatting = true) {
  if (!element) return '';
  
  // Clone element to avoid modifying original
  const clone = element.cloneNode(true);
  
  // Remove script and style elements
  const unwantedElements = clone.querySelectorAll('script, style, noscript, iframe');
  unwantedElements.forEach(el => el.remove());
  
  if (preserveFormatting) {
    // Convert block elements to add line breaks
    const blockElements = clone.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6, li, br');
    blockElements.forEach(el => {
      if (el.tagName === 'BR') {
        el.textContent = '\n';
      } else {
        el.textContent = el.textContent + '\n';
      }
    });
    
    // Convert lists to formatted text
    const lists = clone.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const items = list.querySelectorAll('li');
      items.forEach((item, index) => {
        const prefix = list.tagName === 'OL' ? `${index + 1}. ` : '• ';
        item.textContent = prefix + item.textContent.trim() + '\n';
      });
    });
  }
  
  return clone.textContent
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

/**
 * Extract all links with metadata
 */
CanvasDataExtractor.prototype.extractLinks = function(element) {
  const links = [];
  const linkElements = element.querySelectorAll('a[href]');
  
  linkElements.forEach(link => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    
    if (href && text) {
      links.push({
        url: href,
        text: text,
        title: link.getAttribute('title') || '',
        isExternal: href.startsWith('http') && !href.includes(window.location.hostname),
        isCanvasLink: href.includes('/courses/') || href.includes('/assignments/') || href.includes('/files/')
      });
    }
  });
  
  return links;
};

/**
 * Extract images with metadata
 */
CanvasDataExtractor.prototype.extractImages = function(element) {
  const images = [];
  const imageElements = element.querySelectorAll('img');
  
  imageElements.forEach(img => {
    const src = img.getAttribute('src');
    const alt = img.getAttribute('alt') || '';
    
    if (src) {
      images.push({
        src: src,
        alt: alt,
        title: img.getAttribute('title') || '',
        width: img.naturalWidth || img.getAttribute('width'),
        height: img.naturalHeight || img.getAttribute('height')
      });
    }
  });
  
  return images;
};

/**
 * Extract table data with structure
 */
CanvasDataExtractor.prototype.extractTables = function(element) {
  const tables = [];
  const tableElements = element.querySelectorAll('table');
  
  tableElements.forEach(table => {
    const tableData = {
      headers: [],
      rows: [],
      caption: ''
    };
    
    // Extract caption
    const caption = table.querySelector('caption');
    if (caption) {
      tableData.caption = caption.textContent.trim();
    }
    
    // Extract headers
    const headerCells = table.querySelectorAll('thead th, tr:first-child th');
    headerCells.forEach(th => {
      tableData.headers.push(th.textContent.trim());
    });
    
    // Extract rows
    const rows = table.querySelectorAll('tbody tr, tr');
    rows.forEach((row, index) => {
      // Skip header row if no thead
      if (index === 0 && !table.querySelector('thead') && row.querySelector('th')) {
        return;
      }
      
      const rowData = [];
      const cells = row.querySelectorAll('td, th');
      cells.forEach(cell => {
        rowData.push(cell.textContent.trim());
      });
      
      if (rowData.length > 0) {
        tableData.rows.push(rowData);
      }
    });
    
    tables.push(tableData);
  });
  
  return tables;
};

/**
 * Extract heading hierarchy
 */
CanvasDataExtractor.prototype.extractHeadings = function(element) {
  const headings = [];
  const headingElements = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  headingElements.forEach(heading => {
    headings.push({
      level: parseInt(heading.tagName.charAt(1)),
      text: heading.textContent.trim(),
      id: heading.getAttribute('id') || ''
    });
  });
  
  return headings;
};

/**
 * Extract list structures
 */
CanvasDataExtractor.prototype.extractLists = function(element) {
  const lists = [];
  const listElements = element.querySelectorAll('ul, ol');
  
  listElements.forEach(list => {
    const listData = {
      type: list.tagName.toLowerCase(),
      items: []
    };
    
    const items = list.querySelectorAll('li');
    items.forEach(item => {
      listData.items.push(item.textContent.trim());
    });
    
    lists.push(listData);
  });
  
  return lists;
};

/**
 * PHASE 1.2: Extract Canvas file information and prepare for text extraction
 */
CanvasDataExtractor.prototype.extractFilesData = function() {
  console.log('🗂️ Extracting Canvas files data...');
  
  const files = [];
  
  // Look for file links in various contexts
  const fileSelectors = [
    'a[href*="/files/"]',
    'a[href*="/courses/"][href*="/files/"]',
    '.file_list a',
    '.files a',
    '.attachment a',
    'a.instructure_file_link',
    'a[href$=".pdf"]',
    'a[href$=".doc"]',
    'a[href$=".docx"]',
    'a[href$=".ppt"]',
    'a[href$=".pptx"]',
    'a[href$=".txt"]'
  ];
  
  fileSelectors.forEach(selector => {
    const fileElements = this.safeQueryAll(selector);
    
    fileElements.forEach(fileElement => {
      const href = fileElement.getAttribute('href');
      const fileName = fileElement.textContent.trim() || 
                      fileElement.getAttribute('title') || 
                      href?.split('/').pop() || '';
      
      if (href && fileName) {
        const fileInfo = {
          name: fileName,
          url: href,
          type: this.getFileType(fileName, href),
          size: this.extractFileSize(fileElement),
          downloadable: this.isDownloadableFile(href),
          extractable: this.isExtractableFile(fileName),
          context: this.getFileContext(fileElement)
        };
        
        files.push(fileInfo);
      }
    });
  });
  
  console.log(`✅ Found ${files.length} files for potential extraction`);
  return { files, type: 'files' };
};

/**
 * Determine file type from name or URL
 */
CanvasDataExtractor.prototype.getFileType = function(fileName, url) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const typeMap = {
    'pdf': 'pdf',
    'doc': 'word',
    'docx': 'word',
    'ppt': 'powerpoint',
    'pptx': 'powerpoint',
    'txt': 'text',
    'rtf': 'text',
    'html': 'html',
    'htm': 'html',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image'
  };
  
  return typeMap[extension] || 'unknown';
};

/**
 * Extract file size information if available
 */
CanvasDataExtractor.prototype.extractFileSize = function(fileElement) {
  // Look for size information in nearby elements
  const sizeSelectors = [
    '.file-size',
    '.size',
    '.file_size'
  ];
  
  for (const selector of sizeSelectors) {
    const sizeElement = fileElement.parentElement?.querySelector(selector) || 
                       fileElement.querySelector(selector);
    if (sizeElement) {
      return sizeElement.textContent.trim();
    }
  }
  
  return null;
};

/**
 * Check if file can be downloaded directly
 */
CanvasDataExtractor.prototype.isDownloadableFile = function(url) {
  return url.includes('/files/') || 
         url.includes('download') ||
         /\.(pdf|doc|docx|txt|rtf)$/i.test(url);
};

/**
 * Check if file type supports text extraction
 */
CanvasDataExtractor.prototype.isExtractableFile = function(fileName) {
  const extractableTypes = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'html', 'htm'];
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return extractableTypes.includes(extension);
};

/**
 * Get context information about where the file was found
 */
CanvasDataExtractor.prototype.getFileContext = function(fileElement) {
  // Try to determine the context (syllabus, assignment, module, etc.)
  const contextElements = fileElement.closest('.module-item, .assignment, .syllabus, .content');
  
  if (contextElements) {
    const contextTitle = contextElements.querySelector('h1, h2, h3, .title, .name');
    if (contextTitle) {
      return contextTitle.textContent.trim();
    }
  }
  
  return 'general';
};

/**
 * PHASE 1.2: Deep syllabus extraction with assignment parsing
 */
CanvasDataExtractor.prototype.extractSyllabusData = function() {
  console.log('📋 Deep extracting syllabus data...');
  
  const syllabusData = {
    type: 'syllabus',
    content: '',
    structure: {},
    assignments: [],
    schedule: [],
    policies: {},
    readings: [],
    metadata: {}
  };
  
  // Find the main syllabus content area
  const syllabusSelectors = [
    '.syllabus_course_summary',
    '.user_content',
    '.course-syllabus',
    '.syllabus-content',
    '#course_syllabus',
    '.show-content'
  ];
  
  let syllabusElement = null;
  for (const selector of syllabusSelectors) {
    syllabusElement = this.safeQuery(selector);
    if (syllabusElement) break;
  }
  
  if (syllabusElement) {
    // Extract enhanced HTML content
    const enhancedContent = this.extractEnhancedHTMLContent(syllabusElement, {
      preserveFormatting: true,
      extractLinks: true,
      extractImages: true,
      extractTables: true
    });
    
    syllabusData.content = enhancedContent.text;
    syllabusData.structure = enhancedContent.structure;
    syllabusData.metadata = enhancedContent.metadata;
    
    // Extract assignments from syllabus content
    syllabusData.assignments = this.extractAssignmentsFromText(enhancedContent.text);
    
    // Extract schedule information
    syllabusData.schedule = this.extractScheduleFromContent(syllabusElement, enhancedContent);
    
    // Extract reading assignments
    syllabusData.readings = this.extractReadingsFromText(enhancedContent.text);
    
    // Extract course policies
    syllabusData.policies = this.extractPoliciesFromText(enhancedContent.text);
  }
  
  console.log(`✅ Syllabus extraction complete: ${syllabusData.assignments.length} assignments, ${syllabusData.readings.length} readings`);
  return syllabusData;
};

/**
 * Extract assignment information from text content
 */
CanvasDataExtractor.prototype.extractAssignmentsFromText = function(text) {
  const assignments = [];
  
  // Look for assignment patterns in text
  const assignmentPatterns = [
    /(?:assignment|homework|hw|paper|essay|project|quiz|exam|test|midterm|final)[\s\d]*[:\-]?\s*(.+?)(?:due|deadline|submit)[\s\w]*?(\d{1,2}\/\d{1,2}\/?\d{0,4}|\w+\s+\d{1,2})/gi,
    /due\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)[:\-]?\s*(.+?)(?:\n|\.)/gi,
    /(\d{1,2}\/\d{1,2}\/?\d{0,4})[:\-]\s*(.+?)(?:assignment|homework|hw|paper|essay|project|quiz|exam)/gi
  ];
  
  assignmentPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      assignments.push({
        title: match[1] || match[2] || 'Unknown Assignment',
        dueDate: match[2] || match[1] || null,
        type: this.classifyAssignmentType(match[0]),
        source: 'syllabus'
      });
    }
  });
  
  return assignments;
};

/**
 * Extract reading assignments from text
 */
CanvasDataExtractor.prototype.extractReadingsFromText = function(text) {
  const readings = [];
  
  // Look for reading patterns
  const readingPatterns = [
    /read[ing]*\s*[:\-]?\s*(.+?)(?:\n|\.|\,)/gi,
    /chapter\s+(\d+)[:\-]?\s*(.+?)(?:\n|\.)/gi,
    /pages?\s+(\d+[\-–]\d+)[:\-]?\s*(.+?)(?:\n|\.)/gi
  ];
  
  readingPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      readings.push({
        text: match[0].trim(),
        reference: match[1] || match[2] || '',
        type: 'reading'
      });
    }
  });
  
  return readings;
};

/**
 * Classify assignment type from text
 */
CanvasDataExtractor.prototype.classifyAssignmentType = function(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('quiz')) return 'quiz';
  if (lowerText.includes('exam') || lowerText.includes('test')) return 'exam';
  if (lowerText.includes('paper') || lowerText.includes('essay')) return 'paper';
  if (lowerText.includes('project')) return 'project';
  if (lowerText.includes('homework') || lowerText.includes('hw')) return 'homework';
  if (lowerText.includes('assignment')) return 'assignment';
  
  return 'other';
};

/**
 * Extract schedule information from syllabus
 */
CanvasDataExtractor.prototype.extractScheduleFromContent = function(element, enhancedContent) {
  const schedule = [];
  
  // Look for tables that might contain schedule information
  if (enhancedContent.metadata.tables) {
    enhancedContent.metadata.tables.forEach(table => {
      if (this.isScheduleTable(table)) {
        table.rows.forEach(row => {
          if (row.length >= 2) {
            schedule.push({
              date: row[0],
              topic: row[1],
              reading: row[2] || null,
              assignment: row[3] || null
            });
          }
        });
      }
    });
  }
  
  return schedule;
};

/**
 * Check if a table contains schedule information
 */
CanvasDataExtractor.prototype.isScheduleTable = function(table) {
  const headers = table.headers.map(h => h.toLowerCase());
  const scheduleKeywords = ['date', 'week', 'topic', 'reading', 'assignment', 'due'];
  
  return scheduleKeywords.some(keyword => 
    headers.some(header => header.includes(keyword))
  );
};

/**
 * Extract course policies from text
 */
CanvasDataExtractor.prototype.extractPoliciesFromText = function(text) {
  const policies = {};
  
  // Look for common policy sections
  const policyPatterns = {
    attendance: /attendance[:\-]?\s*(.+?)(?:\n\n|\n[A-Z])/gi,
    grading: /grading[:\-]?\s*(.+?)(?:\n\n|\n[A-Z])/gi,
    late: /late\s+work[:\-]?\s*(.+?)(?:\n\n|\n[A-Z])/gi,
    academic: /academic\s+integrity[:\-]?\s*(.+?)(?:\n\n|\n[A-Z])/gi
  };
  
  Object.keys(policyPatterns).forEach(policyType => {
    const match = policyPatterns[policyType].exec(text);
    if (match) {
      policies[policyType] = match[1].trim();
    }
  });
  
  return policies;
};

/**
 * PHASE 1.2: Extract discussion data with thread structure preservation
 */
CanvasDataExtractor.prototype.extractDiscussionsData = function() {
  console.log('💬 Extracting discussion data with thread structure...');
  
  const discussionsData = {
    type: 'discussions',
    topics: [],
    posts: [],
    metadata: {
      totalTopics: 0,
      totalPosts: 0,
      totalReplies: 0,
      extractedAt: new Date().toISOString()
    }
  };
  
  // Extract discussion topics
  const topicSelectors = [
    '.discussion-topic',
    '.discussion_topic',
    '.discussion-list-item',
    '.discussion-row'
  ];
  
  topicSelectors.forEach(selector => {
    const topics = this.safeQueryAll(selector);
    topics.forEach(topicElement => {
      const topic = this.extractDiscussionTopic(topicElement);
      if (topic) {
        discussionsData.topics.push(topic);
      }
    });
  });
  
  // Extract individual discussion posts and replies
  const postSelectors = [
    '.discussion-entry',
    '.discussion_entry',
    '.discussion-post',
    '.message'
  ];
  
  postSelectors.forEach(selector => {
    const posts = this.safeQueryAll(selector);
    posts.forEach(postElement => {
      const post = this.extractDiscussionPost(postElement);
      if (post) {
        discussionsData.posts.push(post);
      }
    });
  });
  
  // Update metadata
  discussionsData.metadata.totalTopics = discussionsData.topics.length;
  discussionsData.metadata.totalPosts = discussionsData.posts.filter(p => !p.isReply).length;
  discussionsData.metadata.totalReplies = discussionsData.posts.filter(p => p.isReply).length;
  
  console.log(`✅ Discussion extraction complete: ${discussionsData.metadata.totalTopics} topics, ${discussionsData.metadata.totalPosts} posts, ${discussionsData.metadata.totalReplies} replies`);
  return discussionsData;
};

/**
 * Extract individual discussion topic information
 */
CanvasDataExtractor.prototype.extractDiscussionTopic = function(topicElement) {
  const titleElement = this.safeQuery('.discussion-title, .title, h3, h4', topicElement);
  const authorElement = this.safeQuery('.author, .discussion-author, .user-name', topicElement);
  const dateElement = this.safeQuery('.date, .created-at, .posted-at', topicElement);
  const replyCountElement = this.safeQuery('.reply-count, .replies', topicElement);
  
  const title = this.safeTextContent(titleElement);
  if (!title) return null;
  
  return {
    title: title,
    author: this.safeTextContent(authorElement),
    date: this.safeTextContent(dateElement) || this.safeAttribute(dateElement, 'datetime'),
    replyCount: parseInt(this.safeTextContent(replyCountElement)) || 0,
    url: this.safeAttribute(this.safeQuery('a', topicElement), 'href'),
    type: 'topic'
  };
};

/**
 * Extract individual discussion post with enhanced content
 */
CanvasDataExtractor.prototype.extractDiscussionPost = function(postElement) {
  const authorElement = this.safeQuery('.author, .discussion-author, .user-name', postElement);
  const dateElement = this.safeQuery('.date, .created-at, .posted-at', postElement);
  const contentElement = this.safeQuery('.message, .user_content, .discussion-text', postElement);
  
  const author = this.safeTextContent(authorElement);
  if (!author && !contentElement) return null;
  
  // Extract enhanced content
  let content = '';
  let enhancedContent = null;
  
  if (contentElement) {
    enhancedContent = this.extractEnhancedHTMLContent(contentElement, {
      preserveFormatting: true,
      extractLinks: true,
      extractImages: true,
      extractTables: true
    });
    content = enhancedContent.text;
  }
  
  // Determine if this is a reply based on DOM structure
  const isReply = postElement.closest('.replies, .discussion-replies') !== null ||
                  postElement.classList.contains('reply') ||
                  postElement.classList.contains('discussion-reply');
  
  const postData = {
    author: author,
    content: content,
    date: this.safeTextContent(dateElement) || this.safeAttribute(dateElement, 'datetime'),
    isReply: isReply,
    threadLevel: this.getThreadLevel(postElement),
    type: 'post'
  };
  
  // Add enhanced content metadata
  if (enhancedContent) {
    postData.wordCount = enhancedContent.metadata.wordCount;
    postData.links = enhancedContent.metadata.links;
    postData.images = enhancedContent.metadata.images;
  }
  
  return postData;
};

/**
 * Determine the thread level (nesting depth) of a discussion post
 */
CanvasDataExtractor.prototype.getThreadLevel = function(postElement) {
  let level = 0;
  let parent = postElement.parentElement;
  
  while (parent && level < 10) { // Prevent infinite loops
    if (parent.classList.contains('replies') || 
        parent.classList.contains('discussion-replies') ||
        parent.classList.contains('nested-discussion')) {
      level++;
    }
    parent = parent.parentElement;
  }
  
  return level;
};

// Phase 1.2 Enhanced Content Extraction - Thu Aug 29 2025
