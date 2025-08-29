// Test Phase 5.1: Universal Chat Interface
console.log('💬 Testing Phase 5.1: Universal Chat Interface');

// Test 1: Chat interface connection
console.log('\n=== Chat Interface Connection ===');
chrome.runtime.sendMessage({ 
  action: 'CHAT_INTERFACE_READY',
  data: { conversationId: 'test_conv_' + Date.now() }
}, response => {
  if (response && response.success) {
    console.log('✅ Chat interface connected successfully');
    console.log('   📝 Message:', response.message);
    console.log('   🔐 Canvas Status:', response.canvasStatus);
    console.log('   📊 Authenticated:', response.canvasStatus.isAuthenticated);
    console.log('   🌐 Domain:', response.canvasStatus.domain || 'None');
    console.log('   📋 Data Available:', response.canvasStatus.dataAvailable);
  } else {
    console.error('❌ Chat interface connection failed:', response);
  }
});

// Test 2: Open chat window
console.log('\n=== Chat Window Opening ===');
chrome.runtime.sendMessage({ action: 'OPEN_CHAT_WINDOW' }, response => {
  if (response && response.success) {
    console.log('✅ Chat window opened successfully');
    console.log('   🪟 Window ID:', response.windowId);
    console.log('   📝 Message:', response.message);
  } else {
    console.error('❌ Chat window opening failed:', response);
  }
});

// Test 3: Get chat context
console.log('\n=== Chat Context Data ===');
chrome.runtime.sendMessage({ action: 'GET_CHAT_CONTEXT' }, response => {
  if (response && response.success) {
    console.log('✅ Chat context retrieved');
    console.log('   🔐 Authentication:', response.context.authentication);
    console.log('   📊 Data Availability:', response.context.dataAvailability);
    console.log('   📅 Last Sync:', response.context.lastSync || 'Never');
    console.log('   📈 Data Quality:', response.context.dataQuality + '%');
  } else {
    console.error('❌ Chat context retrieval failed:', response);
  }
});

// Test 4: Process chat message (simple)
console.log('\n=== Chat Message Processing ===');
const testMessage = {
  id: 'msg_test_' + Date.now(),
  type: 'user',
  content: 'Hello, can you help me with my assignments?',
  timestamp: new Date().toISOString(),
  conversationId: 'test_conv_' + Date.now()
};

chrome.runtime.sendMessage({ 
  action: 'PROCESS_CHAT_MESSAGE',
  data: {
    message: testMessage,
    conversationId: testMessage.conversationId,
    settings: {
      responseSpeed: 'balanced',
      theme: 'auto'
    }
  }
}, response => {
  if (response && response.success) {
    console.log('✅ Chat message processed successfully');
    console.log('   💬 Reply:', response.reply);
    console.log('   📝 Metadata:', response.metadata);
    console.log('   ⏱️ Processing Time:', response.metadata.processingTime + 'ms');
  } else {
    console.error('❌ Chat message processing failed:', response);
  }
});

// Test 5: Process different types of messages
const testMessages = [
  'What are my current grades?',
  'Show me assignments due this week',
  'Tell me about my courses',
  'What announcements do I have?',
  'Help me with my homework'
];

console.log('\n=== Multiple Message Types ===');
testMessages.forEach((messageText, index) => {
  setTimeout(() => {
    const testMsg = {
      id: 'msg_test_' + Date.now() + '_' + index,
      type: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
      conversationId: 'test_conv_multi'
    };

    chrome.runtime.sendMessage({ 
      action: 'PROCESS_CHAT_MESSAGE',
      data: { message: testMsg }
    }, response => {
      if (response && response.success) {
        console.log(`✅ Message ${index + 1} processed: "${messageText}"`);
        console.log(`   💬 Reply: "${response.reply.substring(0, 100)}..."`);
      } else {
        console.error(`❌ Message ${index + 1} failed:`, response);
      }
    });
  }, index * 1000); // Stagger messages
});

console.log('\n🎯 Phase 5.1 test commands sent!');
console.log('💡 Check Service Worker console for detailed chat processing logs');
console.log('🪟 A chat window should open automatically');
console.log('💬 Look for keyword-based response processing');
