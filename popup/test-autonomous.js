// Simple test for autonomous system in popup console
console.log('🧪 Testing Autonomous Background System...');

// Test with proper error handling
function testAutonomousSystem() {
  console.log('\n=== Test 1: GET_AUTONOMOUS_STATS ===');
  
  chrome.runtime.sendMessage({ action: 'GET_AUTONOMOUS_STATS' })
    .then(response => {
      if (response && response.success) {
        console.log('✅ Autonomous Stats:', response.stats);
        console.log('   - Autonomous enabled:', response.stats.autonomousEnabled);
        console.log('   - Session state:', response.stats.sessionState);
        console.log('   - Queue length:', response.stats.dataCollectionQueueLength);
        console.log('   - Retry queue:', response.stats.retryQueueLength);
      } else {
        console.error('❌ GET_AUTONOMOUS_STATS failed:', response);
      }
    })
    .catch(error => {
      console.error('❌ GET_AUTONOMOUS_STATS error:', error);
    });

  console.log('\n=== Test 2: CHECK_CANVAS_SESSION ===');
  
  chrome.runtime.sendMessage({ action: 'CHECK_CANVAS_SESSION' })
    .then(response => {
      if (response && response.success) {
        console.log('✅ Session Check:', response.sessionState);
        console.log('   - Authenticated:', response.sessionState.isAuthenticated);
        console.log('   - Domain:', response.sessionState.canvasDomain);
        console.log('   - Last check:', response.sessionState.lastCheck);
      } else {
        console.error('❌ CHECK_CANVAS_SESSION failed:', response);
      }
    })
    .catch(error => {
      console.error('❌ CHECK_CANVAS_SESSION error:', error);
    });

  console.log('\n=== Test 3: TRIGGER_AUTONOMOUS_SYNC ===');
  
  chrome.runtime.sendMessage({ action: 'TRIGGER_AUTONOMOUS_SYNC' })
    .then(response => {
      if (response && response.success) {
        console.log('✅ Manual sync triggered successfully');
      } else {
        console.error('❌ TRIGGER_AUTONOMOUS_SYNC failed:', response);
      }
    })
    .catch(error => {
      console.error('❌ TRIGGER_AUTONOMOUS_SYNC error:', error);
    });
}

// Run the test
testAutonomousSystem();

console.log('\n🎯 Test commands sent! Check results above.');
console.log('If you see errors, the background script might not be fully loaded.');
console.log('Try reloading the extension and running this again.');
