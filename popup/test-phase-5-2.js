// Test Phase 5.2: Natural Language Processing
console.log('🧠 Testing Phase 5.2: Natural Language Processing');

// Test different types of natural language queries
const testQueries = [
  // Greeting tests
  'Hello, can you help me?',
  'Hi there!',
  'Good morning Canvas Assistant',
  
  // Grade-related queries
  'What is my current grade in Math 101?',
  'How am I doing in Biology?',
  'What do I need on the final to get an A?',
  'Show me my GPA',
  'What are my grades looking like?',
  
  // Assignment queries
  'What assignments are due this week?',
  'Do I have any homework due today?',
  'Show me upcoming assignments',
  'What projects do I need to work on?',
  'Assignment deadlines for CS 101',
  
  // Course queries
  'What courses am I taking?',
  'Tell me about my classes',
  'Course information for Biology',
  'My class schedule',
  
  // Schedule queries
  'When is my next class?',
  'What time is Math 101?',
  'Show me my calendar',
  'Upcoming events',
  
  // Announcement queries
  'Any new announcements?',
  'Recent updates from professors',
  'Show me announcements',
  
  // Help queries
  'What can you help me with?',
  'Show me available commands',
  'Help me understand your features',
  
  // Complex queries
  'I need to get a B+ in Chemistry, what do I need on the final exam?',
  'Can you help me prioritize my assignments for this week?',
  'What announcements have been posted in the last few days?',
  
  // Conversational follow-ups
  'Thanks for the help',
  'That\'s not what I meant',
  'Can you be more specific?',
  
  // Unknown/edge cases
  'What\'s the weather like?',
  'Random question that makes no sense',
  'ajsdlkfjaslkdfj'
];

console.log('\n=== Testing NLP Query Processing ===');
console.log(`Testing ${testQueries.length} different query types...`);

// Function to test a single query
function testQuery(query, index) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    console.log(`\n--- Test ${index + 1}/${testQueries.length} ---`);
    console.log(`Query: "${query}"`);
    
    const testMessage = {
      id: `test_msg_${Date.now()}_${index}`,
      type: 'user',
      content: query,
      timestamp: new Date().toISOString(),
      conversationId: `test_nlp_conv_${Date.now()}`
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
    }, (response) => {
      const totalTime = Date.now() - startTime;
      
      if (response && response.success) {
        console.log('✅ Response received');
        console.log(`   💬 Reply: "${response.reply.substring(0, 100)}${response.reply.length > 100 ? '...' : ''}"`);
        
        if (response.metadata) {
          console.log(`   🧠 NLP Enabled: ${response.metadata.nlpEnabled || false}`);
          if (response.metadata.intent) {
            console.log(`   🎯 Intent: ${response.metadata.intent} (${(response.metadata.confidence * 100).toFixed(1)}% confidence)`);
          }
          if (response.metadata.parameters && Object.keys(response.metadata.parameters).length > 0) {
            console.log(`   📋 Parameters:`, response.metadata.parameters);
          }
          if (response.metadata.suggestions && response.metadata.suggestions.length > 0) {
            console.log(`   💡 Suggestions: ${response.metadata.suggestions.slice(0, 2).join(', ')}`);
          }
          console.log(`   ⏱️ Processing Time: ${response.metadata.processingTime}ms (Total: ${totalTime}ms)`);
        }
      } else {
        console.error('❌ Query failed:', response);
      }
      
      resolve(response);
    });
  });
}

// Test all queries with delays to avoid overwhelming the system
async function runAllTests() {
  console.log('🚀 Starting comprehensive NLP testing...');
  
  const results = {
    total: testQueries.length,
    successful: 0,
    failed: 0,
    nlpEnabled: 0,
    intentBreakdown: {},
    averageProcessingTime: 0,
    totalProcessingTime: 0
  };
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    
    try {
      const result = await testQuery(query, i);
      
      if (result && result.success) {
        results.successful++;
        
        if (result.metadata) {
          if (result.metadata.nlpEnabled) {
            results.nlpEnabled++;
          }
          
          if (result.metadata.intent) {
            results.intentBreakdown[result.metadata.intent] = 
              (results.intentBreakdown[result.metadata.intent] || 0) + 1;
          }
          
          if (result.metadata.processingTime) {
            results.totalProcessingTime += result.metadata.processingTime;
          }
        }
      } else {
        results.failed++;
      }
      
      // Small delay between tests
      if (i < testQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error);
      results.failed++;
    }
  }
  
  // Calculate averages
  results.averageProcessingTime = results.totalProcessingTime / Math.max(results.nlpEnabled, 1);
  
  // Display final results
  console.log('\n🎯 ===== FINAL TEST RESULTS =====');
  console.log(`📊 Total Tests: ${results.total}`);
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`🧠 NLP Enabled: ${results.nlpEnabled} (${(results.nlpEnabled/results.total*100).toFixed(1)}%)`);
  console.log(`⏱️ Average Processing Time: ${results.averageProcessingTime.toFixed(0)}ms`);
  
  console.log('\n📈 Intent Breakdown:');
  for (const [intent, count] of Object.entries(results.intentBreakdown)) {
    console.log(`   ${intent}: ${count} queries (${(count/results.nlpEnabled*100).toFixed(1)}%)`);
  }
  
  console.log('\n🎉 Phase 5.2 NLP testing completed!');
  
  return results;
}

// Start the comprehensive test
setTimeout(() => {
  runAllTests().then(results => {
    console.log('\n✅ All NLP tests completed successfully!');
    console.log('💡 Check Service Worker console for detailed NLP processing logs');
    console.log('🧠 Look for intent detection, parameter extraction, and response generation');
  }).catch(error => {
    console.error('❌ Test suite failed:', error);
  });
}, 1000);

console.log('\n🎯 Phase 5.2 test suite initiated!');
console.log('💡 Tests will run automatically with delays between queries');
console.log('🧠 Watch for intent detection, confidence scoring, and parameter extraction');
