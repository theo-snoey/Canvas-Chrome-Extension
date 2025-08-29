// Test Enhanced Course Data Collection
console.log('🎯 Testing Enhanced Course Data Collection...');

// Trigger autonomous data collection with course focus
chrome.runtime.sendMessage({ action: 'TRIGGER_AUTONOMOUS_COLLECTION' }).then(response => {
  if (response && response.success) {
    console.log('✅ Enhanced autonomous collection triggered');
    console.log('⚡ FAST MODE: System now runs every 30 seconds!');
    console.log('🔍 The system will automatically visit:');
    console.log('   📋 Course assignment pages (highest priority)');
    console.log('   🏠 Course home pages');
    console.log('   📊 Course grade pages');
    console.log('   📢 Course announcement pages');
    
    console.log('\n⏳ Wait just 30-60 seconds for data collection!');
    console.log('💬 Then try asking: "what assignments do I have in my classes?"');
    
    // Set up monitoring
    console.log('\n🔍 Monitoring collection progress...');
    
    setTimeout(() => {
      chrome.storage.local.get().then((allData) => {
        const courseKeys = Object.keys(allData).filter(key => key.startsWith('autonomous_data_course-'));
        console.log(`\n📊 Course-specific data collected: ${courseKeys.length} entries`);
        
        courseKeys.forEach(key => {
          const data = allData[key];
          const type = key.split('_')[2];
          const hasData = data.result && Object.keys(data.result).length > 0;
          console.log(`   📁 ${type}: ${hasData ? '✅ HAS DATA' : '❌ NO DATA'}`);
          
          if (hasData && data.result.assignments) {
            console.log(`      📝 Found ${data.result.assignments.length} assignments`);
          }
        });
        
        if (courseKeys.length > 0) {
          console.log('\n🎉 Course data collection is working!');
          console.log('💬 Try asking about assignments now');
        } else {
          console.log('\n⚠️ No course-specific data found yet');
          console.log('🔄 The system may need more time or course pages may need manual visits');
        }
      });
    }, 45000); // Check after 45 seconds
    
  } else {
    console.log('❌ Failed to trigger collection:', response);
  }
}).catch(error => {
  console.error('❌ Error triggering collection:', error);
});

console.log('🚀 Enhanced course collection test initiated!');
console.log('⚡ FAST MODE: 30-second intervals active!');
console.log('📋 This will now automatically visit course assignment pages');
console.log('⏰ Check back in 45-60 seconds for results!');
