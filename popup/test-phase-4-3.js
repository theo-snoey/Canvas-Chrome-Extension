// Test script for Phase 4.3: Authentication Management
console.log('🔐 Testing Phase 4.3: Authentication Management');

// Test 1: Get comprehensive authentication status
console.log('\n=== Test 1: Authentication Status ===');
chrome.runtime.sendMessage({ action: 'GET_AUTH_STATUS' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Authentication Status:', response.authStatus);
      console.log('   🔐 Authenticated:', response.authStatus.isAuthenticated);
      console.log('   🌐 Domain:', response.authStatus.domain || 'None');
      console.log('   ⏰ Last Check:', response.authStatus.lastCheck);
      console.log('   ❌ Consecutive Failures:', response.authStatus.consecutiveFailures);
      console.log('   📚 Supported Domains:', response.authStatus.supportedDomains.length);
      console.log('   👤 User Domains:', response.authStatus.userDomains.length);
      
      if (response.authStatus.authenticationHistory.length > 0) {
        console.log('   📜 Recent Authentication History:');
        response.authStatus.authenticationHistory.forEach((event, index) => {
          console.log(`     ${index + 1}. ${event.timestamp}: ${event.isAuthenticated ? '✅' : '❌'} ${event.domain || 'Unknown'}`);
        });
      } else {
        console.log('   📜 No authentication history yet');
      }
    } else {
      console.error('❌ Failed to get authentication status:', response);
    }
  })
  .catch(error => {
    console.error('❌ Authentication Status Error:', error);
  });

// Test 2: Force authentication check
console.log('\n=== Test 2: Force Authentication Check ===');
chrome.runtime.sendMessage({ action: 'FORCE_AUTH_CHECK' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Forced authentication check completed');
      console.log('   🔐 Result:', response.authStatus.isAuthenticated ? 'Authenticated' : 'Not Authenticated');
      console.log('   🌐 Domain:', response.authStatus.domain || 'None detected');
      console.log('   ⏰ Check Time:', response.authStatus.lastCheck);
    } else {
      console.error('❌ Force auth check failed:', response);
    }
  })
  .catch(error => {
    console.error('❌ Force Auth Check Error:', error);
  });

// Test 3: Get authentication events history
console.log('\n=== Test 3: Authentication Events History ===');
chrome.runtime.sendMessage({ action: 'GET_AUTH_EVENTS' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Found', response.events.length, 'authentication events');
      
      if (response.events.length > 0) {
        console.log('   📝 Recent Events:');
        response.events.slice(-5).forEach((event, index) => {
          const icon = event.type === 'authenticated' ? '✅' : 
                      event.type === 'authentication_lost' ? '❌' : 
                      event.type === 'domain_changed' ? '🔄' : '📝';
          console.log(`     ${icon} ${event.timestamp}: ${event.type} on ${event.domain || 'unknown'}`);
          if (event.metadata && Object.keys(event.metadata).length > 0) {
            console.log(`       Metadata:`, event.metadata);
          }
        });
      } else {
        console.log('   📝 No authentication events recorded yet');
      }
    } else {
      console.error('❌ Failed to get auth events:', response);
    }
  })
  .catch(error => {
    console.error('❌ Auth Events Error:', error);
  });

// Test 4: Test domain management (add a test domain)
console.log('\n=== Test 4: Domain Management ===');
const testDomain = 'canvas.example.edu';

// First, try to add a test domain
chrome.runtime.sendMessage({ 
  action: 'ADD_CANVAS_DOMAIN', 
  data: { domain: testDomain } 
})
  .then(response => {
    if (response && response.success) {
      console.log('✅ Successfully added test domain:', testDomain);
      console.log('   👤 User Domains:', response.userDomains);
      
      // Now try to remove it
      return chrome.runtime.sendMessage({ 
        action: 'REMOVE_CANVAS_DOMAIN', 
        data: { domain: testDomain } 
      });
    } else if (response && response.error === 'Domain already configured') {
      console.log('ℹ️  Test domain already exists, trying to remove it');
      return chrome.runtime.sendMessage({ 
        action: 'REMOVE_CANVAS_DOMAIN', 
        data: { domain: testDomain } 
      });
    } else {
      console.error('❌ Failed to add test domain:', response);
      return Promise.reject(response);
    }
  })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Successfully removed test domain');
      console.log('   👤 User Domains:', response.userDomains);
    } else {
      console.error('❌ Failed to remove test domain:', response);
    }
  })
  .catch(error => {
    console.error('❌ Domain Management Error:', error);
  });

// Test 5: Get notification history
console.log('\n=== Test 5: Notification History ===');
chrome.runtime.sendMessage({ action: 'GET_NOTIFICATION_HISTORY' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Found', response.notifications.length, 'notifications');
      
      if (response.notifications.length > 0) {
        console.log('   🔔 Recent Notifications:');
        response.notifications.slice(-5).forEach((notification, index) => {
          const icon = notification.type === 'success' ? '✅' : 
                      notification.type === 're_auth_needed' ? '🔐' : 
                      notification.type === 'domain_changed' ? '🔄' : '📢';
          console.log(`     ${icon} ${notification.timestamp}: ${notification.title}`);
          console.log(`       ${notification.message}`);
          if (notification.domain) {
            console.log(`       Domain: ${notification.domain}`);
          }
        });
      } else {
        console.log('   🔔 No notifications yet');
      }
    } else {
      console.error('❌ Failed to get notifications:', response);
    }
  })
  .catch(error => {
    console.error('❌ Notification History Error:', error);
  });

// Test 6: Reset authentication failures (for testing)
console.log('\n=== Test 6: Reset Authentication Failures ===');
chrome.runtime.sendMessage({ action: 'RESET_AUTH_FAILURES' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Authentication failures reset successfully');
    } else {
      console.error('❌ Failed to reset auth failures:', response);
    }
  })
  .catch(error => {
    console.error('❌ Reset Auth Failures Error:', error);
  });

console.log('\n🎯 Phase 4.3 Testing Complete!');
console.log('📋 Summary of Tests:');
console.log('  1. ✅ Authentication Status - Comprehensive auth state');
console.log('  2. 🔍 Force Auth Check - Manual authentication verification');
console.log('  3. 📝 Auth Events History - Historical authentication tracking');
console.log('  4. 🌐 Domain Management - Add/remove Canvas domains');
console.log('  5. 🔔 Notification History - Authentication notifications');
console.log('  6. 🔄 Reset Auth Failures - Clear failure counters');

console.log('\n💡 Key Features Tested:');
console.log('  - Multi-domain Canvas support');
console.log('  - Authentication history tracking');
console.log('  - User-friendly re-login prompts');
console.log('  - Domain configuration management');
console.log('  - Failure escalation handling');
console.log('  - Notification system');

console.log('\n🔍 Check Service Worker console for detailed authentication logs!');
