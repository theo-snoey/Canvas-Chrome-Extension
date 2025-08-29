// Test Extension Loading and Chat Window Opening
console.log('🧪 Testing Extension Loading and Chat Window...');

// Test 1: Check if background script is responding
console.log('🔍 Test 1: Checking background script connection...');

chrome.runtime.sendMessage({ action: 'GET_AUTONOMOUS_STATS' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Background script is responding');
      console.log('📊 Autonomous stats:', response.stats);
      
      // Test 2: Try to open chat window
      console.log('\n🔍 Test 2: Attempting to open chat window...');
      
      return chrome.runtime.sendMessage({ action: 'OPEN_CHAT_WINDOW' });
    } else {
      throw new Error('Background script not responding');
    }
  })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Chat window opened successfully!');
      console.log('🪟 Window ID:', response.windowId);
    } else {
      console.log('❌ Failed to open chat window:', response);
    }
  })
  .catch(error => {
    console.error('❌ Extension test failed:', error);
    
    // Check if it's a context invalidation error
    if (error.message && error.message.includes('context invalidated')) {
      console.log('🔄 Extension context was invalidated - please reload the extension');
      console.log('📍 Go to chrome://extensions/ and click the refresh button');
    }
  });

// Test 3: Check if alarms are set up
console.log('\n🔍 Test 3: Checking alarm setup...');

chrome.alarms.getAll()
  .then(alarms => {
    console.log(`⏰ Found ${alarms.length} active alarms:`);
    alarms.forEach(alarm => {
      console.log(`   📅 ${alarm.name}: next at ${new Date(alarm.scheduledTime)}`);
    });
    
    if (alarms.length === 0) {
      console.log('⚠️ No alarms found - autonomous system may not be running');
    } else {
      console.log('✅ Alarm system is active');
    }
  })
  .catch(error => {
    console.error('❌ Failed to check alarms:', error);
  });

console.log('\n🚀 Extension loading test completed!');
console.log('📋 If you see errors above, the extension needs to be reloaded');
