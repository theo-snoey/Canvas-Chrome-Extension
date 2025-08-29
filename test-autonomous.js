// Test script for Phase 4.1 Autonomous Background Collector
console.log('🚀 Testing Phase 4.1: Autonomous Background Collector');

// Test 1: Check if TabManager has autonomous features
console.log('Test 1: Checking TabManager autonomous features...');
if (window.tabManager) {
  console.log('✅ TabManager found');
  
  // Check autonomous properties
  console.log('Autonomous enabled:', window.tabManager.autonomousEnabled);
  console.log('Session state:', window.tabManager.sessionState);
  console.log('Data collection queue length:', window.tabManager.dataCollectionQueue?.length || 0);
  console.log('Retry queue size:', window.tabManager.retryQueue?.size || 0);
  
  // Test autonomous stats
  const stats = window.tabManager.getAutonomousStats();
  console.log('Autonomous stats:', stats);
} else {
  console.error('❌ TabManager not found');
}

// Test 2: Check message handlers
console.log('\nTest 2: Testing message handlers...');

// Test GET_AUTONOMOUS_STATS
chrome.runtime.sendMessage({ action: 'GET_AUTONOMOUS_STATS' }, response => {
  if (response.success) {
    console.log('✅ GET_AUTONOMOUS_STATS works:', response.stats);
  } else {
    console.error('❌ GET_AUTONOMOUS_STATS failed:', response);
  }
});

// Test CHECK_CANVAS_SESSION
chrome.runtime.sendMessage({ action: 'CHECK_CANVAS_SESSION' }, response => {
  if (response.success) {
    console.log('✅ CHECK_CANVAS_SESSION works:', response.sessionState);
  } else {
    console.error('❌ CHECK_CANVAS_SESSION failed:', response);
  }
});

// Test TRIGGER_AUTONOMOUS_SYNC
chrome.runtime.sendMessage({ action: 'TRIGGER_AUTONOMOUS_SYNC' }, response => {
  if (response.success) {
    console.log('✅ TRIGGER_AUTONOMOUS_SYNC works');
  } else {
    console.error('❌ TRIGGER_AUTONOMOUS_SYNC failed:', response);
  }
});

console.log('\n🎯 Phase 4.1 Testing Complete!');
console.log('Check the console for results and look for green ✅ messages.');
