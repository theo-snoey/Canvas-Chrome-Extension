// Test Phase 4.4: Advanced Storage & Caching
console.log('🗄️ Testing Phase 4.4: Advanced Storage & Caching');

// Test 1: Get storage statistics
console.log('\n=== Storage Statistics ===');
chrome.runtime.sendMessage({ action: 'GET_STORAGE_STATS' }, response => {
  if (response && response.success) {
    console.log('✅ Storage Stats:', response.stats);
    console.log('   📊 Total Size:', response.stats.totalSize, 'bytes');
    console.log('   🗂️ Canvas Data Keys:', response.stats.canvasDataKeys);
    console.log('   🗜️ Compression Ratio:', (response.stats.compressionRatio * 100).toFixed(1) + '%');
    console.log('   ⚡ Cache Hit Rate:', (response.stats.cacheHitRate * 100).toFixed(1) + '%');
    console.log('   📅 Oldest Data:', response.stats.oldestData);
    console.log('   📈 Largest Data:', response.stats.largestData);
  } else {
    console.error('❌ Storage stats failed:', response);
  }
});

// Test 2: Query courses data
console.log('\n=== Query Courses Data ===');
chrome.runtime.sendMessage({ 
  action: 'QUERY_DATA', 
  query: { 
    type: 'courses', 
    filters: {} 
  } 
}, response => {
  if (response && response.success) {
    console.log('✅ Found', response.data.length, 'courses');
    if (response.data.length > 0) {
      console.log('   📚 Sample:', response.data.slice(0, 3).map(c => c.name || c.title));
    }
    console.log('   ⏱️ Query Time:', response.duration + 'ms');
    console.log('   💾 From Cache:', response.fromCache || false);
  } else {
    console.error('❌ Course query failed:', response);
  }
});

// Test 3: Query upcoming assignments
console.log('\n=== Query Upcoming Items ===');
chrome.runtime.sendMessage({ 
  action: 'QUERY_DATA', 
  query: { 
    type: 'upcoming', 
    filters: {} 
  } 
}, response => {
  if (response && response.success) {
    console.log('✅ Found', response.data.length, 'upcoming items');
    if (response.data.length > 0) {
      console.log('   📋 Sample:', response.data.slice(0, 3).map(item => ({
        type: item.type,
        title: item.title || item.name,
        due: item.dueDate || item.startDate
      })));
    }
    console.log('   ⏱️ Query Time:', response.duration + 'ms');
  } else {
    console.error('❌ Upcoming query failed:', response);
  }
});

// Test 4: Get advanced data with caching
console.log('\n=== Advanced Data Retrieval ===');
chrome.runtime.sendMessage({ 
  action: 'GET_ADVANCED_DATA', 
  data: { 
    dataType: 'dashboard', 
    id: 'default',
    options: { bypassCache: false }
  } 
}, response => {
  if (response && response.success) {
    console.log('✅ Retrieved dashboard data');
    console.log('   💾 From Cache:', response.fromCache);
    console.log('   🔄 Fresh:', response.fresh);
    console.log('   ⏱️ Duration:', response.duration + 'ms');
    console.log('   📊 Data Type:', response.data?._metadata?.dataType);
    console.log('   🗜️ Compressed:', response.data?._metadata?.compressed);
  } else {
    console.error('❌ Advanced data retrieval failed:', response);
  }
});

// Test 5: Search content
console.log('\n=== Content Search ===');
chrome.runtime.sendMessage({ 
  action: 'QUERY_DATA', 
  query: { 
    type: 'search', 
    term: 'assignment'
  } 
}, response => {
  if (response && response.success) {
    console.log('✅ Search found', response.data.length, 'results');
    if (response.data.length > 0) {
      console.log('   🔍 Top Results:', response.data.slice(0, 3).map(r => ({
        type: r.type,
        relevance: r.relevance.toFixed(2),
        key: r.key
      })));
    }
  } else {
    console.error('❌ Content search failed:', response);
  }
});

// Test 6: Test data compression
console.log('\n=== Data Compression Test ===');
const testData = {
  largeText: 'This is a test string that should be compressed when it gets large enough. '.repeat(50),
  numbers: Array.from({length: 100}, (_, i) => i),
  metadata: {
    created: new Date().toISOString(),
    version: 1,
    type: 'test'
  }
};

chrome.runtime.sendMessage({ 
  action: 'COMPRESS_DATA', 
  data: testData 
}, response => {
  if (response && response.success) {
    console.log('✅ Compression test completed');
    console.log('   📏 Original Size:', JSON.stringify(testData).length, 'bytes');
    console.log('   🗜️ Compressed:', response.compressed?._metadata?.compressed);
    if (response.compressed?._metadata?.compressed) {
      console.log('   📉 Compressed Size:', response.compressed._metadata.compressedSize, 'bytes');
      console.log('   💾 Compression Ratio:', 
        (response.compressed._metadata.compressedSize / response.compressed._metadata.originalSize * 100).toFixed(1) + '%');
    }
  } else {
    console.error('❌ Compression test failed:', response);
  }
});

// Test 7: Storage cleanup (dry run)
console.log('\n=== Storage Cleanup Test ===');
chrome.runtime.sendMessage({ 
  action: 'CLEANUP_STORAGE', 
  data: { 
    maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day for testing
  } 
}, response => {
  if (response && response.success) {
    console.log('✅ Storage cleanup completed');
    console.log('   🗑️ Deleted Entries:', response.result.deleted);
  } else {
    console.error('❌ Storage cleanup failed:', response);
  }
});

console.log('\n🎯 Phase 4.4 test commands sent!');
console.log('💡 Check Service Worker console for detailed storage logs');
console.log('🗄️ Look for advanced storage, compression, and caching messages');
