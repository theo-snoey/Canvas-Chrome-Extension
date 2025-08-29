// Quick Data Check - CSP Safe
console.log('🔍 Quick Canvas Data Check...');

chrome.storage.local.get().then((allData) => {
  console.log('\n=== Canvas Data Status ===');
  
  const autonomousKeys = Object.keys(allData).filter(key => key.startsWith('autonomous_data_'));
  console.log(`📊 Found ${autonomousKeys.length} autonomous data entries`);
  
  // Check what types of data we have
  const dataTypes = {};
  autonomousKeys.forEach(key => {
    const parts = key.split('_');
    const type = parts[2] || 'unknown';
    const data = allData[key];
    
    if (!dataTypes[type]) {
      dataTypes[type] = [];
    }
    dataTypes[type].push({
      timestamp: data.timestamp,
      hasResult: data.result && Object.keys(data.result).length > 0,
      result: data.result,
      quality: data.dataQuality || 0
    });
  });
  
  console.log('\n📋 Data Summary:');
  Object.entries(dataTypes).forEach(([type, entries]) => {
    const latest = entries.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0];
    console.log(`\n📁 ${type.toUpperCase()}:`);
    console.log(`   📄 Has Data: ${latest.hasResult ? '✅ YES' : '❌ NO'}`);
    console.log(`   ⏰ Last Updated: ${latest.timestamp ? new Date(latest.timestamp).toLocaleString() : 'Never'}`);
    console.log(`   📊 Quality: ${latest.quality}%`);
    
    if (latest.hasResult && latest.result) {
      console.log('   📝 Content:', latest.result);
    }
  });
  
  // Test NLP data access
  console.log('\n🧠 Testing NLP Data Access...');
  chrome.runtime.sendMessage({ action: 'GET_CHAT_CONTEXT' }).then(response => {
    if (response && response.canvasData) {
      const data = response.canvasData;
      console.log('✅ NLP Data Available:');
      console.log(`   📚 Courses: ${data.courses?.length || 0}`);
      console.log(`   📝 Assignments: ${data.assignments?.length || 0}`);
      console.log(`   ✅ Todo: ${data.todo?.length || 0}`);
      console.log(`   📅 Calendar: ${data.calendar?.length || 0}`);
      console.log(`   📊 Grades: ${data.grades?.length || 0}`);
      
      if (data.courses && data.courses.length > 0) {
        console.log('\n📚 Available Courses:');
        data.courses.forEach((course, i) => {
          console.log(`   ${i + 1}. ${course.name || course.title}`);
        });
      }
      
      if (data.assignments && data.assignments.length > 0) {
        console.log('\n📝 Available Assignments:');
        data.assignments.slice(0, 5).forEach((assignment, i) => {
          console.log(`   ${i + 1}. ${assignment.name || assignment.title}`);
        });
      }
      
      if (data.todo && data.todo.length > 0) {
        console.log('\n✅ Available Todo Items:');
        data.todo.slice(0, 5).forEach((item, i) => {
          console.log(`   ${i + 1}. ${item.title || item.name}`);
        });
      }
    } else {
      console.log('❌ No NLP data available');
    }
  }).catch(error => {
    console.error('❌ Failed to get NLP data:', error);
  });
  
}).catch(error => {
  console.error('❌ Failed to check data:', error);
});

console.log('🎯 Quick data check initiated...');
