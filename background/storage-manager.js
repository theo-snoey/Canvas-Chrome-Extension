// Canvas LMS Advanced Storage & Caching Manager
// Phase 4.4: Comprehensive data schema, efficient storage, compression, and query optimization

class CanvasStorageManager {
  constructor() {
    this.STORAGE_VERSION = '1.0.0';
    this.MAX_STORAGE_SIZE = 50 * 1024 * 1024; // 50MB limit
    this.COMPRESSION_THRESHOLD = 1024; // Compress data > 1KB
    this.CACHE_TTL = {
      dashboard: 5 * 60 * 1000,      // 5 minutes
      courses: 10 * 60 * 1000,       // 10 minutes
      assignments: 15 * 60 * 1000,   // 15 minutes
      grades: 30 * 60 * 1000,        // 30 minutes
      announcements: 60 * 60 * 1000, // 1 hour
      syllabus: 24 * 60 * 60 * 1000, // 24 hours
      calendar: 60 * 60 * 1000,      // 1 hour
      discussions: 30 * 60 * 1000,   // 30 minutes
      modules: 2 * 60 * 60 * 1000,   // 2 hours
      files: 60 * 60 * 1000,         // 1 hour
      todo: 5 * 60 * 1000            // 5 minutes
    };

    // Data schema definitions
    this.SCHEMA = {
      // Core Canvas entities
      semester: {
        id: 'string',
        name: 'string',
        startDate: 'date',
        endDate: 'date',
        courses: 'array',
        lastUpdated: 'timestamp',
        totalTasks: 'number',
        avgQuality: 'number'
      },
      course: {
        id: 'string',
        name: 'string',
        code: 'string',
        term: 'string',
        instructor: 'object',
        enrollmentType: 'string',
        url: 'string',
        color: 'string',
        lastAccessed: 'timestamp',
        isPublished: 'boolean'
      },
      assignment: {
        id: 'string',
        courseId: 'string',
        name: 'string',
        description: 'string',
        dueDate: 'date',
        submissionTypes: 'array',
        points: 'number',
        isSubmitted: 'boolean',
        grade: 'object',
        rubric: 'object'
      },
      grade: {
        assignmentId: 'string',
        courseId: 'string',
        score: 'number',
        grade: 'string',
        comments: 'array',
        gradedAt: 'timestamp',
        isExcused: 'boolean'
      },
      announcement: {
        id: 'string',
        courseId: 'string',
        title: 'string',
        message: 'string',
        author: 'object',
        postedAt: 'timestamp',
        isRead: 'boolean'
      },
      discussion: {
        id: 'string',
        courseId: 'string',
        title: 'string',
        message: 'string',
        author: 'object',
        replies: 'array',
        isLocked: 'boolean',
        isPinned: 'boolean'
      },
      todo: {
        id: 'string',
        courseId: 'string',
        title: 'string',
        type: 'string', // assignment, quiz, discussion, etc.
        dueDate: 'date',
        courseName: 'string',
        url: 'string',
        isCompleted: 'boolean',
        priority: 'string',
        points: 'number'
      },
      calendar: {
        id: 'string',
        title: 'string',
        type: 'string', // assignment, event, etc.
        startDate: 'date',
        endDate: 'date',
        courseId: 'string',
        courseName: 'string',
        description: 'string',
        url: 'string',
        allDay: 'boolean'
      },
      'grades-summary': {
        courseId: 'string',
        courseName: 'string',
        currentGrade: 'string',
        currentScore: 'number',
        totalPoints: 'number',
        earnedPoints: 'number',
        gradingPeriod: 'string',
        lastUpdated: 'timestamp'
      },
      'course-home': {
        courseId: 'string',
        courseName: 'string',
        announcements: 'array',
        recentActivity: 'array',
        upcomingEvents: 'array',
        extractedAt: 'timestamp'
      },
      'course-assignments': {
        courseId: 'string',
        assignments: 'array',
        extractedAt: 'timestamp'
      },
      'course-grades': {
        courseId: 'string',
        grades: 'array',
        overallGrade: 'object',
        extractedAt: 'timestamp'
      },
      'course-announcements': {
        courseId: 'string',
        announcements: 'array',
        extractedAt: 'timestamp'
      },
      'course-discussions': {
        courseId: 'string',
        discussions: 'array',
        extractedAt: 'timestamp'
      },
      'course-modules': {
        courseId: 'string',
        modules: 'array',
        extractedAt: 'timestamp'
      },
      'course-syllabus': {
        courseId: 'string',
        syllabus: 'string',
        extractedAt: 'timestamp'
      },
      'course-files': {
        courseId: 'string',
        files: 'array',
        extractedAt: 'timestamp'
      },
      dashboard: {
        courses: 'array',
        recentActivity: 'array',
        upcomingEvents: 'array',
        extractedAt: 'timestamp'
      },
      'courses-list': {
        courses: 'array',
        extractedAt: 'timestamp'
      },
      module: {
        id: 'string',
        courseId: 'string',
        name: 'string',
        items: 'array',
        prerequisiteIds: 'array',
        isPublished: 'boolean',
        position: 'number'
      },
      file: {
        id: 'string',
        courseId: 'string',
        name: 'string',
        url: 'string',
        size: 'number',
        contentType: 'string',
        modifiedAt: 'timestamp',
        folderId: 'string'
      },
      calendarEvent: {
        id: 'string',
        title: 'string',
        description: 'string',
        startDate: 'date',
        endDate: 'date',
        contextType: 'string',
        contextId: 'string',
        isAllDay: 'boolean'
      },
      todoItem: {
        id: 'string',
        type: 'string',
        title: 'string',
        courseId: 'string',
        dueDate: 'date',
        isCompleted: 'boolean',
        priority: 'string'
      }
    };

    this.cache = new Map();
    this.compressionWorker = null;
    this.initializeStorage();
  }

  async initializeStorage() {
    console.log('🗄️ Initializing Canvas Storage Manager...');
    
    // Initialize storage structure
    const storageStructure = {
      version: this.STORAGE_VERSION,
      metadata: {
        createdAt: new Date().toISOString(),
        lastCleanup: new Date().toISOString(),
        totalSize: 0,
        compressionEnabled: true
      },
      indexes: {
        courses: {},
        assignments: {},
        grades: {},
        announcements: {},
        discussions: {},
        modules: {},
        files: {},
        calendar: {},
        todo: {}
      },
      freshness: {},
      queryCache: {}
    };

    try {
      const existing = await chrome.storage.local.get(['canvasStorage']);
      if (!existing.canvasStorage) {
        await chrome.storage.local.set({ canvasStorage: storageStructure });
        console.log('✅ Storage structure initialized');
      } else {
        console.log('📂 Existing storage structure found');
        await this.migrateStorageIfNeeded(existing.canvasStorage);
      }
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
    }
  }

  async migrateStorageIfNeeded(existingStorage) {
    if (existingStorage.version !== this.STORAGE_VERSION) {
      console.log(`🔄 Migrating storage from ${existingStorage.version} to ${this.STORAGE_VERSION}`);
      // Add migration logic here if needed
      existingStorage.version = this.STORAGE_VERSION;
      await chrome.storage.local.set({ canvasStorage: existingStorage });
    }
  }

  // Comprehensive data storage with schema validation
  async storeData(dataType, data, options = {}) {
    const startTime = Date.now();
    console.log(`💾 Storing ${dataType} data...`);
    console.log(`🔍 Raw data structure for ${dataType}:`, JSON.stringify(data, null, 2));

    try {
      // Validate data against schema
      const validatedData = this.validateData(dataType, data);
      
      // Add metadata
      const enrichedData = {
        ...validatedData,
        _metadata: {
          dataType,
          storedAt: new Date().toISOString(),
          version: options.version || 1,
          quality: options.quality || 0,
          source: options.source || 'autonomous',
          compressed: false
        }
      };

      // Compress if data is large
      let finalData = enrichedData;
      if (this.shouldCompress(enrichedData)) {
        finalData = await this.compressData(enrichedData);
      }

      // Store with efficient key structure
      const storageKey = this.generateStorageKey(dataType, options.id);
      await chrome.storage.local.set({ [storageKey]: finalData });

      // Update indexes and freshness tracking
      await this.updateIndexes(dataType, options.id || 'default', finalData);
      await this.updateFreshness(dataType, options.id || 'default');

      // Cache in memory for fast access
      this.cache.set(storageKey, {
        data: finalData,
        cachedAt: Date.now(),
        ttl: this.CACHE_TTL[dataType] || 300000 // 5min default
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Stored ${dataType} data in ${duration}ms (compressed: ${finalData._metadata?.compressed})`);

      return {
        success: true,
        key: storageKey,
        compressed: finalData._metadata?.compressed || false,
        size: JSON.stringify(finalData).length,
        duration
      };

    } catch (error) {
      console.error(`❌ Failed to store ${dataType} data:`, error);
      return { success: false, error: error.message };
    }
  }

  // Optimized data retrieval with caching
  async getData(dataType, id = 'default', options = {}) {
    const startTime = Date.now();
    const storageKey = this.generateStorageKey(dataType, id);

    try {
      // Check memory cache first
      if (!options.bypassCache && this.cache.has(storageKey)) {
        const cached = this.cache.get(storageKey);
        if (Date.now() - cached.cachedAt < cached.ttl) {
          console.log(`⚡ Cache hit for ${dataType} (${Date.now() - startTime}ms)`);
          return {
            success: true,
            data: cached.data,
            fromCache: true,
            fresh: await this.isDataFresh(dataType, id)
          };
        } else {
          this.cache.delete(storageKey);
        }
      }

      // Retrieve from storage
      const result = await chrome.storage.local.get([storageKey]);
      const storedData = result[storageKey];

      if (!storedData) {
        return { success: false, error: 'Data not found' };
      }

      // Decompress if needed
      let finalData = storedData;
      if (storedData._metadata?.compressed) {
        finalData = await this.decompressData(storedData);
      }

      // Update cache
      this.cache.set(storageKey, {
        data: finalData,
        cachedAt: Date.now(),
        ttl: this.CACHE_TTL[dataType] || 300000
      });

      const duration = Date.now() - startTime;
      console.log(`📖 Retrieved ${dataType} data in ${duration}ms`);

      return {
        success: true,
        data: finalData,
        fromCache: false,
        fresh: await this.isDataFresh(dataType, id),
        duration
      };

    } catch (error) {
      console.error(`❌ Failed to retrieve ${dataType} data:`, error);
      return { success: false, error: error.message };
    }
  }

  // Advanced querying with optimization
  async queryData(query) {
    const startTime = Date.now();
    console.log('🔍 Executing optimized query:', query);

    try {
      const queryHash = this.hashQuery(query);
      
      // Check query cache
      if (this.cache.has(`query_${queryHash}`)) {
        const cached = this.cache.get(`query_${queryHash}`);
        if (Date.now() - cached.cachedAt < 60000) { // 1min cache for queries
          console.log(`⚡ Query cache hit (${Date.now() - startTime}ms)`);
          return { success: true, data: cached.data, fromCache: true };
        }
      }

      let results = [];

      switch (query.type) {
        case 'courses':
          results = await this.queryCourses(query);
          break;
        case 'assignments':
          results = await this.queryAssignments(query);
          break;
        case 'grades':
          results = await this.queryGrades(query);
          break;
        case 'upcoming':
          results = await this.queryUpcoming(query);
          break;
        case 'search':
          results = await this.searchContent(query);
          break;
        default:
          throw new Error(`Unsupported query type: ${query.type}`);
      }

      // Cache query results
      this.cache.set(`query_${queryHash}`, {
        data: results,
        cachedAt: Date.now(),
        ttl: 60000
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Query completed in ${duration}ms (${results.length} results)`);

      return { success: true, data: results, duration };

    } catch (error) {
      console.error('❌ Query failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Data compression utilities
  shouldCompress(data) {
    const size = JSON.stringify(data).length;
    return size > this.COMPRESSION_THRESHOLD;
  }

  async compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Simple compression using built-in compression
      const compressed = await this.simpleCompress(jsonString);
      
      return {
        ...data,
        _metadata: {
          ...data._metadata,
          compressed: true,
          originalSize: jsonString.length,
          compressedSize: compressed.length
        },
        _compressed: compressed
      };
    } catch (error) {
      console.warn('⚠️ Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  async decompressData(compressedData) {
    try {
      if (!compressedData._metadata?.compressed) {
        return compressedData;
      }

      const decompressed = await this.simpleDecompress(compressedData._compressed);
      const originalData = JSON.parse(decompressed);
      
      return {
        ...originalData,
        _metadata: {
          ...originalData._metadata,
          compressed: false
        }
      };
    } catch (error) {
      console.error('❌ Decompression failed:', error);
      return compressedData;
    }
  }

  // Simple compression implementation
  async simpleCompress(text) {
    // Basic compression using TextEncoder/TextDecoder with gzip-like approach
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // For now, return base64 encoded (in real implementation, use proper compression)
    return btoa(String.fromCharCode(...data));
  }

  async simpleDecompress(compressed) {
    try {
      const binaryString = atob(compressed);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch (error) {
      throw new Error(`Decompression failed: ${error.message}`);
    }
  }

  // Data validation against schema
  validateData(dataType, data) {
    const schema = this.SCHEMA[dataType];
    if (!schema) {
      console.warn(`⚠️ No schema found for ${dataType}, storing as-is`);
      return data;
    }

    // Handle null or undefined data
    if (data === null || data === undefined) {
      console.warn(`⚠️ Null/undefined data for ${dataType}, using empty object`);
      return {};
    }

    // Handle arrays - validate each item
    if (Array.isArray(data)) {
      console.log(`📋 Validating array of ${data.length} items for ${dataType}`);
      return data.map((item, index) => {
        try {
          return this.validateSingleItem(item, schema, `${dataType}[${index}]`);
        } catch (error) {
          console.warn(`⚠️ Failed to validate item ${index} in ${dataType}:`, error);
          return item; // Keep original if validation fails
        }
      });
    }

    // Handle single object
    if (typeof data === 'object') {
      return this.validateSingleItem(data, schema, dataType);
    }

    console.warn(`⚠️ Unexpected data type for ${dataType}:`, typeof data);
    return data;
  }

  validateSingleItem(item, schema, itemName) {
    if (!item || typeof item !== 'object') {
      console.warn(`⚠️ Invalid item for ${itemName}, using empty object`);
      return {};
    }

    const validated = { ...item };
    
    // Validate each field according to schema
    for (const [field, type] of Object.entries(schema)) {
      if (item[field] !== undefined && item[field] !== null) {
        try {
          validated[field] = this.validateField(item[field], type);
        } catch (error) {
          console.warn(`⚠️ Failed to validate field ${field} for ${itemName}:`, error);
          validated[field] = item[field]; // Keep original value
        }
      }
    }

    return validated;
  }

  validateField(value, expectedType) {
    // Handle null/undefined values
    if (value === null || value === undefined) {
      switch (expectedType) {
        case 'string':
          return '';
        case 'number':
          return 0;
        case 'boolean':
          return false;
        case 'array':
          return [];
        case 'object':
          return {};
        case 'date':
          return new Date();
        case 'timestamp':
          return new Date().toISOString();
        default:
          return null;
      }
    }

    switch (expectedType) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        return Boolean(value);
      case 'date':
        try {
          const date = value instanceof Date ? value : new Date(value);
          return isNaN(date.getTime()) ? new Date() : date;
        } catch {
          return new Date();
        }
      case 'timestamp':
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return new Date(value).toISOString();
        return new Date().toISOString();
      case 'array':
        return Array.isArray(value) ? value : [];
      case 'object':
        return typeof value === 'object' && value !== null ? value : {};
      default:
        return value;
    }
  }

  // Storage key generation
  generateStorageKey(dataType, id) {
    return `canvas_${dataType}_${id}`;
  }

  // Index management
  async updateIndexes(dataType, id, data) {
    try {
      const storage = await chrome.storage.local.get(['canvasStorage']);
      const canvasStorage = storage.canvasStorage || {};
      
      if (!canvasStorage.indexes) canvasStorage.indexes = {};
      if (!canvasStorage.indexes[dataType]) canvasStorage.indexes[dataType] = {};
      
      canvasStorage.indexes[dataType][id] = {
        key: this.generateStorageKey(dataType, id),
        updatedAt: new Date().toISOString(),
        size: JSON.stringify(data).length,
        quality: data._metadata?.quality || 0
      };

      await chrome.storage.local.set({ canvasStorage });
    } catch (error) {
      console.error('❌ Failed to update indexes:', error);
    }
  }

  // Freshness tracking
  async updateFreshness(dataType, id) {
    try {
      const storage = await chrome.storage.local.get(['canvasStorage']);
      const canvasStorage = storage.canvasStorage || {};
      
      if (!canvasStorage.freshness) canvasStorage.freshness = {};
      
      canvasStorage.freshness[`${dataType}_${id}`] = {
        lastUpdated: new Date().toISOString(),
        ttl: this.CACHE_TTL[dataType] || 300000
      };

      await chrome.storage.local.set({ canvasStorage });
    } catch (error) {
      console.error('❌ Failed to update freshness:', error);
    }
  }

  async isDataFresh(dataType, id) {
    try {
      const storage = await chrome.storage.local.get(['canvasStorage']);
      const freshness = storage.canvasStorage?.freshness?.[`${dataType}_${id}`];
      
      if (!freshness) return false;
      
      const age = Date.now() - new Date(freshness.lastUpdated).getTime();
      return age < freshness.ttl;
    } catch (error) {
      console.error('❌ Failed to check freshness:', error);
      return false;
    }
  }

  // Query implementations
  async queryCourses(query) {
    const courses = [];
    const storage = await chrome.storage.local.get();
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('canvas_courses_') || key.startsWith('canvas_dashboard_')) {
        if (value?.courses) {
          courses.push(...value.courses);
        }
      }
    }

    return this.applyFilters(courses, query.filters);
  }

  async queryAssignments(query) {
    const assignments = [];
    const storage = await chrome.storage.local.get();
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('canvas_assignments_')) {
        if (value?.assignments) {
          assignments.push(...value.assignments);
        }
      }
    }

    return this.applyFilters(assignments, query.filters);
  }

  async queryGrades(query) {
    const grades = [];
    const storage = await chrome.storage.local.get();
    
    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('canvas_grades_')) {
        if (value?.grades) {
          grades.push(...value.grades);
        }
      }
    }

    return this.applyFilters(grades, query.filters);
  }

  async queryUpcoming(query) {
    const upcoming = [];
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get assignments and calendar events
    const assignments = await this.queryAssignments({ filters: {} });
    const calendar = await this.getData('calendar');

    // Filter for upcoming items
    assignments.forEach(assignment => {
      if (assignment.dueDate && new Date(assignment.dueDate) <= weekFromNow) {
        upcoming.push({
          type: 'assignment',
          ...assignment
        });
      }
    });

    if (calendar.success && calendar.data?.events) {
      calendar.data.events.forEach(event => {
        if (event.startDate && new Date(event.startDate) <= weekFromNow) {
          upcoming.push({
            type: 'event',
            ...event
          });
        }
      });
    }

    return upcoming.sort((a, b) => new Date(a.dueDate || a.startDate) - new Date(b.dueDate || b.startDate));
  }

  async searchContent(query) {
    const results = [];
    const searchTerm = query.term?.toLowerCase() || '';
    const storage = await chrome.storage.local.get();

    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('canvas_')) {
        const content = JSON.stringify(value).toLowerCase();
        if (content.includes(searchTerm)) {
          results.push({
            key,
            type: key.split('_')[1],
            relevance: this.calculateRelevance(content, searchTerm),
            data: value
          });
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  // Utility methods
  applyFilters(data, filters) {
    if (!filters) return data;

    return data.filter(item => {
      for (const [field, value] of Object.entries(filters)) {
        if (item[field] !== value) return false;
      }
      return true;
    });
  }

  calculateRelevance(content, term) {
    const occurrences = (content.match(new RegExp(term, 'g')) || []).length;
    return occurrences / content.length * 1000;
  }

  hashQuery(query) {
    return btoa(JSON.stringify(query)).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Storage management
  async getStorageStats() {
    try {
      const storage = await chrome.storage.local.get();
      const totalSize = JSON.stringify(storage).length;
      const canvasData = Object.keys(storage).filter(key => key.startsWith('canvas_'));
      
      return {
        totalSize,
        canvasDataKeys: canvasData.length,
        compressionRatio: this.calculateCompressionRatio(storage),
        cacheHitRate: this.calculateCacheHitRate(),
        oldestData: this.findOldestData(storage),
        largestData: this.findLargestData(storage)
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return null;
    }
  }

  calculateCompressionRatio(storage) {
    let totalOriginal = 0;
    let totalCompressed = 0;

    for (const value of Object.values(storage)) {
      if (value?._metadata?.compressed) {
        totalOriginal += value._metadata.originalSize || 0;
        totalCompressed += value._metadata.compressedSize || 0;
      }
    }

    return totalOriginal > 0 ? (totalCompressed / totalOriginal) : 1;
  }

  calculateCacheHitRate() {
    // This would be tracked over time in a real implementation
    return 0.75; // 75% cache hit rate example
  }

  findOldestData(storage) {
    let oldest = null;
    let oldestTime = Date.now();

    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('canvas_') && value?._metadata?.storedAt) {
        const time = new Date(value._metadata.storedAt).getTime();
        if (time < oldestTime) {
          oldestTime = time;
          oldest = key;
        }
      }
    }

    return oldest;
  }

  findLargestData(storage) {
    let largest = null;
    let largestSize = 0;

    for (const [key, value] of Object.entries(storage)) {
      if (key.startsWith('canvas_')) {
        const size = JSON.stringify(value).length;
        if (size > largestSize) {
          largestSize = size;
          largest = { key, size };
        }
      }
    }

    return largest;
  }

  // Cleanup and maintenance
  async cleanupOldData(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    console.log('🧹 Starting storage cleanup...');
    
    try {
      const storage = await chrome.storage.local.get();
      const toDelete = [];
      const cutoffTime = Date.now() - maxAge;

      for (const [key, value] of Object.entries(storage)) {
        if (key.startsWith('canvas_') && value?._metadata?.storedAt) {
          const storedTime = new Date(value._metadata.storedAt).getTime();
          if (storedTime < cutoffTime) {
            toDelete.push(key);
          }
        }
      }

      if (toDelete.length > 0) {
        await chrome.storage.local.remove(toDelete);
        console.log(`🗑️ Cleaned up ${toDelete.length} old data entries`);
      }

      // Clear memory cache
      this.cache.clear();
      console.log('🧹 Storage cleanup completed');

      return { deleted: toDelete.length };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return { error: error.message };
    }
  }
}

// Export for use in service worker
if (typeof window === 'undefined') {
  // Service worker environment
  globalThis.CanvasStorageManager = CanvasStorageManager;
} else {
  // Browser environment
  window.CanvasStorageManager = CanvasStorageManager;
}
