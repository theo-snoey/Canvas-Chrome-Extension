// Test script for Phase 4.2: Background Data Pipeline
console.log('🧪 Testing Phase 4.2: Background Data Pipeline');

// Test 1: Check semester data index
console.log('\n=== Test 1: Semester Data Index ===');
chrome.runtime.sendMessage({ action: 'GET_SEMESTER_DATA_INDEX' })
  .then(response => {
    if (response && response.success && response.index) {
      console.log('✅ Semester Index Found:', response.index);
      console.log('   📊 Total Tasks:', response.index.completedTasks);
      console.log('   🎯 Average Quality:', response.index.averageQuality + '%');
      console.log('   📚 Courses Tracked:', response.index.summary?.coursesTracked || 0);
      console.log('   📋 Data Types:', response.index.summary?.dataTypesCollected || 0);
      console.log('   📈 Total Data Points:', response.index.summary?.totalDataPoints || 0);
      
      // Show course breakdown
      if (response.index.courses) {
        console.log('   📚 Course Details:');
        Object.entries(response.index.courses).forEach(([id, course]) => {
          console.log(`     - ${course.name}: ${course.totalQuality}% quality, ${course.dataCount} data types`);
        });
      }
    } else {
      console.log('⚠️  No semester index found yet - trigger a sync first');
    }
  })
  .catch(error => {
    console.error('❌ Semester Index Error:', error);
  });

// Test 2: Get all autonomous data overview
console.log('\n=== Test 2: All Autonomous Data Overview ===');
chrome.runtime.sendMessage({ action: 'GET_ALL_AUTONOMOUS_DATA' })
  .then(response => {
    if (response && response.success) {
      const dataKeys = Object.keys(response.data);
      console.log('✅ Found', dataKeys.length, 'autonomous data entries');
      
      // Categorize data
      const categories = {
        dashboard: [],
        courses: [],
        assignments: [],
        grades: [],
        announcements: [],
        discussions: [],
        modules: [],
        syllabus: [],
        files: [],
        calendar: [],
        todo: [],
        other: []
      };
      
      dataKeys.forEach(key => {
        if (key === 'autonomous_semester_index') {
          categories.other.push(key);
        } else if (key.includes('dashboard')) {
          categories.dashboard.push(key);
        } else if (key.includes('course-home')) {
          categories.courses.push(key);
        } else if (key.includes('assignments')) {
          categories.assignments.push(key);
        } else if (key.includes('grades')) {
          categories.grades.push(key);
        } else if (key.includes('announcements')) {
          categories.announcements.push(key);
        } else if (key.includes('discussions')) {
          categories.discussions.push(key);
        } else if (key.includes('modules')) {
          categories.modules.push(key);
        } else if (key.includes('syllabus')) {
          categories.syllabus.push(key);
        } else if (key.includes('files')) {
          categories.files.push(key);
        } else if (key.includes('calendar')) {
          categories.calendar.push(key);
        } else if (key.includes('todo')) {
          categories.todo.push(key);
        } else {
          categories.other.push(key);
        }
      });
      
      // Display categorized results
      Object.entries(categories).forEach(([category, keys]) => {
        if (keys.length > 0) {
          console.log(`   📁 ${category.toUpperCase()}: ${keys.length} entries`);
          keys.slice(0, 3).forEach(key => {
            const data = response.data[key];
            if (data) {
              console.log(`     - ${key}: v${data.version || 'N/A'}, ${data.dataQuality || 0}% quality`);
            }
          });
          if (keys.length > 3) {
            console.log(`     ... and ${keys.length - 3} more`);
          }
        }
      });
    } else {
      console.log('⚠️  No autonomous data found yet');
    }
  })
  .catch(error => {
    console.error('❌ All Data Error:', error);
  });

// Test 3: Trigger comprehensive sync
console.log('\n=== Test 3: Trigger Comprehensive Sync ===');
chrome.runtime.sendMessage({ action: 'TRIGGER_AUTONOMOUS_SYNC' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Comprehensive sync triggered successfully!');
      console.log('   🔄 The system will now collect comprehensive semester data');
      console.log('   ⏱️  Check the Service Worker console for detailed progress');
      console.log('   📊 Run this test again in 1-2 minutes to see results');
    } else {
      console.error('❌ Sync trigger failed:', response);
    }
  })
  .catch(error => {
    console.error('❌ Sync Trigger Error:', error);
  });

// Test 4: Get autonomous system stats
console.log('\n=== Test 4: Autonomous System Stats ===');
chrome.runtime.sendMessage({ action: 'GET_AUTONOMOUS_STATS' })
  .then(response => {
    if (response && response.success) {
      console.log('✅ Autonomous System Stats:', response.stats);
      console.log('   🤖 Enabled:', response.stats.autonomousEnabled);
      console.log('   🔐 Authenticated:', response.stats.sessionState.isAuthenticated);
      console.log('   📋 Queue Length:', response.stats.dataCollectionQueueLength);
      console.log('   🔄 Retry Queue:', response.stats.retryQueueLength);
      console.log('   📑 Active Tabs:', response.stats.activeTabs);
      console.log('   🌐 Canvas Domain:', response.stats.sessionState.canvasDomain);
    } else {
      console.error('❌ Stats Error:', response);
    }
  })
  .catch(error => {
    console.error('❌ Stats Error:', error);
  });

// Test 5: Test specific data type retrieval
console.log('\n=== Test 5: Get Dashboard Data ===');
chrome.runtime.sendMessage({ action: 'GET_DATA_BY_TYPE', data: { dataType: 'dashboard' } })
  .then(response => {
    if (response && response.success) {
      const dashboardEntries = Object.keys(response.data);
      console.log('✅ Found', dashboardEntries.length, 'dashboard data entries');
      
      dashboardEntries.forEach(key => {
        const data = response.data[key];
        if (data && data.result) {
          console.log(`   📊 ${key}:`);
          console.log(`     - Quality: ${data.dataQuality}%`);
          console.log(`     - Version: ${data.version}`);
          console.log(`     - Last Updated: ${data.timestamp}`);
          console.log(`     - Courses Found: ${data.result.data?.courses?.length || 0}`);
          console.log(`     - Announcements: ${data.result.data?.announcements?.length || 0}`);
        }
      });
    } else {
      console.log('⚠️  No dashboard data found yet');
    }
  })
  .catch(error => {
    console.error('❌ Dashboard Data Error:', error);
  });

console.log('\n🎯 Phase 4.2 Testing Complete!');
console.log('📋 Summary:');
console.log('  1. Check semester index for overall statistics');
console.log('  2. Review all autonomous data categories');
console.log('  3. Trigger comprehensive sync for fresh data');
console.log('  4. Monitor autonomous system status');
console.log('  5. Examine specific data type (dashboard)');
console.log('\n💡 Tips:');
console.log('  - Make sure you\'re authenticated to Canvas');
console.log('  - Check Service Worker console for detailed sync progress');
console.log('  - Wait 1-2 minutes after triggering sync for full results');
console.log('  - Green ✅ messages indicate success, red ❌ indicate issues');
