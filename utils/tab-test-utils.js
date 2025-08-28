// Canvas LMS Assistant - Tab Manager Test Utilities
// Helper functions for testing tab manager functionality

/**
 * Test ghost tab creation and basic functionality
 */
async function testGhostTabCreation() {
  console.log('Testing ghost tab creation...');

  try {
    // Create a test ghost tab
    const tabId = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'CREATE_GHOST_TAB',
        data: {
          url: 'https://example.com',
          purpose: 'test'
        }
      }, (response) => {
        if (response.success) {
          resolve(response.tabId);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    console.log('✅ Ghost tab created successfully:', tabId);

    // Test tab stats
    const stats = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'GET_TAB_STATS'
      }, (response) => {
        if (response.success) {
          resolve(response.stats);
        } else {
          reject(new Error(response.error));
        }
      });
    });

    console.log('📊 Tab stats:', stats);

    // Clean up test tab
    await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'CLOSE_GHOST_TAB',
        data: { tabId }
      }, (response) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });

    console.log('🧹 Test tab cleaned up successfully');
    return true;

  } catch (error) {
    console.error('❌ Ghost tab test failed:', error);
    return false;
  }
}

/**
 * Test tab queue functionality with multiple concurrent requests
 */
async function testTabQueue() {
  console.log('Testing tab queue functionality...');

  const testUrls = [
    'https://httpbin.org/delay/1',
    'https://httpbin.org/delay/1',
    'https://httpbin.org/delay/1',
    'https://httpbin.org/delay/1',
    'https://httpbin.org/delay/1'
  ];

  try {
    // Create multiple tab requests simultaneously
    const promises = testUrls.map((url, index) =>
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'CREATE_GHOST_TAB',
          data: {
            url: url,
            purpose: `queue-test-${index}`
          }
        }, (response) => {
          if (response.success) {
            resolve(response.tabId);
          } else {
            reject(new Error(response.error));
          }
        });
      })
    );

    const tabIds = await Promise.all(promises);
    console.log('✅ All queued tabs created:', tabIds);

    // Clean up all test tabs
    const cleanupPromises = tabIds.map(tabId =>
      new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'CLOSE_GHOST_TAB',
          data: { tabId }
        }, (response) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error(response.error));
          }
        });
      })
    );

    await Promise.all(cleanupPromises);
    console.log('🧹 All test tabs cleaned up');

    return true;

  } catch (error) {
    console.error('❌ Tab queue test failed:', error);
    return false;
  }
}

/**
 * Run all tab manager tests
 */
async function runAllTabTests() {
  console.log('🚀 Starting Tab Manager Tests...');

  const results = {
    ghostTabCreation: false,
    tabQueue: false
  };

  // Test ghost tab creation
  results.ghostTabCreation = await testGhostTabCreation();

  // Wait a moment before next test
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test tab queue
  results.tabQueue = await testTabQueue();

  // Summary
  console.log('📋 Test Results Summary:');
  console.log('Ghost Tab Creation:', results.ghostTabCreation ? '✅ PASS' : '❌ FAIL');
  console.log('Tab Queue:', results.tabQueue ? '✅ PASS' : '❌ FAIL');

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`Overall: ${passedTests}/${totalTests} tests passed`);

  return results;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testGhostTabCreation,
    testTabQueue,
    runAllTabTests
  };
}
