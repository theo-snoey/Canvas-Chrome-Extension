// Test Enhanced NLP Responses - Phase 5.2 Improvements
console.log('🚀 Testing Enhanced NLP Responses with Real Data Processing');

// Test queries that should now give much more detailed responses
const enhancedTestQueries = [
  // Assignment queries - should now show actual assignments with due dates
  'tell me what assignments I have right now',
  'what assignments are due this week?',
  'do I have any homework due today?',
  'show me assignments for Biology',
  
  // Course queries - should show detailed course information
  'what courses am I taking?',
  'tell me about my classes',
  'show me information about Math 101',
  
  // Grade queries - should show actual grades and calculations  
  'what are my current grades?',
  'how am I doing in Chemistry?',
  'what do I need on the final to get an A in Physics?',
  'show me my recent grades',
  
  // Announcement queries - should show real announcements
  'any recent announcements?',
  'what announcements do I have for Biology?',
  'show me updates from my professors',
  
  // Complex queries combining multiple elements
  'what assignments are due tomorrow in my science courses?',
  'how are my grades looking this semester?',
  'any important announcements I should know about?'
];

console.log('\n=== Testing Enhanced NLP Data Processing ===');
console.log(`Testing ${enhancedTestQueries.length} enhanced queries...`);
console.log('💡 These should now show REAL Canvas data instead of generic responses!');

// Function to test enhanced query processing
function testEnhancedQuery(query, index) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    console.log(`\n--- Enhanced Test ${index + 1}/${enhancedTestQueries.length} ---`);
    console.log(`🎯 Query: "${query}"`);
    
    const testMessage = {
      id: `enhanced_test_${Date.now()}_${index}`,
      type: 'user',
      content: query,
      timestamp: new Date().toISOString(),
      conversationId: `enhanced_nlp_test_${Date.now()}`
    };

    chrome.runtime.sendMessage({ 
      action: 'PROCESS_CHAT_MESSAGE',
      data: {
        message: testMessage,
        conversationId: testMessage.conversationId
      }
    }, (response) => {
      const totalTime = Date.now() - startTime;
      
      if (response && response.success) {
        console.log('✅ Enhanced Response Received');
        
        // Show first 200 characters of response
        const preview = response.reply.substring(0, 200);
        console.log(`💬 Response Preview: "${preview}${response.reply.length > 200 ? '...' : ''}"`);
        
        // Check if response seems data-driven (not generic)
        const isDataDriven = 
          response.reply.includes('Here are your') ||
          response.reply.includes('assignments') ||
          response.reply.includes('courses') ||
          response.reply.includes('grades') ||
          response.reply.includes('announcements') ||
          response.reply.includes('•') ||
          response.reply.includes('**') ||
          response.reply.includes('📊') ||
          response.reply.includes('📚') ||
          response.reply.includes('📢') ||
          response.reply.includes('1.') ||
          response.reply.length > 150;
        
        console.log(`🧠 Data-Driven Response: ${isDataDriven ? '✅ YES' : '❌ NO (still generic)'}`);
        
        if (response.metadata) {
          console.log(`🎯 Intent: ${response.metadata.intent} (${(response.metadata.confidence * 100).toFixed(1)}% confidence)`);
          if (response.metadata.parameters && Object.keys(response.metadata.parameters).length > 0) {
            console.log(`📋 Parameters Found:`, response.metadata.parameters);
          }
          console.log(`⏱️ Processing Time: ${response.metadata.processingTime}ms`);
        }
        
      } else {
        console.error('❌ Enhanced query failed:', response);
      }
      
      resolve(response);
    });
  });
}

// Run enhanced tests
async function runEnhancedTests() {
  console.log('🚀 Starting enhanced NLP response testing...');
  
  const results = {
    total: enhancedTestQueries.length,
    successful: 0,
    dataDriven: 0,
    generic: 0
  };
  
  for (let i = 0; i < enhancedTestQueries.length; i++) {
    const query = enhancedTestQueries[i];
    
    try {
      const result = await testEnhancedQuery(query, i);
      
      if (result && result.success) {
        results.successful++;
        
        // Check if response is data-driven
        const isDataDriven = 
          result.reply.includes('Here are your') ||
          result.reply.includes('📊') ||
          result.reply.includes('📚') ||
          result.reply.includes('📢') ||
          result.reply.includes('1.') ||
          result.reply.includes('•') ||
          result.reply.length > 150;
        
        if (isDataDriven) {
          results.dataDriven++;
        } else {
          results.generic++;
        }
      }
      
      // Delay between tests
      if (i < enhancedTestQueries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
    } catch (error) {
      console.error(`❌ Enhanced test ${i + 1} failed:`, error);
    }
  }
  
  // Display results
  console.log('\n🎯 ===== ENHANCED NLP TEST RESULTS =====');
  console.log(`📊 Total Tests: ${results.total}`);
  console.log(`✅ Successful: ${results.successful}`);
  console.log(`🧠 Data-Driven Responses: ${results.dataDriven} (${(results.dataDriven/results.total*100).toFixed(1)}%)`);
  console.log(`📝 Generic Responses: ${results.generic} (${(results.generic/results.total*100).toFixed(1)}%)`);
  
  if (results.dataDriven >= results.total * 0.7) {
    console.log('🎉 EXCELLENT! Most responses are now data-driven and detailed!');
  } else if (results.dataDriven >= results.total * 0.4) {
    console.log('👍 GOOD! Many responses are using real Canvas data!');
  } else {
    console.log('⚠️ Many responses are still generic - may need more Canvas data collection');
  }
  
  return results;
}

// Start enhanced testing
setTimeout(() => {
  runEnhancedTests().then(results => {
    console.log('\n✅ Enhanced NLP testing completed!');
    console.log('💡 Check responses for specific assignments, courses, grades, and announcements');
    console.log('🧠 The NLP system should now provide detailed, actionable information');
  }).catch(error => {
    console.error('❌ Enhanced test suite failed:', error);
  });
}, 1000);

console.log('\n🎯 Enhanced NLP test suite initiated!');
console.log('💡 Testing improved responses with real Canvas data processing');
console.log('🧠 Look for detailed assignment lists, course info, grades, and announcements');
