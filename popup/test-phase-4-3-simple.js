// Simple test for Phase 4.3 Authentication Management
console.log('🔐 Testing Phase 4.3: Authentication Management');

// Test 1: Get authentication status
console.log('\n=== Authentication Status ===');
chrome.runtime.sendMessage({ action: 'GET_AUTH_STATUS' }, response => {
  if (response && response.success) {
    console.log('✅ Auth Status:', response.authStatus);
    console.log('   🔐 Authenticated:', response.authStatus.isAuthenticated);
    console.log('   🌐 Domain:', response.authStatus.domain || 'None');
    console.log('   ❌ Failures:', response.authStatus.consecutiveFailures);
    console.log('   📚 Supported Domains:', response.authStatus.supportedDomains.length);
    console.log('   👤 User Domains:', response.authStatus.userDomains.length);
  } else {
    console.error('❌ Auth status failed:', response);
  }
});

// Test 2: Force authentication check
console.log('\n=== Force Auth Check ===');
chrome.runtime.sendMessage({ action: 'FORCE_AUTH_CHECK' }, response => {
  if (response && response.success) {
    console.log('✅ Force check completed');
    console.log('   🔐 Result:', response.authStatus.isAuthenticated ? 'Authenticated' : 'Not Authenticated');
    console.log('   🌐 Domain:', response.authStatus.domain || 'None');
  } else {
    console.error('❌ Force check failed:', response);
  }
});

// Test 3: Get auth events
console.log('\n=== Auth Events ===');
chrome.runtime.sendMessage({ action: 'GET_AUTH_EVENTS' }, response => {
  if (response && response.success) {
    console.log('✅ Found', response.events.length, 'auth events');
    if (response.events.length > 0) {
      console.log('   📝 Recent:', response.events.slice(-3).map(e => 
        `${e.type} on ${e.domain || 'unknown'} at ${e.timestamp}`
      ));
    }
  } else {
    console.error('❌ Auth events failed:', response);
  }
});

console.log('\n🎯 Phase 4.3 test commands sent!');
console.log('💡 Check Service Worker console for detailed auth logs');
console.log('🔍 Look for enhanced session check messages');
