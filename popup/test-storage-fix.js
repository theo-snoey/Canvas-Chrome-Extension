// Test Storage Manager Fix
console.log('🔧 Testing Storage Manager Validation Fix...');

// Test the storage manager validation with null values
async function testStorageValidation() {
  console.log('\n=== Testing Storage Validation Fix ===');
  
  // Test data with null values that were causing errors
  const testData = {
    'calendar': {
      id: null,  // This was causing the error
      title: 'Test Event',
      type: 'assignment',
      startDate: null,
      endDate: null,
      courseId: 'test-course',
      courseName: 'Test Course'
    },
    'grades-summary': {
      courseId: null,  // This was causing the error
      courseName: 'Test Course',
      currentGrade: 'A',
      currentScore: null,
      totalPoints: null
    },
    'todo': {
      id: null,  // This was causing the error
      courseId: 'test-course',
      title: 'Test Assignment',
      type: 'assignment',
      dueDate: null
    }
  };
  
  // Test each data type
  for (const [dataType, data] of Object.entries(testData)) {
    console.log(`\n🧪 Testing ${dataType} validation...`);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'TEST_STORAGE_VALIDATION',
        dataType: dataType,
        data: data
      });
      
      if (response && response.success) {
        console.log(`✅ ${dataType} validation succeeded`);
        console.log(`   Validated data:`, response.validatedData);
      } else {
        console.log(`❌ ${dataType} validation failed:`, response.error);
      }
    } catch (error) {
      console.error(`❌ ${dataType} test failed:`, error);
    }
  }
  
  console.log('\n🎯 Storage validation test completed!');
  console.log('💡 The null value errors should now be fixed');
}

// Run the test
testStorageValidation();
