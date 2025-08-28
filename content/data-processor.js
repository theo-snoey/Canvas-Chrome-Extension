// Canvas LMS Data Processing Pipeline
// Phase 3.3: Data normalization, validation, storage, and caching

console.log('Canvas Data Processor loading...');

/**
 * Canvas Data Processing Pipeline
 * Handles normalization, validation, storage, and caching of extracted Canvas data
 */
class CanvasDataProcessor {
  constructor() {
    this.cache = new Map();
    this.storagePrefix = 'canvas_data_';
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    console.log('CanvasDataProcessor initialized');
  }

  /**
   * Process and normalize extracted Canvas data
   */
  async processData(rawData, pageType) {
    console.log('Processing Canvas data:', { pageType, rawData });

    try {
      // 1. Validate input data
      const validatedData = this.validateData(rawData, pageType);
      
      // 2. Normalize data structure
      const normalizedData = this.normalizeData(validatedData, pageType);
      
      // 3. Clean and sanitize data
      const cleanedData = this.cleanData(normalizedData);
      
      // 4. Add metadata
      const processedData = this.addMetadata(cleanedData, pageType);
      
      // 5. Cache the processed data
      await this.cacheData(processedData, pageType);
      
      // 6. Store in local storage
      await this.storeData(processedData, pageType);
      
      console.log('Data processing completed:', processedData);
      return processedData;
      
    } catch (error) {
      console.error('Data processing failed:', error);
      return this.createErrorData(error, pageType);
    }
  }

  /**
   * Validate extracted data structure and content
   */
  validateData(data, pageType) {
    console.log('Validating data for page type:', pageType);
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data: must be an object');
    }

    const validatedData = { ...data };

    switch (pageType) {
      case 'dashboard':
        validatedData.courses = this.validateCourses(data.courses || []);
        validatedData.announcements = this.validateAnnouncements(data.announcements || []);
        break;
        
      case 'course':
        validatedData.courseInfo = this.validateCourseInfo(data.courseInfo || {});
        validatedData.navigation = this.validateNavigation(data.navigation || []);
        validatedData.announcements = this.validateAnnouncements(data.announcements || []);
        validatedData.instructor = this.validateInstructor(data.instructor || {});
        validatedData.stats = this.validateStats(data.stats || {});
        break;
        
      default:
        // Generic validation for unknown page types
        break;
    }

    return validatedData;
  }

  /**
   * Validate course data
   */
  validateCourses(courses) {
    if (!Array.isArray(courses)) return [];
    
    return courses.filter(course => {
      return course && 
             typeof course === 'object' && 
             course.name && 
             typeof course.name === 'string' && 
             course.name.trim().length > 0;
    }).map(course => ({
      name: String(course.name).trim(),
      code: course.code ? String(course.code).trim() : '',
      url: course.url ? String(course.url).trim() : '',
      id: course.id ? String(course.id).trim() : ''
    }));
  }

  /**
   * Validate course information
   */
  validateCourseInfo(courseInfo) {
    const validated = {};
    
    if (courseInfo.name && typeof courseInfo.name === 'string') {
      validated.name = courseInfo.name.trim();
    }
    
    if (courseInfo.code && typeof courseInfo.code === 'string') {
      validated.code = courseInfo.code.trim();
    }
    
    if (courseInfo.id) {
      validated.id = String(courseInfo.id).trim();
    }
    
    if (courseInfo.term && typeof courseInfo.term === 'string') {
      validated.term = courseInfo.term.trim();
    }
    
    return validated;
  }

  /**
   * Validate navigation data
   */
  validateNavigation(navigation) {
    if (!Array.isArray(navigation)) return [];
    
    return navigation.filter(nav => {
      return nav && 
             typeof nav === 'object' && 
             nav.text && 
             typeof nav.text === 'string' && 
             nav.text.trim().length > 0;
    }).map(nav => ({
      text: String(nav.text).trim(),
      url: nav.url ? String(nav.url).trim() : '',
      active: Boolean(nav.active),
      icon: nav.icon ? String(nav.icon).trim() : ''
    }));
  }

  /**
   * Validate announcements data
   */
  validateAnnouncements(announcements) {
    if (!Array.isArray(announcements)) return [];
    
    return announcements.filter(announcement => {
      return announcement && 
             typeof announcement === 'object' && 
             announcement.title && 
             typeof announcement.title === 'string';
    }).map(announcement => ({
      title: String(announcement.title).trim(),
      content: announcement.content ? String(announcement.content).trim() : '',
      date: announcement.date ? String(announcement.date).trim() : '',
      author: announcement.author ? String(announcement.author).trim() : ''
    }));
  }

  /**
   * Validate instructor data
   */
  validateInstructor(instructor) {
    const validated = {};
    
    if (instructor.name && typeof instructor.name === 'string') {
      validated.name = instructor.name.trim();
    }
    
    if (instructor.email && typeof instructor.email === 'string') {
      validated.email = instructor.email.trim();
    }
    
    if (instructor.avatar && typeof instructor.avatar === 'string') {
      validated.avatar = instructor.avatar.trim();
    }
    
    return validated;
  }

  /**
   * Validate stats data
   */
  validateStats(stats) {
    const validated = {};
    
    if (stats.studentCount && !isNaN(stats.studentCount)) {
      validated.studentCount = parseInt(stats.studentCount);
    }
    
    if (stats.status && typeof stats.status === 'string') {
      validated.status = stats.status.trim();
    }
    
    return validated;
  }

  /**
   * Normalize data structure across different page types
   */
  normalizeData(data, pageType) {
    console.log('Normalizing data structure');
    
    const normalized = {
      type: pageType,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      data: { ...data }
    };

    // Add common normalized fields
    if (pageType === 'dashboard') {
      normalized.summary = {
        courseCount: data.courses ? data.courses.length : 0,
        announcementCount: data.announcements ? data.announcements.length : 0
      };
    } else if (pageType === 'course') {
      normalized.summary = {
        navigationCount: data.navigation ? data.navigation.length : 0,
        announcementCount: data.announcements ? data.announcements.length : 0,
        hasInstructor: Boolean(data.instructor && data.instructor.name)
      };
    }

    return normalized;
  }

  /**
   * Clean and sanitize data
   */
  cleanData(data) {
    console.log('Cleaning and sanitizing data');
    
    // Remove HTML tags from text content
    const cleanedData = JSON.parse(JSON.stringify(data));
    this.cleanHtmlFromObject(cleanedData);
    
    // Remove empty strings and null values
    this.removeEmptyValues(cleanedData);
    
    return cleanedData;
  }

  /**
   * Remove HTML tags from string values in object
   */
  cleanHtmlFromObject(obj) {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove HTML tags but preserve basic formatting
        obj[key] = obj[key]
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.cleanHtmlFromObject(obj[key]);
      }
    }
  }

  /**
   * Remove empty values from object
   */
  removeEmptyValues(obj) {
    for (const key in obj) {
      if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      } else if (Array.isArray(obj[key])) {
        obj[key] = obj[key].filter(item => item !== '' && item !== null && item !== undefined);
        if (obj[key].length === 0) {
          delete obj[key];
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.removeEmptyValues(obj[key]);
        if (Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }
    }
  }

  /**
   * Add processing metadata
   */
  addMetadata(data, pageType) {
    console.log('Adding metadata to processed data');
    
    return {
      ...data,
      metadata: {
        processedAt: new Date().toISOString(),
        processingVersion: '1.0.0',
        pageType: pageType,
        userAgent: navigator.userAgent,
        canvasVersion: this.detectCanvasVersion(),
        dataQuality: this.assessDataQuality(data)
      }
    };
  }

  /**
   * Detect Canvas version from page
   */
  detectCanvasVersion() {
    // Try to detect Canvas version from various sources
    const metaTag = document.querySelector('meta[name="canvas-version"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }
    
    // Fallback to unknown
    return 'unknown';
  }

  /**
   * Assess data quality score
   */
  assessDataQuality(data) {
    let score = 0;
    let maxScore = 0;
    
    if (data.type === 'dashboard') {
      maxScore = 100;
      if (data.data.courses && data.data.courses.length > 0) score += 50;
      if (data.data.announcements) score += 25;
      if (data.summary && data.summary.courseCount > 0) score += 25;
    } else if (data.type === 'course') {
      maxScore = 100;
      if (data.data.courseInfo && data.data.courseInfo.name) score += 30;
      if (data.data.navigation && data.data.navigation.length > 0) score += 40;
      if (data.data.instructor && data.data.instructor.name) score += 15;
      if (data.data.stats) score += 15;
    }
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Cache processed data in memory
   */
  async cacheData(data, pageType) {
    console.log('Caching processed data');
    
    const cacheKey = `${pageType}_${window.location.pathname}`;
    const cacheEntry = {
      data: data,
      timestamp: Date.now(),
      expires: Date.now() + this.cacheTimeout
    };
    
    this.cache.set(cacheKey, cacheEntry);
    
    // Clean expired entries
    this.cleanExpiredCache();
  }

  /**
   * Get cached data if available and not expired
   */
  getCachedData(pageType, path = window.location.pathname) {
    const cacheKey = `${pageType}_${path}`;
    const cacheEntry = this.cache.get(cacheKey);
    
    if (cacheEntry && cacheEntry.expires > Date.now()) {
      console.log('Returning cached data for:', cacheKey);
      return cacheEntry.data;
    }
    
    return null;
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Store processed data in Chrome local storage
   */
  async storeData(data, pageType) {
    console.log('Storing processed data in local storage');
    
    try {
      const storageKey = `${this.storagePrefix}${pageType}_${Date.now()}`;
      const storageData = {
        ...data,
        storageKey: storageKey
      };
      
      // Store current data
      await chrome.storage.local.set({
        [storageKey]: storageData,
        [`${this.storagePrefix}latest_${pageType}`]: storageData
      });
      
      // Clean old storage entries (keep last 10)
      await this.cleanOldStorageEntries(pageType);
      
    } catch (error) {
      console.error('Failed to store data:', error);
    }
  }

  /**
   * Clean old storage entries to prevent storage bloat
   */
  async cleanOldStorageEntries(pageType) {
    try {
      const result = await chrome.storage.local.get(null);
      const entries = Object.keys(result)
        .filter(key => key.startsWith(`${this.storagePrefix}${pageType}_`))
        .sort()
        .reverse();
      
      // Keep only the latest 10 entries
      const entriesToRemove = entries.slice(10);
      
      if (entriesToRemove.length > 0) {
        await chrome.storage.local.remove(entriesToRemove);
        console.log(`Cleaned ${entriesToRemove.length} old storage entries`);
      }
    } catch (error) {
      console.error('Failed to clean old storage entries:', error);
    }
  }

  /**
   * Get stored data from Chrome local storage
   */
  async getStoredData(pageType) {
    try {
      const result = await chrome.storage.local.get(`${this.storagePrefix}latest_${pageType}`);
      return result[`${this.storagePrefix}latest_${pageType}`] || null;
    } catch (error) {
      console.error('Failed to get stored data:', error);
      return null;
    }
  }

  /**
   * Create error data structure
   */
  createErrorData(error, pageType) {
    return {
      type: pageType,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title,
      error: {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      data: {},
      metadata: {
        processedAt: new Date().toISOString(),
        processingVersion: '1.0.0',
        pageType: pageType,
        dataQuality: 0
      }
    };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheEntries: Array.from(this.cache.keys()),
      cacheTimeout: this.cacheTimeout,
      storagePrefix: this.storagePrefix
    };
  }
}

// Make CanvasDataProcessor available globally
window.CanvasDataProcessor = CanvasDataProcessor;

console.log('Canvas Data Processor loaded successfully');
console.log('CanvasDataProcessor class available:', typeof CanvasDataProcessor);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasDataProcessor;
}

// Force reload Wed Aug 28 23:21:31 PDT 2025
