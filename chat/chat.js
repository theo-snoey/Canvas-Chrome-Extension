// Canvas Assistant Chat Interface - JavaScript Controller
// Phase 5.1: Universal Chat Interface Implementation

class CanvasChatInterface {
  constructor() {
    this.messages = [];
    this.conversationId = this.generateConversationId();
    this.isTyping = false;
    this.currentThread = null;
    this.settings = {
      theme: 'auto',
      responseSpeed: 'balanced',
      soundEnabled: true,
      typingIndicator: true,
      autoScroll: true
    };

    this.initializeInterface();
    this.loadSettings();
    this.connectToBackground();
    this.setupEventListeners();
    this.loadConversationHistory();
  }

  initializeInterface() {
    console.log('🎨 Initializing Canvas Chat Interface...');
    
    // Initialize DOM elements
    this.elements = {
      chatMessages: document.getElementById('chatMessages'),
      chatInput: document.getElementById('chatInput'),
      sendBtn: document.getElementById('sendBtn'),
      typingIndicator: document.getElementById('typingIndicator'),
      statusDot: document.getElementById('statusDot'),
      statusText: document.getElementById('statusText'),
      charCount: document.getElementById('charCount'),
      clearChatBtn: document.getElementById('clearChatBtn'),
      exportChatBtn: document.getElementById('exportChatBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      settingsPanel: document.getElementById('settingsPanel'),
      threadPanel: document.getElementById('threadPanel'),
      contextMenu: document.getElementById('contextMenu')
    };

    // Verify critical elements exist
    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);
    
    if (missingElements.length > 0) {
      console.warn('⚠️ Missing DOM elements:', missingElements.join(', '));
    }

    // Apply initial theme
    this.applyTheme();
    
    // Set initial status
    this.updateStatus('connecting', 'Connecting to Canvas...');
  }

  setupEventListeners() {
    // Chat input events
    this.elements.chatInput.addEventListener('input', (e) => {
      this.handleInputChange(e);
    });

    this.elements.chatInput.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    // Send button
    this.elements.sendBtn.addEventListener('click', () => {
      this.sendMessage();
    });

    // Header actions
    this.elements.clearChatBtn.addEventListener('click', () => {
      this.clearChat();
    });

    this.elements.exportChatBtn.addEventListener('click', () => {
      this.exportChat();
    });

    this.elements.settingsBtn.addEventListener('click', () => {
      this.toggleSettings();
    });

    // Settings panel events
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => {
        this.closeSettings();
      });
    }

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.updateSetting('theme', e.target.value);
      });
    }

    const responseSpeed = document.getElementById('responseSpeed');
    if (responseSpeed) {
      responseSpeed.addEventListener('change', (e) => {
        this.updateSetting('responseSpeed', e.target.value);
      });
    }

    const soundEnabled = document.getElementById('soundEnabled');
    if (soundEnabled) {
      soundEnabled.addEventListener('change', (e) => {
        this.updateSetting('soundEnabled', e.target.checked);
      });
    }

    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
      typingIndicator.addEventListener('change', (e) => {
        this.updateSetting('typingIndicator', e.target.checked);
      });
    }

    const autoScroll = document.getElementById('autoScroll');
    if (autoScroll) {
      autoScroll.addEventListener('change', (e) => {
        this.updateSetting('autoScroll', e.target.checked);
      });
    }

    // Quick action buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('quick-action-btn')) {
        const query = e.target.dataset.query;
        this.sendMessage(query);
      }
    });

    // Context menu
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.message')) {
        e.preventDefault();
        this.showContextMenu(e, e.target.closest('.message'));
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.context-menu')) {
        this.hideContextMenu();
      }
    });

    // Window events
    window.addEventListener('beforeunload', () => {
      this.saveConversationHistory();
    });

    // Auto-resize textarea
    this.elements.chatInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });
  }

  handleInputChange(e) {
    const value = e.target.value;
    const charCount = value.length;
    
    // Update character count
    this.elements.charCount.textContent = charCount;
    
    // Enable/disable send button
    this.elements.sendBtn.disabled = charCount === 0 || charCount > 2000;
    
    // Auto-resize textarea
    this.autoResizeTextarea();
  }

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      } else {
        // Send message with Enter
        e.preventDefault();
        this.sendMessage();
      }
    }
  }

  autoResizeTextarea() {
    const textarea = this.elements.chatInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  async sendMessage(messageText = null) {
    const text = messageText || this.elements.chatInput.value.trim();
    
    if (!text || text.length > 2000) {
      return;
    }

    // Create user message
    const userMessage = {
      id: this.generateMessageId(),
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      conversationId: this.conversationId
    };

    // Add to messages and display
    this.messages.push(userMessage);
    this.displayMessage(userMessage);

    // Clear input
    this.elements.chatInput.value = '';
    this.elements.charCount.textContent = '0';
    this.elements.sendBtn.disabled = true;
    this.autoResizeTextarea();

    // Show typing indicator
    if (this.settings.typingIndicator) {
      this.showTypingIndicator();
    }

    try {
      // Send to background for processing
      const response = await this.sendToBackground({
        action: 'PROCESS_CHAT_MESSAGE',
        data: {
          message: userMessage,
          conversationId: this.conversationId,
          settings: this.settings
        }
      });

      // Hide typing indicator
      this.hideTypingIndicator();

      if (response && response.success) {
        // Create assistant response
        const assistantMessage = {
          id: this.generateMessageId(),
          type: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
          conversationId: this.conversationId,
          metadata: response.metadata || {},
          nlp: {
            intent: response.metadata?.intent,
            confidence: response.metadata?.confidence,
            parameters: response.metadata?.parameters,
            suggestions: response.metadata?.suggestions,
            nlpEnabled: response.metadata?.nlpEnabled
          }
        };

        this.messages.push(assistantMessage);
        this.displayMessage(assistantMessage);

        // Show NLP insights if available (for development)
        if (assistantMessage.nlp.nlpEnabled && assistantMessage.nlp.intent) {
          console.log('🧠 NLP Insights:', {
            intent: assistantMessage.nlp.intent,
            confidence: `${(assistantMessage.nlp.confidence * 100).toFixed(1)}%`,
            parameters: assistantMessage.nlp.parameters,
            suggestions: assistantMessage.nlp.suggestions
          });
        }

        // Play notification sound
        if (this.settings.soundEnabled) {
          this.playNotificationSound();
        }
      } else {
        // Show error message
        this.displayErrorMessage('Sorry, I encountered an error processing your message. Please try again.');
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      this.hideTypingIndicator();
      this.displayErrorMessage('Connection error. Please check your internet connection and try again.');
    }

    // Auto-scroll to bottom
    if (this.settings.autoScroll) {
      this.scrollToBottom();
    }

    // Save conversation
    this.saveConversationHistory();
  }

  displayMessage(message) {
    const messageElement = this.createMessageElement(message);
    
    // Remove welcome message if it exists
    const welcomeMessage = this.elements.chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        welcomeMessage.remove();
      }, 300);
    }

    this.elements.chatMessages.appendChild(messageElement);
    
    // Animate message appearance
    messageElement.style.animation = 'slideIn 0.3s ease-out forwards';
  }

  createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    messageDiv.dataset.messageId = message.id;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.textContent = message.content;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = this.formatTime(message.timestamp);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';

    // Add action buttons
    const copyBtn = this.createActionButton('copy', 'Copy');
    const editBtn = this.createActionButton('edit', 'Edit');
    const deleteBtn = this.createActionButton('delete', 'Delete');

    actionsDiv.appendChild(copyBtn);
    if (message.type === 'user') {
      actionsDiv.appendChild(editBtn);
    }
    actionsDiv.appendChild(deleteBtn);

    metaDiv.appendChild(timeSpan);
    metaDiv.appendChild(actionsDiv);

    contentDiv.appendChild(bubbleDiv);
    contentDiv.appendChild(metaDiv);
    messageDiv.appendChild(contentDiv);

    return messageDiv;
  }

  createActionButton(action, title) {
    const button = document.createElement('button');
    button.className = 'message-action-btn';
    button.title = title;
    button.dataset.action = action;

    const icons = {
      copy: '📋',
      edit: '✏️',
      delete: '🗑️',
      thread: '🧵',
      bookmark: '🔖'
    };

    button.textContent = icons[action] || '•';
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleMessageAction(action, button.closest('.message'));
    });

    return button;
  }

  handleMessageAction(action, messageElement) {
    const messageId = messageElement.dataset.messageId;
    const message = this.messages.find(m => m.id === messageId);

    switch (action) {
      case 'copy':
        this.copyMessage(message);
        break;
      case 'edit':
        this.editMessage(message, messageElement);
        break;
      case 'delete':
        this.deleteMessage(messageId, messageElement);
        break;
      case 'thread':
        this.startThread(message);
        break;
      case 'bookmark':
        this.bookmarkMessage(message);
        break;
    }
  }

  copyMessage(message) {
    navigator.clipboard.writeText(message.content).then(() => {
      this.showToast('Message copied to clipboard');
    });
  }

  editMessage(message, messageElement) {
    if (message.type !== 'user') return;

    const bubble = messageElement.querySelector('.message-bubble');
    const originalContent = bubble.textContent;

    // Create input field
    const input = document.createElement('textarea');
    input.value = originalContent;
    input.className = 'edit-input';
    input.style.cssText = `
      width: 100%;
      border: 1px solid var(--primary-color);
      border-radius: var(--radius-md);
      padding: 0.5rem;
      font-family: inherit;
      font-size: inherit;
      background: var(--background-color);
      color: var(--text-primary);
      resize: vertical;
      min-height: 40px;
    `;

    // Replace bubble with input
    bubble.replaceWith(input);
    input.focus();
    input.select();

    const saveEdit = () => {
      const newContent = input.value.trim();
      if (newContent && newContent !== originalContent) {
        message.content = newContent;
        message.edited = true;
        message.editedAt = new Date().toISOString();
      }
      
      const newBubble = document.createElement('div');
      newBubble.className = 'message-bubble';
      newBubble.textContent = message.content;
      if (message.edited) {
        newBubble.title = `Edited ${this.formatTime(message.editedAt)}`;
        newBubble.style.opacity = '0.9';
      }
      
      input.replaceWith(newBubble);
      this.saveConversationHistory();
    };

    const cancelEdit = () => {
      const newBubble = document.createElement('div');
      newBubble.className = 'message-bubble';
      newBubble.textContent = originalContent;
      input.replaceWith(newBubble);
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });

    input.addEventListener('blur', saveEdit);
  }

  deleteMessage(messageId, messageElement) {
    if (confirm('Are you sure you want to delete this message?')) {
      this.messages = this.messages.filter(m => m.id !== messageId);
      messageElement.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        messageElement.remove();
        this.saveConversationHistory();
      }, 300);
    }
  }

  showTypingIndicator() {
    if (!this.settings.typingIndicator) return;
    
    this.isTyping = true;
    this.elements.typingIndicator.style.display = 'flex';
    this.scrollToBottom();
  }

  hideTypingIndicator() {
    this.isTyping = false;
    this.elements.typingIndicator.style.display = 'none';
  }

  displayErrorMessage(errorText) {
    const errorMessage = {
      id: this.generateMessageId(),
      type: 'assistant',
      content: errorText,
      timestamp: new Date().toISOString(),
      isError: true
    };

    const messageElement = this.createMessageElement(errorMessage);
    messageElement.classList.add('error-message');
    messageElement.style.opacity = '0.8';
    
    this.elements.chatMessages.appendChild(messageElement);
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.settings.autoScroll) {
      this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--surface-color);
      color: var(--text-primary);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-md);
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  playNotificationSound() {
    if (this.settings.soundEnabled) {
      // Create a subtle notification sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  }

  // Settings Management
  loadSettings() {
    const saved = localStorage.getItem('canvas-chat-settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
    this.applySettings();
  }

  saveSettings() {
    localStorage.setItem('canvas-chat-settings', JSON.stringify(this.settings));
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.applySettings();
  }

  applySettings() {
    // Apply theme
    this.applyTheme();
    
    // Update UI elements safely
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = this.settings.theme;
    
    const responseSpeed = document.getElementById('responseSpeed');
    if (responseSpeed) responseSpeed.value = this.settings.responseSpeed;
    
    const soundEnabled = document.getElementById('soundEnabled');
    if (soundEnabled) soundEnabled.checked = this.settings.soundEnabled;
    
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) typingIndicator.checked = this.settings.typingIndicator;
    
    const autoScroll = document.getElementById('autoScroll');
    if (autoScroll) autoScroll.checked = this.settings.autoScroll;
  }

  applyTheme() {
    const theme = this.settings.theme;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  toggleSettings() {
    if (this.elements.settingsPanel) {
      this.elements.settingsPanel.classList.toggle('open');
      const isOpen = this.elements.settingsPanel.classList.contains('open');
      
      // Update button visual state
      if (this.elements.settingsBtn) {
        if (isOpen) {
          this.elements.settingsBtn.classList.add('active');
        } else {
          this.elements.settingsBtn.classList.remove('active');
        }
      }
      
      console.log('⚙️ Settings panel:', isOpen ? 'opened' : 'closed');
    }
  }

  closeSettings() {
    if (this.elements.settingsPanel) {
      this.elements.settingsPanel.classList.remove('open');
    }
    
    // Remove active state from button
    if (this.elements.settingsBtn) {
      this.elements.settingsBtn.classList.remove('active');
    }
  }

  // Chat Management
  clearChat() {
    if (confirm('Are you sure you want to clear all messages?')) {
      this.messages = [];
      this.elements.chatMessages.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-icon">👋</div>
          <h2>Welcome back to Canvas Assistant!</h2>
          <p>Your chat has been cleared. How can I help you today?</p>
        </div>
      `;
      this.saveConversationHistory();
    }
  }

  exportChat() {
    const chatData = {
      conversationId: this.conversationId,
      messages: this.messages,
      exportedAt: new Date().toISOString(),
      settings: this.settings
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Chat exported successfully');
  }

  // Conversation History
  saveConversationHistory() {
    const historyData = {
      conversationId: this.conversationId,
      messages: this.messages,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('canvas-chat-history', JSON.stringify(historyData));
  }

  loadConversationHistory() {
    const saved = localStorage.getItem('canvas-chat-history');
    if (saved) {
      try {
        const historyData = JSON.parse(saved);
        this.conversationId = historyData.conversationId;
        this.messages = historyData.messages || [];

        // Display saved messages
        if (this.messages.length > 0) {
          // Remove welcome message
          const welcomeMessage = this.elements.chatMessages.querySelector('.welcome-message');
          if (welcomeMessage) {
            welcomeMessage.remove();
          }

          // Display all saved messages
          this.messages.forEach(message => {
            this.displayMessage(message);
          });

          this.scrollToBottom();
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }
  }

  // Background Communication
  async connectToBackground() {
    try {
      const response = await this.sendToBackground({
        action: 'CHAT_INTERFACE_READY',
        data: { conversationId: this.conversationId }
      });

      if (response && response.success) {
        this.updateStatus('connected', 'Connected to Canvas');
      } else {
        this.updateStatus('error', 'Connection failed');
      }
    } catch (error) {
      console.error('Failed to connect to background:', error);
      this.updateStatus('error', 'Connection error');
    }
  }

  async sendToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response);
      });
    });
  }

  updateStatus(status, text) {
    this.elements.statusDot.className = `status-dot ${status}`;
    this.elements.statusText.textContent = text;
  }

  // Context Menu
  showContextMenu(event, messageElement) {
    const contextMenu = this.elements.contextMenu;
    contextMenu.style.display = 'block';
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    
    contextMenu.dataset.messageId = messageElement.dataset.messageId;
  }

  hideContextMenu() {
    this.elements.contextMenu.style.display = 'none';
  }

  // Utility Functions
  generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateMessageId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Initialize chat interface when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Canvas Chat Interface starting...');
  window.canvasChat = new CanvasChatInterface();




});

// Handle theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (window.canvasChat && window.canvasChat.settings.theme === 'auto') {
    window.canvasChat.applyTheme();
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
  }
  
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
