// Canvas LMS Assistant - Popup Script
// Handles the extension popup interface and user interactions

document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

function initializePopup() {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const statusDiv = document.getElementById('status');
  const chatContainer = document.getElementById('chatContainer');
  const openChatBtn = document.getElementById('openChatBtn');

  // Set up event listeners
  sendButton.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });

  // Add chat window button listener
  if (openChatBtn) {
    openChatBtn.addEventListener('click', openChatWindow);
  }

  // Add refresh data button event listener
  const refreshDataButton = document.getElementById('refreshDataButton');
  if (refreshDataButton) {
    refreshDataButton.addEventListener('click', refreshExtractedData);
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);

  // Add development toggle button
  addDevToggle();

  // Check Canvas status on popup open
  checkCanvasStatus();

  // PHASE 1.1: Initialize progress monitoring
  initializeProgressMonitoring();
}

async function checkCanvasStatus() {
  try {
    // Get current page info from background
    const response = await chrome.runtime.sendMessage({
      action: 'GET_CURRENT_PAGE_INFO'
    });

    if (response) {
      updateUIFromPageInfo(response);
    } else {
      // Fallback: check current tab
      await checkCurrentTab();
    }
  } catch (error) {
    console.error('Error checking Canvas status:', error);
    updateUI(false, 'Error detecting Canvas page');
  }
}

async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url && (tab.url.includes('canvas') || tab.url.includes('instructure'))) {
      updateUI(true, 'Canvas page detected');
    } else {
      updateUI(false, 'Not on Canvas page');
    }
  } catch (error) {
    console.error('Error checking current tab:', error);
    updateUI(false, 'Error checking tab');
  }
}

function updateUI(isCanvas, statusMessage = null) {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const statusDiv = document.getElementById('status');
  const chatContainer = document.getElementById('chatContainer');

  if (isCanvas) {
    statusDiv.textContent = statusMessage || '✅ Connected to Canvas';
    statusDiv.className = 'status connected';
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.placeholder = 'Ask me about your courses, grades, assignments...';

    // Show welcome message for Canvas pages
    updateWelcomeMessage(true);
  } else {
    statusDiv.textContent = statusMessage || '❌ Not on Canvas page';
    statusDiv.className = 'status disconnected';
    messageInput.disabled = true;
    sendButton.disabled = true;
    messageInput.placeholder = 'Please navigate to your Canvas LMS page';

    // Show help message for non-Canvas pages
    updateWelcomeMessage(false);
  }
}

function updateUIFromPageInfo(pageInfo) {
  if (!pageInfo || !pageInfo.detection) {
    updateUI(false, 'No Canvas page detected');
    return;
  }

  const { detection, metadata, user } = pageInfo;
  const isCanvas = detection.isCanvas;

  if (isCanvas) {
    let statusMessage = '✅ Connected to Canvas';

    if (metadata && metadata.courseName) {
      statusMessage += ` - ${metadata.courseName}`;
    }

    if (detection.pageType && detection.pageType !== 'unknown') {
      statusMessage += ` (${detection.pageType})`;
    }

    updateUI(true, statusMessage);

    // Show page-specific information
    showPageInfo(pageInfo);
  } else {
    updateUI(false, 'Not on Canvas page');
  }
}

function showPageInfo(pageInfo) {
  const chatContainer = document.getElementById('chatContainer');
  const welcomeMessage = chatContainer.querySelector('.welcome-message');

  if (welcomeMessage) {
    const { detection, metadata, user } = pageInfo;

    let infoHtml = '<p>👋 Welcome to Canvas Assistant!</p>';

    if (user && user.name) {
      infoHtml += `<p>Hello, ${user.name}! 👤</p>`;
    }

    if (metadata && metadata.courseName) {
      infoHtml += `<p>Current course: <strong>${metadata.courseName}</strong></p>`;
    }

    if (detection.pageType) {
      const pageTypeDisplay = detection.pageType.charAt(0).toUpperCase() + detection.pageType.slice(1);
      infoHtml += `<p>Page type: ${pageTypeDisplay} 📄</p>`;
    }

    infoHtml += '<p>Ask me about your courses, grades, or assignments!</p>';

    welcomeMessage.innerHTML = infoHtml;
  }
}

function updateWelcomeMessage(isCanvas) {
  const chatContainer = document.getElementById('chatContainer');
  const welcomeMessage = chatContainer.querySelector('.welcome-message');

  if (welcomeMessage) {
    if (isCanvas) {
      welcomeMessage.innerHTML = `
        <p>👋 Welcome to Canvas Assistant!</p>
        <p>I'm analyzing your Canvas page...</p>
      `;
    } else {
      welcomeMessage.innerHTML = `
        <p>👋 Welcome to Canvas Assistant!</p>
        <p>Please navigate to your Canvas LMS page to get started.</p>
        <p>I'll help you with courses, grades, assignments, and more!</p>
      `;
    }
  }
}

function handleBackgroundMessage(request, sender, sendResponse) {
  console.log('Popup received message:', request);

  switch (request.action) {
    case 'PAGE_INFO_UPDATED':
      updateUIFromPageInfo(request.data);
      break;

    default:
      console.log('Unknown message action:', request.action);
  }
}

function handleSendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();

  if (!message) return;

  // Add user message to chat
  addMessageToChat(message, 'user');

  // Clear input
  messageInput.value = '';

  // Process the message (placeholder for now)
  processMessage(message);
}

function addMessageToChat(message, sender) {
  const chatContainer = document.getElementById('chatContainer');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;

  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  messageDiv.innerHTML = `
    <div class="message-content">${message}</div>
    <div class="message-time">${timestamp}</div>
  `;

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function processMessage(message) {
  // Placeholder for message processing
  // This will be implemented in Phase 4

  setTimeout(() => {
    addMessageToChat(
      `I received your message: "${message}". This feature will be implemented in Phase 4.`,
      'assistant'
    );
  }, 1000);
}

/**
 * Add development mode toggle button
 */
// PHASE 1.1: Initialize progress monitoring
function initializeProgressMonitoring() {
  // Start monitoring startup progress immediately
  monitorStartupProgress();
  
  // Set up periodic progress checks
  setInterval(monitorStartupProgress, 1000); // Check every second
}

// PHASE 1.1: Monitor startup scraping progress
async function monitorStartupProgress() {
  try {
    const progressData = await chrome.storage.local.get([
      'startupScrapeScheduled',
      'startupScrapeInProgress', 
      'startupScrapeCompleted',
      'startupScrapeFailed',
      'scrapeProgress',
      'startupScrapeStartTime',
      'startupScrapeEndTime'
    ]);

    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressDetails = document.getElementById('progressDetails');

    // Show progress section if scraping is active or recently completed
    if (progressData.startupScrapeInProgress || 
        (progressData.startupScrapeCompleted && Date.now() - progressData.startupScrapeEndTime < 10000)) {
      
      progressSection.style.display = 'block';

      if (progressData.startupScrapeInProgress) {
        // Active scraping
        progressBar.style.width = '60%'; // Indeterminate progress
        progressText.textContent = progressData.scrapeProgress || 'Scraping Canvas data...';
        
        const elapsed = progressData.startupScrapeStartTime ? 
          Math.round((Date.now() - progressData.startupScrapeStartTime) / 1000) : 0;
        progressDetails.textContent = `Elapsed: ${elapsed}s • Comprehensive data extraction in progress`;
        
      } else if (progressData.startupScrapeCompleted) {
        // Completed scraping
        progressBar.style.width = '100%';
        progressText.textContent = 'Startup scraping completed successfully!';
        
        const duration = progressData.startupScrapeEndTime && progressData.startupScrapeStartTime ?
          Math.round((progressData.startupScrapeEndTime - progressData.startupScrapeStartTime) / 1000) : 0;
        progressDetails.textContent = `Completed in ${duration}s • Canvas data is ready for chat`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
          progressSection.style.display = 'none';
        }, 5000);
      }
      
    } else if (progressData.startupScrapeFailed) {
      // Failed scraping
      progressSection.style.display = 'block';
      progressBar.style.width = '100%';
      progressBar.style.background = '#ef4444'; // Red for error
      progressText.textContent = 'Startup scraping failed';
      progressDetails.textContent = progressData.startupScrapeError || 'Unknown error occurred';
      
    } else if (progressData.startupScrapeScheduled && !progressData.startupScrapeInProgress) {
      // Scheduled but not started yet
      progressSection.style.display = 'block';
      progressBar.style.width = '10%';
      progressText.textContent = 'Preparing to scrape Canvas data...';
      progressDetails.textContent = 'Startup scraping will begin shortly';
      
    } else {
      // No active progress to show
      progressSection.style.display = 'none';
    }

  } catch (error) {
    console.error('Error monitoring startup progress:', error);
  }
}

function addDevToggle() {
  // Only add in development (you can remove this check for production)
  const devToggle = document.createElement('button');
  devToggle.className = 'dev-toggle';
  devToggle.textContent = 'DEV';
  devToggle.title = 'Toggle Development Mode';
  devToggle.addEventListener('click', toggleDevMode);

  document.body.appendChild(devToggle);
}

/**
 * Toggle development mode and show/hide test section
 */
function toggleDevMode() {
  const testSection = document.getElementById('testSection');
  const runTestsButton = document.getElementById('runTestsButton');

  if (testSection.style.display === 'none' || testSection.style.display === '') {
    testSection.style.display = 'block';
    runTestsButton.addEventListener('click', runTabManagerTests);
    console.log('🧪 Development mode enabled');
  } else {
    testSection.style.display = 'none';
    runTestsButton.removeEventListener('click', runTabManagerTests);
    console.log('🔒 Development mode disabled');
  }
}

/**
 * Run tab manager tests and display results
 */
async function runTabManagerTests() {
  const runTestsButton = document.getElementById('runTestsButton');
  const testResults = document.getElementById('testResults');

  // Disable button during test
  runTestsButton.disabled = true;
  runTestsButton.textContent = 'Running Tests...';

  // Clear previous results
  testResults.textContent = '';

  // Create log function to capture test output
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  let testOutput = [];

  const captureLog = (type) => (...args) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    testOutput.push(`[${type.toUpperCase()}] ${message}`);
    testResults.textContent = testOutput.join('\n');
    testResults.scrollTop = testResults.scrollHeight;

    // Also call original console method
    if (type === 'log') originalConsoleLog(...args);
    if (type === 'error') originalConsoleError(...args);
  };

  console.log = captureLog('log');
  console.error = captureLog('error');

  try {
    // Run individual tests
    const results = {
      basicGhostTab: await testBasicGhostTab(),
      tabStats: await testTabStats(),
      tabExecution: await testTabExecution(),
      canvasSimulation: await testCanvasSimulation()
    };

    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Add summary
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;

    testOutput.push(`\n🎯 TEST SUMMARY: ${passed}/${total} tests passed`);

    if (passed === total) {
      testOutput.push('🎉 All tests passed! Tab Manager is working correctly.');
    } else {
      testOutput.push('⚠️ Some tests failed. Check the output above for details.');
    }

    testResults.textContent = testOutput.join('\n');
    testResults.scrollTop = testResults.scrollHeight;

  } catch (error) {
    // Restore console
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    testResults.textContent += `\n❌ Test suite failed: ${error.message}`;
  } finally {
    // Re-enable button
    runTestsButton.disabled = false;
    runTestsButton.textContent = 'Run Tab Manager Tests';
  }
}

// Individual test functions (embedded for popup use)
async function testBasicGhostTab() {
  console.log('\n📋 Test 1: Basic Ghost Tab Creation');

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'CREATE_GHOST_TAB',
      data: {
        url: 'https://httpbin.org/html',
        purpose: 'basic-test'
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Runtime error:', chrome.runtime.lastError);
        resolve(false);
        return;
      }

      if (response && response.success) {
        console.log('✅ Ghost tab created successfully:', response.tabId);

        // Clean up the test tab
        chrome.runtime.sendMessage({
          action: 'CLOSE_GHOST_TAB',
          data: { tabId: response.tabId }
        }, () => {
          console.log('🧹 Test tab cleaned up');
          resolve(true);
        });
      } else {
        console.error('❌ Failed to create ghost tab:', response?.error);
        resolve(false);
      }
    });
  });
}

async function testTabStats() {
  console.log('\n📊 Test 2: Tab Statistics');

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'GET_TAB_STATS'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Runtime error:', chrome.runtime.lastError);
        resolve(false);
        return;
      }

      if (response && response.success) {
        console.log('✅ Tab stats retrieved:');
        console.log('   - Active tabs:', response.stats.activeTabs);
        console.log('   - Queued requests:', response.stats.queuedRequests);
        console.log('   - Max concurrent:', response.stats.maxConcurrentTabs);
        console.log('   - Canvas tabs:', response.activeCanvasTabs.length);
        resolve(true);
      } else {
        console.error('❌ Failed to get tab stats:', response?.error);
        resolve(false);
      }
    });
  });
}

async function testTabExecution() {
  console.log('\n⚙️ Test 3: Tab Function Execution');

  return new Promise(async (resolve) => {
    // Create a tab
    const tabResponse = await new Promise((resolveTab) => {
      chrome.runtime.sendMessage({
        action: 'CREATE_GHOST_TAB',
        data: {
          url: 'https://httpbin.org/json',
          purpose: 'execution-test'
        }
      }, resolveTab);
    });

    if (!tabResponse.success) {
      console.error('❌ Failed to create tab for execution test');
      resolve(false);
      return;
    }

    const tabId = tabResponse.tabId;

    // Wait for page to load
    setTimeout(() => {
      chrome.runtime.sendMessage({
        action: 'EXECUTE_IN_TAB',
        data: {
          tabId: tabId,
          extractor: () => ({
            title: document.title,
            url: window.location.href,
            hasBody: !!document.body,
            timestamp: new Date().toISOString()
          })
        }
      }, (execResponse) => {
        if (execResponse && execResponse.success) {
          console.log('✅ Function executed successfully:');
          console.log('   - Title:', execResponse.result.title);
          console.log('   - URL:', execResponse.result.url);
          console.log('   - Has body:', execResponse.result.hasBody);

          chrome.runtime.sendMessage({
            action: 'CLOSE_GHOST_TAB',
            data: { tabId }
          }, () => {
            console.log('🧹 Execution test tab cleaned up');
            resolve(true);
          });
        } else {
          console.error('❌ Function execution failed:', execResponse?.error);
          chrome.runtime.sendMessage({
            action: 'CLOSE_GHOST_TAB',
            data: { tabId }
          }, () => resolve(false));
        }
      });
    }, 2000);
  });
}

async function testCanvasSimulation() {
  console.log('\n🎓 Test 4: Canvas Page Simulation');

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'CREATE_GHOST_TAB',
      data: {
        url: 'https://httpbin.org/html',
        purpose: 'canvas-simulation'
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Runtime error:', chrome.runtime.lastError);
        resolve(false);
        return;
      }

      if (response && response.success) {
        const tabId = response.tabId;
        console.log('✅ Canvas simulation tab created:', tabId);

        setTimeout(() => {
          chrome.runtime.sendMessage({
            action: 'EXECUTE_IN_TAB',
            data: {
              tabId: tabId,
              extractor: () => ({
                isCanvasPage: true,
                pageType: 'dashboard',
                courseName: 'Test Course',
                assignments: [{ name: 'Test Assignment', dueDate: '2024-01-01' }],
                userName: 'Test User',
                extractedAt: new Date().toISOString()
              })
            }
          }, (extractResponse) => {
            if (extractResponse && extractResponse.success) {
              console.log('✅ Canvas data extracted:');
              console.log('   - Page type:', extractResponse.result.pageType);
              console.log('   - Course:', extractResponse.result.courseName);
              console.log('   - User:', extractResponse.result.userName);
              console.log('   - Assignments:', extractResponse.result.assignments.length);

              chrome.runtime.sendMessage({
                action: 'CLOSE_GHOST_TAB',
                data: { tabId }
              }, () => {
                console.log('🧹 Canvas simulation tab cleaned up');
                resolve(true);
              });
            } else {
              console.error('❌ Canvas extraction failed:', extractResponse?.error);
              resolve(false);
            }
          });
        }, 2000);
      } else {
        console.error('❌ Failed to create Canvas simulation tab');
        resolve(false);
      }
    });
  });
}

// ============ PHASE 5.1: CHAT INTERFACE FUNCTIONS ============

// Open chat window function
function openChatWindow() {
  console.log('💬 Opening chat window...');
  
  // Send message to background to open chat window
  chrome.runtime.sendMessage({ action: 'OPEN_CHAT_WINDOW' }, (response) => {
    if (response && response.success) {
      console.log('✅ Chat window opened successfully:', response.windowId);
      // Close popup after opening chat
      window.close();
    } else {
      console.error('❌ Failed to open chat window:', response?.error);
      // Show error feedback to user
      showNotification('Failed to open chat window. Please try again.', 'error');
    }
  });
}

// Show notification function
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: ${type === 'error' ? '#ef4444' : '#10b981'};
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    z-index: 1000;
    animation: slideInRight 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

/**
 * Open the standalone chat window
 */
async function openChatWindow() {
  try {
    showNotification('Opening Canvas Chat Assistant...', 'info');
    
    const response = await chrome.runtime.sendMessage({
      action: 'OPEN_CHAT_WINDOW'
    });
    
    if (response && response.success) {
      showNotification('Chat window opened successfully!', 'success');
      // Close the popup after opening chat
      setTimeout(() => window.close(), 1000);
    } else {
      showNotification('Failed to open chat window', 'error');
      console.error('Failed to open chat window:', response);
    }
  } catch (error) {
    showNotification('Error opening chat window', 'error');
    console.error('Error opening chat window:', error);
  }
}
