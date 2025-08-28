/**
 * Refresh extracted data from the current page
 */
async function refreshExtractedData() {
  console.log('🔄 Refresh button clicked');
  const extractedDataDiv = document.getElementById('extractedData');
  const refreshButton = document.getElementById('refreshDataButton');

  if (!extractedDataDiv || !refreshButton) {
    console.error('❌ Required DOM elements not found');
    return;
  }

  refreshButton.disabled = true;
  refreshButton.textContent = '🔄 Refreshing...';

  try {
    console.log('📤 Sending GET_EXTRACTED_DATA message...');
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'GET_EXTRACTED_DATA'
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    console.log('📥 Received response:', response);

    if (response && response.success && response.data) {
      console.log('✅ Displaying extracted data');
      displayExtractedData(response.data);
    } else {
      console.log('⚠️ No data in response');
      extractedDataDiv.innerHTML = '<p class="no-data">No data extracted yet. Navigate to a Canvas page to see extracted content.</p>';
    }

  } catch (error) {
    console.error('❌ Failed to refresh extracted data:', error);
    extractedDataDiv.innerHTML = `<p class="no-data">Failed to load extracted data: ${error.message}</p>`;
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = '🔄 Refresh';
  }
}

/**
 * Display extracted data in the popup
 */
function displayExtractedData(data) {
  const extractedDataDiv = document.getElementById('extractedData');

  if (!data || !data.data) {
    extractedDataDiv.innerHTML = '<p class="no-data">No data extracted yet. Navigate to a Canvas page to see extracted content.</p>';
    return;
  }

  const pageData = data.data;
  let html = '';

  html += `
    <div class="data-item">
      <h4>Page Information</h4>
      <p><strong>Type:</strong> <span class="value">${data.pageType || 'Unknown'}</span></p>
      <p><strong>Extracted:</strong> <span class="value">${new Date(data.timestamp).toLocaleString()}</span></p>
      <p><strong>URL:</strong> <span class="value">${data.url || 'Unknown'}</span></p>
    </div>
  `;

  switch (data.pageType) {
    case 'dashboard':
      html += displayDashboardData(pageData);
      break;
    case 'course':
      html += displayCourseData(pageData);
      break;
    default:
      html += displayGenericData(pageData);
  }

  extractedDataDiv.innerHTML = html;
}

/**
 * Display dashboard data
 */
function displayDashboardData(data) {
  let html = '';

  if (data.courses && data.courses.length > 0) {
    html += `
      <div class="data-item">
        <h4>Courses (${data.courses.length})</h4>
    `;
    data.courses.forEach(course => {
      html += `<p><strong>${course.name}</strong> ${course.code ? `(${course.code})` : ''}</p>`;
    });
    html += `</div>`;
  }

  if (data.announcements && data.announcements.length > 0) {
    html += `
      <div class="data-item">
        <h4>Announcements (${data.announcements.length})</h4>
    `;
    data.announcements.forEach(announcement => {
      html += `<p><strong>${announcement.title}</strong></p>`;
      if (announcement.content) {
        html += `<p class="value">${announcement.content.substring(0, 100)}...</p>`;
      }
    });
    html += `</div>`;
  }

  return html;
}

/**
 * Display course data
 */
function displayCourseData(data) {
  let html = '';

  if (data.courseInfo && data.courseInfo.name) {
    html += `
      <div class="data-item">
        <h4>Course Information</h4>
        <p><strong>Name:</strong> <span class="value">${data.courseInfo.name}</span></p>
      </div>
    `;
  }

  if (data.navigation && data.navigation.length > 0) {
    html += `
      <div class="data-item">
        <h4>Navigation (${data.navigation.length})</h4>
    `;
    data.navigation.forEach(nav => {
      html += `<p>${nav.active ? '→ ' : ''}<strong>${nav.text}</strong></p>`;
    });
    html += `</div>`;
  }

  return html;
}

/**
 * Display generic data
 */
function displayGenericData(data) {
  return `
    <div class="data-item">
      <h4>Generic Page Data</h4>
      <p><strong>Title:</strong> <span class="value">${data.title || 'Unknown'}</span></p>
      <p><strong>Headings:</strong> <span class="value">${data.headings ? data.headings.length : 0}</span></p>
      <p><strong>Links:</strong> <span class="value">${data.links || 0}</span></p>
    </div>
  `;
}
