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
   * Get basic page information
   */
  getBasicPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
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
} catch (error) {
  console.error('❌ Data extractor test failed:', error);
}
