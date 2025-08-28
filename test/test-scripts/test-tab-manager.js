// Test script for Tab Manager functionality
// Run this to validate that ghost tabs are working correctly

console.log('🧪 Starting Tab Manager Test...');

// Test 1: Basic ghost tab creation
async function testBasicGhostTab() {
  console.log('\n📋 Test 1: Basic Ghost Tab Creation');

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'CREATE_GHOST_TAB',
      data: {
        url: 'https://httpbin.org/html',
        purpose: 'basic-test'
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Runtime error:', chrome.runtime.lastError);
        resolve(false);
        return;
      }

      if (response && response.success) {
        console.log('✅ Ghost tab created successfully:', response.tabId);

        // Clean up the test tab
        chrome.runtime.sendMessage({
          action: 'CLOSE_GHOST_TAB',
          data: { tabId: response.tabId }
        }, () => {
          console.log('🧹 Test tab cleaned up');
          resolve(true);
        });
      } else {
        console.error('❌ Failed to create ghost tab:', response?.error);
        resolve(false);
      }
    });
  });
}

// Test 2: Tab statistics
async function testTabStats() {
  console.log('\n📊 Test 2: Tab Statistics');

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'GET_TAB_STATS'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Runtime error:', chrome.runtime.lastError);
        resolve(false);
        return;
      }

      if (response && response.success) {
        console.log('✅ Tab stats retrieved:');
        console.log('   - Active tabs:', response.stats.activeTabs);
        console.log('   - Queued requests:', response.stats.queuedRequests);
        console.log('   - Max concurrent:', response.stats.maxConcurrentTabs);
        console.log('   - Canvas tabs:', response.activeCanvasTabs.length);
        resolve(true);
      } else {
        console.error('❌ Failed to get tab stats:', response?.error);
        resolve(false);
      }
    });
  });
}

// Test 3: Execute function in tab
async function testTabExecution() {
  console.log('\n⚙️ Test 3: Tab Function Execution');

  return new Promise(async (resolve) => {
    // First create a tab
    const tabResponse = await new Promise((resolveTab) => {
      chrome.runtime.sendMessage({
        action: 'CREATE_GHOST_TAB',
        data: {
          url: 'https://httpbin.org/json',
          purpose: 'execution-test'
        }
      }, resolveTab);
    });

    if (!tabResponse.success) {
      console.error('❌ Failed to create tab for execution test');
      resolve(false);
      return;
    }

    const tabId = tabResponse.tabId;

    // Wait a moment for page to load
    setTimeout(() => {
      // Execute a simple function in the tab
      chrome.runtime.sendMessage({
        action: 'EXECUTE_IN_TAB',
        data: {
          tabId: tabId,
          extractor: () => {
            // Simple extractor that gets page title and some basic info
            return {
              title: document.title,
              url: window.location.href,
              hasBody: !!document.body,
              timestamp: new Date().toISOString()
            };
          }
        }
      }, (execResponse) => {
        if (execResponse && execResponse.success) {
          console.log('✅ Function executed successfully:');
          console.log('   - Title:', execResponse.result.title);
          console.log('   - URL:', execResponse.result.url);
          console.log('   - Has body:', execResponse.result.hasBody);

          // Clean up
          chrome.runtime.sendMessage({
            action: 'CLOSE_GHOST_TAB',
            data: { tabId }
          }, () => {
            console.log('🧹 Execution test tab cleaned up');
            resolve(true);
          });
        } else {
          console.error('❌ Function execution failed:', execResponse?.error);

          // Clean up even on error
          chrome.runtime.sendMessage({
            action: 'CLOSE_GHOST_TAB',
            data: { tabId }
          }, () => resolve(false));
        }
      });
    }, 2000); // Wait 2 seconds for page load
  });
}

// Test 4: Canvas page simulation
async function testCanvasPageSimulation() {
  console.log('\n🎓 Test 4: Canvas Page Simulation');

  return new Promise((resolve) => {
    // Create a tab with a simulated Canvas-like page
    chrome.runtime.sendMessage({
      action: 'CREATE_GHOST_TAB',
      data: {
        url: 'https://httpbin.org/html', // Simple HTML page
        purpose: 'canvas-simulation'
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Runtime error:', chrome.runtime.lastError);
        resolve(false);
        return;
      }

      if (response && response.success) {
        const tabId = response.tabId;
        console.log('✅ Canvas simulation tab created:', tabId);

        // Simulate Canvas data extraction
        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: 'EXECUTE_IN_TAB',
            data: {
              tabId: tabId,
              extractor: () => {
                // Simulate extracting Canvas-like data
                const canvasData = {
                  isCanvasPage: true,
                  pageType: 'dashboard',
                  courseName: 'Test Course',
                  assignments: [
                    { name: 'Test Assignment', dueDate: '2024-01-01' }
                  ],
                  userName: 'Test User',
                  extractedAt: new Date().toISOString()
                };
                return canvasData;
              }
            }
          }, (extractResponse) => {
            if (extractResponse && extractResponse.success) {
              console.log('✅ Canvas data extracted:');
              console.log('   - Page type:', extractResponse.result.pageType);
              console.log('   - Course:', extractResponse.result.courseName);
              console.log('   - User:', extractResponse.result.userName);
              console.log('   - Assignments:', extractResponse.result.assignments.length);

              // Clean up
              chrome.runtime.sendMessage({
                action: 'CLOSE_GHOST_TAB',
                data: { tabId }
              }, () => {
                console.log('🧹 Canvas simulation tab cleaned up');
                resolve(true);
              });
            } else {
              console.error('❌ Canvas extraction failed:', extractResponse?.error);
              resolve(false);
            }
          });
        }, 2000);
      } else {
        console.error('❌ Failed to create Canvas simulation tab');
        resolve(false);
      }
    });
  });
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Canvas LMS Assistant - Tab Manager Test Suite');
  console.log('================================================');

  const results = {
    basicGhostTab: false,
    tabStats: false,
    tabExecution: false,
    canvasSimulation: false
  };

  // Run tests sequentially
  results.basicGhostTab = await testBasicGhostTab();
  await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause

  results.tabStats = await testTabStats();
  await new Promise(resolve => setTimeout(resolve, 1000));

  results.tabExecution = await testTabExecution();
  await new Promise(resolve => setTimeout(resolve, 2000)); // Longer pause for execution test

  results.canvasSimulation = await testCanvasSimulation();

  // Final results
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('========================');

  const tests = [
    { name: 'Basic Ghost Tab', result: results.basicGhostTab },
    { name: 'Tab Statistics', result: results.tabStats },
    { name: 'Tab Execution', result: results.tabExecution },
    { name: 'Canvas Simulation', result: results.canvasSimulation }
  ];

  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.name}: ${status}`);
  });

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 All tests passed! Tab Manager is working correctly.');
    console.log('🚀 Ready to proceed with Phase 3.1 (DOM Scraping Foundation)');
  } else {
    console.log('⚠️ Some tests failed. Check the output above for details.');
    console.log('🔧 You may need to troubleshoot before proceeding.');
  }

  return results;
}

// Auto-run tests when script is loaded
console.log('⏳ Loading test suite...');

// Add a small delay to ensure extension is fully loaded
setTimeout(() => {
  runAllTests();
}, 1000);

// Export for manual testing
if (typeof window !== 'undefined') {
  window.runTabManagerTests = runAllTests;
}
