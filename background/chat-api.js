// Canvas LMS Chat Assistant - OpenAI Chat API Integration
// Phase 2.1: Hardcoded API Setup with health checking and error handling

console.log('🤖 Chat API module loading...');

/**
 * PHASE 2.1: OpenAI Chat API Integration with hardcoded credentials
 */
class CanvasChatAPI {
  constructor() {
    // PHASE 2.1: Hardcoded API credentials
    this.apiKey = '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';
    this.projectId = 'proj_D7pj7F1PvTdg2xo2R3MVQxhv';
    
    // API configuration
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini'; // Fast and cost-effective model
    this.maxTokens = 2000;
    this.temperature = 0.3; // Slightly creative but focused
    
    // Health and monitoring
    this.isHealthy = false;
    this.lastHealthCheck = null;
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
    this.consecutiveErrors = 0;
    this.maxRetries = 3;
    this.useProjectId = true; // Will be set to false if Project ID doesn't work
    
    // Usage monitoring
    this.requestCount = 0;
    this.tokenUsage = { prompt: 0, completion: 0 };
    this.errorCount = 0;
    this.rateLimitHits = 0;
    
    console.log('🤖 CanvasChatAPI initialized with hardcoded credentials');
    
    // Start health monitoring
    this.initializeHealthChecking();
  }

  /**
   * PHASE 2.1: Initialize API health checking on startup
   */
  async initializeHealthChecking() {
    console.log('🏥 Initializing API health checking...');
    
    // Initial health check
    await this.performHealthCheck();
    
    // Set up periodic health checks
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    console.log(`✅ Health checking initialized (every ${this.healthCheckInterval / 1000 / 60} minutes)`);
  }

  /**
   * PHASE 2.1: Perform API health check
   */
  async performHealthCheck() {
    console.log('🔍 Performing API health check...');
    
    try {
      // PHASE 2.1: Try without Project ID first, then with Project ID if needed
      let response;
      
      try {
        // First attempt: without Project ID
        response = await fetch(`${this.baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log('✅ API works without Project ID');
          this.useProjectId = false; // Remember that Project ID is not needed
        } else if (response.status === 401) {
          console.log('⚠️ API failed without Project ID, trying with Project ID...');
          
          // Second attempt: with Project ID
          response = await fetch(`${this.baseUrl}/models`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'OpenAI-Project': this.projectId,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log('✅ API works with Project ID');
            this.useProjectId = true; // Remember that Project ID is needed
          }
        }
      } catch (firstError) {
        console.warn('⚠️ First attempt failed, trying with Project ID:', firstError.message);
        
        // Fallback attempt: with Project ID
        response = await fetch(`${this.baseUrl}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'OpenAI-Project': this.projectId,
            'Content-Type': 'application/json'
          }
        });
      }

      if (response.ok) {
        this.isHealthy = true;
        this.lastHealthCheck = new Date().toISOString();
        this.consecutiveErrors = 0;
        
        const models = await response.json();
        const availableModels = models.data?.length || 0;
        
        console.log(`✅ API health check passed - ${availableModels} models available`);
        
        // Store health status
        await chrome.storage.local.set({
          apiHealthy: true,
          lastApiHealthCheck: this.lastHealthCheck,
          apiErrorCount: this.consecutiveErrors
        });
        
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      this.isHealthy = false;
      this.consecutiveErrors++;
      
      console.error(`❌ API health check failed (${this.consecutiveErrors} consecutive):`, error.message);
      
      // Store health status
      await chrome.storage.local.set({
        apiHealthy: false,
        lastApiHealthCheck: new Date().toISOString(),
        apiErrorCount: this.consecutiveErrors,
        lastApiError: error.message
      });
      
      // If too many consecutive errors, notify user
      if (this.consecutiveErrors >= 5) {
        console.error('🚨 API health critical - 5+ consecutive failures');
        this.notifyHealthCritical(error.message);
      }
    }
  }

  /**
   * PHASE 2.1: Send chat message to OpenAI API
   */
  async sendChatMessage(userQuery, canvasContext = {}) {
    console.log('💬 Sending chat message to OpenAI API...');
    
    // Check API health first
    if (!this.isHealthy) {
      throw new Error('API is not healthy - recent health check failed');
    }
    
    // Prepare the system prompt
    const systemPrompt = this.buildSystemPrompt();
    
    // Prepare the user message with context
    const userMessage = this.buildUserMessage(userQuery, canvasContext);
    
    // Track request
    this.requestCount++;
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📤 API Request ${requestId}: ${userQuery.substring(0, 50)}...`);
    
    return await this.makeAPIRequestWithRetry(requestId, systemPrompt, userMessage);
  }

  /**
   * PHASE 2.1: Build system prompt for Canvas context
   */
  buildSystemPrompt() {
    return `You are a Canvas LMS Assistant for a Stanford University student. You have access to their complete Canvas data including courses, assignments, grades, announcements, and more.

Your role is to:
1. Answer questions about coursework, grades, and assignments
2. Generate homework lists and study plans
3. Create written responses for assignments when requested
4. Provide academic guidance based on their Canvas data

Guidelines:
- Be helpful, accurate, and academic in tone
- Use the provided Canvas data context to give specific, personalized answers
- When generating assignment responses, use course materials and context
- For homework lists, prioritize by due dates and importance
- Always cite specific Canvas data when relevant

The student's Canvas data is provided in the user message as JSON context.`;
  }

  /**
   * PHASE 2.1: Build user message with Canvas context
   */
  buildUserMessage(userQuery, canvasContext) {
    const contextSummary = {
      courses: canvasContext.courses?.length || 0,
      assignments: canvasContext.assignments?.length || 0,
      grades: canvasContext.grades?.length || 0,
      announcements: canvasContext.announcements?.length || 0
    };
    
    return `Student Question: ${userQuery}

Canvas Data Context:
${JSON.stringify(canvasContext, null, 2)}

Context Summary: ${contextSummary.courses} courses, ${contextSummary.assignments} assignments, ${contextSummary.grades} grades, ${contextSummary.announcements} announcements`;
  }

  /**
   * PHASE 2.1: Make API request with retry logic and error handling
   */
  async makeAPIRequestWithRetry(requestId, systemPrompt, userMessage) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 API attempt ${attempt}/${this.maxRetries} for ${requestId}`);
        
        const response = await this.makeAPIRequest(systemPrompt, userMessage);
        
        // Success - reset error count and return
        this.consecutiveErrors = 0;
        console.log(`✅ API request ${requestId} successful on attempt ${attempt}`);
        
        return response;
        
      } catch (error) {
        lastError = error;
        this.consecutiveErrors++;
        this.errorCount++;
        
        console.error(`❌ API attempt ${attempt} failed for ${requestId}:`, error.message);
        
        // Check if this is a rate limit error
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          this.rateLimitHits++;
          console.log('⏳ Rate limit hit - extending retry delay');
        }
        
        // Calculate exponential backoff delay
        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
          console.log(`⏱️ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries failed
    console.error(`💥 API request ${requestId} failed after ${this.maxRetries} attempts`);
    throw new Error(`API request failed after ${this.maxRetries} attempts. Last error: ${lastError.message}`);
  }

  /**
   * PHASE 2.1: Make single API request to OpenAI
   */
  async makeAPIRequest(systemPrompt, userMessage) {
    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      stream: false
    };
    
    // PHASE 2.1: Use Project ID only if it works (based on health check results)
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
    
    // Add Project ID if it's been validated during health check
    if (this.useProjectId !== false) {
      headers['OpenAI-Project'] = this.projectId;
    }
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Track token usage
    if (result.usage) {
      this.tokenUsage.prompt += result.usage.prompt_tokens || 0;
      this.tokenUsage.completion += result.usage.completion_tokens || 0;
    }
    
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in API response');
    }
    
    console.log(`📊 API response: ${content.length} characters, ${result.usage?.total_tokens || 'unknown'} tokens`);
    
    return content;
  }

  /**
   * PHASE 2.1: Get API status and usage statistics
   */
  getAPIStatus() {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      consecutiveErrors: this.consecutiveErrors,
      requestCount: this.requestCount,
      tokenUsage: this.tokenUsage,
      errorCount: this.errorCount,
      rateLimitHits: this.rateLimitHits,
      model: this.model
    };
  }

  /**
   * PHASE 2.1: Notify user of critical API health issues
   */
  async notifyHealthCritical(errorMessage) {
    console.error('🚨 API HEALTH CRITICAL - Multiple consecutive failures');
    
    // Store critical status
    await chrome.storage.local.set({
      apiHealthCritical: true,
      apiCriticalError: errorMessage,
      apiCriticalTime: new Date().toISOString()
    });
    
    // Could add browser notification here if needed
    // chrome.notifications.create(...) 
  }

  /**
   * PHASE 2.1: Reset API health status (for testing/recovery)
   */
  async resetHealth() {
    console.log('🔄 Resetting API health status...');
    
    this.isHealthy = false;
    this.consecutiveErrors = 0;
    this.lastHealthCheck = null;
    
    await chrome.storage.local.set({
      apiHealthy: false,
      apiHealthCritical: false,
      apiErrorCount: 0
    });
    
    // Perform fresh health check
    await this.performHealthCheck();
  }
}

// Create global instance
const canvasChatAPI = new CanvasChatAPI();

// Make it globally available
globalThis.CanvasChatAPI = CanvasChatAPI;
globalThis.canvasChatAPI = canvasChatAPI;

console.log('🤖 Chat API module loaded successfully');
