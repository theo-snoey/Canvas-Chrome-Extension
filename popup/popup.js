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

  // Set up event listeners
  sendButton.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleBackgroundMessage);

  // Check Canvas status on popup open
  checkCanvasStatus();
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
