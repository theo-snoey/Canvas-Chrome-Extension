// Simple Canvas Data Check (CSP-safe)
console.log('🔍 Checking Canvas Data Status...');

// Check what data we have stored
chrome.storage.local.get().then((allData) => {
  console.log('\n=== Canvas Data Analysis ===');
  
  // Find autonomous data
  const autonomousKeys = Object.keys(allData).filter(key => key.startsWith('autonomous_data_'));
  console.log(`📊 Found ${autonomousKeys.length} autonomous data entries`);
  
  // Check each data type
  const dataTypes = {};
  autonomousKeys.forEach(key => {
    const parts = key.split('_');
    const type = parts[2] || 'unknown';
    const data = allData[key];
    
    if (!dataTypes[type]) {
      dataTypes[type] = [];
    }
    dataTypes[type].push(data);
  });
  
  console.log('\n📋 Data Types Available:');
  Object.entries(dataTypes).forEach(([type, entries]) => {
    const latest = entries.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))[0];
    const timestamp = latest.timestamp ? new Date(latest.timestamp).toLocaleString() : 'Unknown';
    const hasResult = latest.result && Object.keys(latest.result).length > 0;
    const quality = latest.dataQuality || 0;
    
    console.log(`  📁 ${type.toUpperCase()}:`);
    console.log(`     ⏰ Last Updated: ${timestamp}`);
    console.log(`     📊 Quality: ${quality}%`);
    console.log(`     📄 Has Data: ${hasResult ? '✅ YES' : '❌ NO'}`);
    
    if (hasResult && latest.result) {
      const result = latest.result;
      if (result.courses) console.log(`     📚 Courses: ${result.courses.length}`);
      if (result.assignments) console.log(`     📝 Assignments: ${result.assignments.length}`);
      if (result.grades) console.log(`     📊 Grades: ${result.grades.length}`);
      if (result.announcements) console.log(`     📢 Announcements: ${result.announcements.length}`);
      if (result.events) console.log(`     📅 Events: ${result.events.length}`);
      if (result.items) console.log(`     ✅ Todo Items: ${result.items.length}`);
    }
  });
  
  // Check authentication
  if (allData.canvas_session_state) {
    const session = allData.canvas_session_state;
    console.log('\n🔐 Authentication Status:');
    console.log(`   Status: ${session.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}`);
    console.log(`   Domain: ${session.canvasDomain || 'Unknown'}`);
    console.log(`   Last Check: ${session.lastSessionCheck ? new Date(session.lastSessionCheck).toLocaleString() : 'Never'}`);
  }
  
  // Recommendations
  console.log('\n🎯 RECOMMENDATIONS:');
  
  if (autonomousKeys.length === 0) {
    console.log('❌ No autonomous data found');
    console.log('   → Visit your Canvas dashboard to trigger data collection');
    console.log('   → Make sure you\'re logged into Canvas');
  } else {
    const hasAssignments = dataTypes['assignments'] || dataTypes['todo'] || dataTypes['course-assignments'];
    const hasCourses = dataTypes['dashboard'] || dataTypes['courses-list'] || dataTypes['courses'];
    
    if (!hasAssignments) {
      console.log('❌ No assignment data found');
      console.log('   → Visit individual course pages to collect assignment data');
      console.log('   → Check your Canvas "To Do" list');
      console.log('   → Visit assignment pages directly');
    } else {
      console.log('✅ Assignment data is available');
    }
    
    if (!hasCourses) {
      console.log('❌ No course data found');
      console.log('   → Visit your Canvas dashboard');
    } else {
      console.log('✅ Course data is available');
    }
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. 🌐 Make sure you\'re logged into Canvas');
  console.log('2. 📋 Visit your Canvas dashboard');
  console.log('3. 📝 Click on some course assignment pages');
  console.log('4. ⏳ Wait 2-3 minutes for data collection');
  console.log('5. 💬 Try asking about assignments again');
  
}).catch(error => {
  console.error('❌ Failed to check data:', error);
});

// Also trigger data collection
console.log('\n🚀 Triggering data collection...');
chrome.runtime.sendMessage({ action: 'TRIGGER_AUTONOMOUS_COLLECTION' }).then(response => {
  if (response && response.success) {
    console.log('✅ Data collection triggered successfully');
    console.log('⏳ Wait 1-2 minutes, then try asking about assignments again');
  } else {
    console.log('⚠️ Data collection response:', response);
  }
}).catch(error => {
  console.error('❌ Failed to trigger data collection:', error);
});
