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

  // Check if we're on a Canvas page
  checkCanvasStatus();

  // Set up event listeners
  sendButton.addEventListener('click', handleSendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });
}

async function checkCanvasStatus() {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if it's a Canvas page
    const isCanvas = tab.url && (
      tab.url.includes('canvas') ||
      tab.url.includes('instructure')
    );

    updateUI(isCanvas);
  } catch (error) {
    console.error('Error checking Canvas status:', error);
    updateUI(false);
  }
}

function updateUI(isCanvas) {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const statusDiv = document.getElementById('status');

  if (isCanvas) {
    statusDiv.textContent = '✅ Connected to Canvas';
    statusDiv.className = 'status connected';
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.placeholder = 'Ask me about your courses, grades, assignments...';
  } else {
    statusDiv.textContent = '❌ Not on Canvas page';
    statusDiv.className = 'status disconnected';
    messageInput.disabled = true;
    sendButton.disabled = true;
    messageInput.placeholder = 'Please navigate to your Canvas LMS page';
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
