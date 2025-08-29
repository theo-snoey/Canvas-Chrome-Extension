// Canvas LMS Natural Language Processing Engine
// Phase 5.2: Intelligent query understanding and response generation

class CanvasNLPProcessor {
  constructor() {
    this.intents = {
      GRADES: 'grades',
      ASSIGNMENTS: 'assignments', 
      COURSES: 'courses',
      SCHEDULE: 'schedule',
      ANNOUNCEMENTS: 'announcements',
      DISCUSSIONS: 'discussions',
      SYLLABUS: 'syllabus',
      QUIZZES: 'quizzes',
      HELP: 'help',
      GREETING: 'greeting',
      GOODBYE: 'goodbye',
      UNKNOWN: 'unknown'
    };

    // Intent patterns with confidence scoring
    this.intentPatterns = {
      [this.intents.GRADES]: {
        keywords: ['grade', 'grades', 'score', 'points', 'gpa', 'average', 'performance', 'mark', 'percentage'],
        phrases: [
          'what is my grade',
          'how am i doing',
          'my current grade',
          'grade in',
          'what do i need',
          'grade calculation',
          'final grade',
          'overall grade'
        ],
        weight: 1.0
      },
      [this.intents.ASSIGNMENTS]: {
        keywords: ['assignment', 'assignments', 'homework', 'due', 'submit', 'deadline', 'task', 'project', 'essay', 'paper'],
        phrases: [
          'assignments due',
          'what is due',
          'homework for',
          'upcoming assignments',
          'assignment list',
          'due this week',
          'due today',
          'submit by'
        ],
        weight: 1.0
      },
      [this.intents.COURSES]: {
        keywords: ['course', 'courses', 'class', 'classes', 'subject', 'enrolled', 'taking'],
        phrases: [
          'my courses',
          'what classes',
          'enrolled in',
          'course list',
          'class schedule',
          'course information'
        ],
        weight: 0.9
      },
      [this.intents.SCHEDULE]: {
        keywords: ['schedule', 'calendar', 'time', 'when', 'meeting', 'lecture', 'class time'],
        phrases: [
          'my schedule',
          'class schedule',
          'when is',
          'what time',
          'calendar events',
          'upcoming events'
        ],
        weight: 0.9
      },
      [this.intents.ANNOUNCEMENTS]: {
        keywords: ['announcement', 'announcements', 'news', 'updates', 'posted', 'notification'],
        phrases: [
          'recent announcements',
          'new announcements',
          'what announcements',
          'any updates',
          'posted announcements'
        ],
        weight: 0.8
      },
      [this.intents.DISCUSSIONS]: {
        keywords: ['discussion', 'discussions', 'forum', 'post', 'reply', 'thread'],
        phrases: [
          'discussion posts',
          'forum discussions',
          'discussion board',
          'recent discussions'
        ],
        weight: 0.8
      },
      [this.intents.SYLLABUS]: {
        keywords: ['syllabus'],
        phrases: ['show the syllabus', 'course syllabus', 'syllabus for'],
        weight: 0.9
      },
      [this.intents.QUIZZES]: {
        keywords: ['quiz', 'quizzes', 'test', 'exam'],
        phrases: ['what quizzes', 'show quizzes', 'quizzes due'],
        weight: 0.9
      },
      [this.intents.GREETING]: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        phrases: [
          'hello',
          'hi there',
          'good morning',
          'hey canvas',
          'hello assistant'
        ],
        weight: 0.7
      },
      [this.intents.HELP]: {
        keywords: ['help', 'how', 'what can you do', 'commands', 'features'],
        phrases: [
          'help me',
          'what can you do',
          'how do i',
          'show me help',
          'available commands'
        ],
        weight: 0.6
      },
      [this.intents.GOODBYE]: {
        keywords: ['bye', 'goodbye', 'see you', 'thanks', 'thank you'],
        phrases: [
          'goodbye',
          'see you later',
          "thanks for help",
          "that's all"
        ],
        weight: 0.5
      }
    };

    // Parameter extraction patterns
    this.parameterPatterns = {
      courseName: {
        patterns: [
          // Any text in quotes (double/single/smart quotes) - HIGHEST PRIORITY
          /["""''']([^"""''']+)["""''']/g,
          // Specific patterns for quizzes/assignments with "in" or "for"
          /(?:quizzes?|assignments?|syllabus)\s+(?:for|in)\s+["""'''"]?([^"""'''?\n]+?)["""'''"]?(?:\?|$)/gi,
          // What quizzes do I have in <Course Name>
          /(?:what|show|list)\s+(?:quizzes?|assignments?)\s+.*?(?:in|for)\s+["""'''"]?([^"""'''?\n]{3,}?)["""'''"]?(?:\?|$)/gi,
          // Course codes like MATH 101
          /(?:in|for|from)\s+([A-Z]{2,4}\s*\d{3}[A-Z]?)/gi,
          /(?:course|class)\s+([A-Z]{2,4}\s*\d{3}[A-Z]?)/gi,
          /([A-Z]{2,4}\s*\d{3}[A-Z]?)/g,
          // Year + descriptive name patterns like "2025 French Placement"
          /(?:in|for)\s+(\d{4}\s+[A-Za-z][A-Za-z\s]{2,})/gi,
          // Direct match for "2025 French Placement" style patterns
          /(?:in|for|have in)\s+['""]?(\d{4}\s+[A-Za-z]+(?:\s+[A-Za-z]+)*)['""]?/gi,
          // Generic: for/in <Course Name> (catch-all)
          /(?:for|in)\s+([A-Za-z][A-Za-z0-9()&,''"\-: ]{2,}?)(?:\s*\?|$)/gi
        ]
      },
      timeFrame: {
        patterns: [
          /(this week|next week|today|tomorrow|this month)/gi,
          /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
          /(\d{1,2}\/\d{1,2})/g,
          /(january|february|march|april|may|june|july|august|september|october|november|december)/gi
        ]
      },
      gradeTarget: {
        patterns: [
          /(?:get|need|want)\s+(?:an?\s+)?([A-F][+-]?)/gi,
          /(?:get|need|want)\s+(\d{1,3}(?:\.\d+)?%?)/gi
        ]
      },
      assignmentType: {
        patterns: [
          /(exam|quiz|test|midterm|final|project|essay|paper|homework|assignment)/gi
        ]
      }
    };

    this.conversationContext = {
      lastIntent: null,
      lastCourse: null,
      lastTimeFrame: null,
      conversationHistory: []
    };
  }

  /**
   * Process natural language query and generate response
   */
  async processQuery(query, conversationId, canvasData) {
    console.log('🧠 Processing NLP query:', query);
    
    try {
      // Step 1: Parse and understand the query
      const analysis = this.analyzeQuery(query);
      
      // Step 2: Extract parameters
      const parameters = this.extractParameters(query);
      
      // Step 3: Update conversation context
      this.updateContext(analysis, parameters, conversationId);
      
      // Step 4: Generate response based on intent and data
      const response = await this.generateResponse(analysis, parameters, canvasData);
      
      // Step 5: Add response metadata
      const responseData = {
        intent: analysis.intent,
        confidence: analysis.confidence,
        parameters: parameters,
        response: response,
        suggestions: this.generateSuggestions(analysis.intent, parameters),
        timestamp: new Date().toISOString(),
        conversationId: conversationId
      };

      console.log('✅ NLP processing complete:', {
        intent: analysis.intent,
        confidence: analysis.confidence,
        parametersFound: Object.keys(parameters).length
      });

      return responseData;

    } catch (error) {
      console.error('❌ NLP processing failed:', error);
      return {
        intent: this.intents.UNKNOWN,
        confidence: 0,
        parameters: {},
        response: "I'm having trouble understanding your question. Could you please rephrase it or be more specific about what you'd like to know about your Canvas coursework?",
        suggestions: ['Try asking about grades, assignments, or courses', 'Be more specific with course names or dates'],
        timestamp: new Date().toISOString(),
        conversationId: conversationId,
        error: error.message
      };
    }
  }

  /**
   * Analyze query to determine intent and confidence
   */
  analyzeQuery(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const words = normalizedQuery.split(/\s+/);
    
    let bestIntent = this.intents.UNKNOWN;
    let bestScore = 0;
    let scores = {};

    // Calculate scores for each intent
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      let score = 0;
      
      // Keyword matching
      for (const keyword of pattern.keywords) {
        if (normalizedQuery.includes(keyword.toLowerCase())) {
          score += pattern.weight;
        }
      }
      
      // Phrase matching (higher weight)
      for (const phrase of pattern.phrases) {
        if (normalizedQuery.includes(phrase.toLowerCase())) {
          score += pattern.weight * 2;
        }
      }
      
      // Word proximity bonus
      const keywordMatches = pattern.keywords.filter(kw => 
        normalizedQuery.includes(kw.toLowerCase())
      );
      
      if (keywordMatches.length > 1) {
        score += 0.5; // Bonus for multiple keyword matches
      }
      
      scores[intent] = score;
      
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    // Normalize confidence (0-1 scale)
    const confidence = Math.min(bestScore / 3, 1.0);
    
    return {
      intent: bestIntent,
      confidence: confidence,
      allScores: scores,
      queryLength: words.length,
      normalizedQuery: normalizedQuery
    };
  }

  /**
   * Extract parameters from query
   */
  extractParameters(query) {
    const parameters = {};
    
    console.log('🔍 Extracting parameters from query:', query);
    
    for (const [paramType, config] of Object.entries(this.parameterPatterns)) {
      const matches = [];
      
      for (const pattern of config.patterns) {
        const found = [...query.matchAll(pattern)];
        const patternMatches = found.map(match => match[1] || match[0]);
        if (patternMatches.length > 0) {
          console.log(`🔍 Pattern ${pattern} matched:`, patternMatches);
        }
        matches.push(...patternMatches);
      }
      
      if (matches.length > 0) {
        parameters[paramType] = [...new Set(matches)]; // Remove duplicates
        console.log(`🔍 Final ${paramType} parameter:`, parameters[paramType]);
      }
    }
    
    console.log('🔍 All extracted parameters:', parameters);
    return parameters;
  }

  /**
   * Update conversation context
   */
  updateContext(analysis, parameters, conversationId) {
    this.conversationContext.lastIntent = analysis.intent;
    
    if (parameters.courseName && parameters.courseName.length > 0) {
      this.conversationContext.lastCourse = parameters.courseName[0];
    }
    
    if (parameters.timeFrame && parameters.timeFrame.length > 0) {
      this.conversationContext.lastTimeFrame = parameters.timeFrame[0];
    }
    
    // Keep conversation history (last 5 exchanges)
    this.conversationContext.conversationHistory.push({
      intent: analysis.intent,
      parameters: parameters,
      timestamp: new Date().toISOString()
    });
    
    if (this.conversationContext.conversationHistory.length > 5) {
      this.conversationContext.conversationHistory.shift();
    }
  }

  /**
   * Generate contextual response based on intent and available data
   */
  async generateResponse(analysis, parameters, canvasData) {
    const { intent, confidence } = analysis;
    
    // Low confidence fallback
    if (confidence < 0.3) {
      return this.generateLowConfidenceResponse(analysis, parameters);
    }

    switch (intent) {
      case this.intents.GREETING:
        return this.generateGreetingResponse(canvasData);
        
      case this.intents.GRADES:
        return await this.generateGradesResponse(parameters, canvasData);
        
      case this.intents.ASSIGNMENTS:
        return await this.generateAssignmentsResponse(parameters, canvasData);
        
      case this.intents.COURSES:
        return await this.generateCoursesResponse(parameters, canvasData);
        
      case this.intents.SCHEDULE:
        return await this.generateScheduleResponse(parameters, canvasData);
        
      case this.intents.ANNOUNCEMENTS:
        return await this.generateAnnouncementsResponse(parameters, canvasData);
        
      case this.intents.DISCUSSIONS:
        return await this.generateDiscussionsResponse(parameters, canvasData);
        
      case this.intents.SYLLABUS:
        return await this.generateSyllabusResponse(parameters, canvasData);

      case this.intents.QUIZZES:
        return await this.generateQuizzesResponse(parameters, canvasData);
        
      case this.intents.HELP:
        return this.generateHelpResponse();
        
      case this.intents.GOODBYE:
        return this.generateGoodbyeResponse();
        
      default:
        return this.generateUnknownResponse(analysis, parameters);
    }
  }

  /**
   * Generate greeting response with Canvas status
   */
  generateGreetingResponse(canvasData) {
    const greetings = [
      "Hello! I'm your Canvas Assistant. I'm here to help with your coursework.",
      "Hi there! Ready to help you with your Canvas questions.",
      "Good to see you! What would you like to know about your courses?"
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    if (canvasData && canvasData.courses && canvasData.courses.length > 0) {
      return `${greeting} I can see you're enrolled in ${canvasData.courses.length} courses. What would you like to know?`;
    }
    
    return `${greeting} I can help you with grades, assignments, course information, and more!`;
  }

  /**
   * Generate grades response
   */
  async generateGradesResponse(parameters, canvasData) {
    if (!canvasData) {
      return "I don't have access to your Canvas data right now. Please make sure you're logged into Canvas and the autonomous data collection is running.";
    }

    // Collect grade data from various sources
    const allGrades = [];
    
    if (canvasData.grades && Array.isArray(canvasData.grades)) {
      allGrades.push(...canvasData.grades);
    }

    // Get course information for context
    const courses = canvasData.courses || [];
    
    if (allGrades.length === 0 && courses.length === 0) {
      return "I don't have access to your grade data. This could mean:\n• The autonomous data collection hasn't gathered grade information yet\n• You might need to visit your Canvas gradebook to refresh the data\n• Your courses may not have grades posted yet";
    }

    let response = "";

    // If specific course mentioned
    if (parameters.courseName && parameters.courseName.length > 0) {
      const targetCourse = parameters.courseName[0].toLowerCase();
      
      // Find matching course
      const matchingCourse = courses.find(course => 
        course.name?.toLowerCase().includes(targetCourse) ||
        course.title?.toLowerCase().includes(targetCourse) ||
        course.id?.toLowerCase().includes(targetCourse)
      );
      
      if (!matchingCourse) {
        return `I couldn't find a course matching "${parameters.courseName[0]}". Here are your current courses:\n\n${courses.map(course => `• ${course.name || course.title}`).join('\n')}\n\nTry asking about one of these courses specifically.`;
      }
      
      // Find grades for this course
      const courseGrades = allGrades.filter(grade => 
        grade.courseId === matchingCourse.id ||
        grade.courseName?.toLowerCase().includes(targetCourse)
      );
      
      response = `📊 **Grades for ${matchingCourse.name || matchingCourse.title}**\n\n`;
      
      if (courseGrades.length === 0) {
        response += "I don't see any specific grade data for this course yet. This could mean:\n";
        response += "• Grades haven't been posted yet\n";
        response += "• The autonomous system hasn't collected grade details for this course\n";
        response += "• You might need to visit the Canvas gradebook directly\n\n";
        response += `💡 Try visiting the ${matchingCourse.name} gradebook in Canvas to see current grades.`;
      } else {
        courseGrades.forEach((grade, index) => {
          const assignmentName = grade.assignmentName || grade.name || 'Assignment';
          const score = grade.score !== undefined ? grade.score : 'No score';
          const maxPoints = grade.maxPoints || grade.points || '';
          const gradeText = grade.grade || '';
          
          response += `${index + 1}. **${assignmentName}**`;
          if (score !== 'No score' && maxPoints) {
            response += ` - ${score}/${maxPoints}`;
          } else if (score !== 'No score') {
            response += ` - ${score}`;
          }
          if (gradeText && gradeText !== score) {
            response += ` (${gradeText})`;
          }
          response += '\n';
        });
      }
      
      // If grade target mentioned
      if (parameters.gradeTarget && parameters.gradeTarget.length > 0) {
        const target = parameters.gradeTarget[0];
        response += `\n🎯 **Target Grade: ${target}**\n`;
        response += "I'm working on implementing grade calculation features to help you determine what scores you need on upcoming assignments to reach your target grade.";
      }
      
    } else {
      // Show overview of all grades
      response = "📊 **Your Grade Overview**\n\n";
      
      if (courses.length > 0) {
        response += `**Current Courses (${courses.length}):**\n`;
        courses.forEach((course, index) => {
          const courseName = course.name || course.title || 'Unnamed Course';
          
          // Try to find current grade for this course
          const courseGrades = allGrades.filter(grade => 
            grade.courseId === course.id ||
            grade.courseName?.toLowerCase() === courseName.toLowerCase()
          );
          
          let gradeInfo = '';
          if (courseGrades.length > 0) {
            // Calculate average or show overall grade
            const validGrades = courseGrades.filter(g => g.score !== undefined && g.maxPoints !== undefined);
            if (validGrades.length > 0) {
              const totalEarned = validGrades.reduce((sum, g) => sum + g.score, 0);
              const totalPossible = validGrades.reduce((sum, g) => sum + g.maxPoints, 0);
              const percentage = totalPossible > 0 ? (totalEarned / totalPossible * 100).toFixed(1) : 'N/A';
              gradeInfo = ` - ${percentage}%`;
            }
          } else {
            gradeInfo = ' - No grades available';
          }
          
          response += `${index + 1}. **${courseName}**${gradeInfo}\n`;
        });
      }
      
      if (allGrades.length > 0) {
        response += `\n📈 **Recent Grades:**\n`;
        const recentGrades = allGrades.slice(-5); // Show last 5 grades
        recentGrades.forEach((grade, index) => {
          const assignmentName = grade.assignmentName || grade.name || 'Assignment';
          const courseName = grade.courseName || 'Course';
          const score = grade.score !== undefined ? grade.score : 'No score';
          const maxPoints = grade.maxPoints || grade.points || '';
          const gradeText = grade.grade || '';
          
          response += `• **${assignmentName}** (${courseName})`;
          if (score !== 'No score' && maxPoints) {
            response += ` - ${score}/${maxPoints}`;
          } else if (gradeText) {
            response += ` - ${gradeText}`;
          }
          response += '\n';
        });
      }
      
      response += `\n💡 **Tips:**\n`;
      response += `• Ask about a specific course: "What's my grade in Biology?"\n`;
      response += `• Set grade goals: "What do I need on the final to get an A in Math?"\n`;
      response += `• Check recent grades: "Show me my latest grades"`;
    }

    return response;
  }

  /**
   * Generate assignments response
   */
  async generateAssignmentsResponse(parameters, canvasData) {
    let response = "";
    
    if (!canvasData) {
      return "I don't have access to your Canvas data right now. Please make sure you're logged into Canvas and try again.";
    }

    // Collect all assignments from various sources
    const allAssignments = [];

    // Helper to normalize a date-like field
    const normalizeDate = (val) => {
      if (!val) return '';
      try {
        if (val instanceof Date) return val.toISOString();
        // Some sources store timestamp strings or numbers
        const d = typeof val === 'number' ? new Date(val) : new Date(String(val));
        if (!isNaN(d.getTime())) return d.toISOString();
      } catch {}
      // Try to parse simple textual forms like "Due: Tue" by falling back to today
      return '';
    };
    
    // Add assignments from direct assignment data
    if (canvasData.assignments && Array.isArray(canvasData.assignments)) {
      allAssignments.push(...canvasData.assignments.map(a => ({
        ...a,
        dueDate: a.dueDate || a.due || a.due_at || normalizeDate(a.startDate || a.endDate)
      })));
    }
    
    // Add assignments from todo list
    if (canvasData.todo && Array.isArray(canvasData.todo)) {
      const todoAssignments = canvasData.todo.filter(item => 
        item.type === 'assignment' || 
        item.title?.toLowerCase().includes('assignment') ||
        item.title?.toLowerCase().includes('homework') ||
        item.title?.toLowerCase().includes('project')
      );
      allAssignments.push(...todoAssignments.map(item => ({
        ...item,
        name: item.title,
        courseName: item.courseName,
        dueDate: item.dueDate || item.datetime || normalizeDate(item.startDate || item.endDate),
        isFromTodo: true
      })));
    }

    // Add assignments from calendar events
    if (canvasData.calendar && Array.isArray(canvasData.calendar)) {
      const calendarAssignments = canvasData.calendar.filter(event =>
        event.type === 'assignment' ||
        event.title?.toLowerCase().includes('assignment') ||
        event.title?.toLowerCase().includes('due')
      );
      allAssignments.push(...calendarAssignments.map(event => ({
        ...event,
        name: event.title,
        dueDate: normalizeDate(event.startDate || event.endDate || event.datetime),
        isFromCalendar: true
      })));
    }

    if (allAssignments.length === 0) {
      return "I don't see any assignment data in your Canvas information. This could mean:\n• You don't have any assignments right now\n• The autonomous data collection hasn't run recently\n• You might need to visit your Canvas dashboard to refresh the data";
    }

    // Filter assignments based on parameters
    let filteredAssignments = [...allAssignments];
    
    // Time frame filtering
    if (parameters.timeFrame && parameters.timeFrame.length > 0) {
      const timeFrame = parameters.timeFrame[0].toLowerCase();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const thisWeekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekEnd = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      filteredAssignments = filteredAssignments.filter(assignment => {
        if (!assignment.dueDate) return false;
        const dueDate = new Date(assignment.dueDate);
        
        switch (timeFrame) {
          case 'today':
            return dueDate >= today && dueDate < tomorrow;
          case 'tomorrow':
            return dueDate >= tomorrow && dueDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
          case 'this week':
            return dueDate >= today && dueDate < thisWeekEnd;
          case 'next week':
            return dueDate >= thisWeekEnd && dueDate < nextWeekEnd;
          case 'this month':
            const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return dueDate >= today && dueDate <= thisMonthEnd;
          default:
            return true;
        }
      });
      
      if (filteredAssignments.length === 0) {
        return `I don't see any assignments due ${timeFrame}. You're all caught up for that time period! 🎉`;
      }
    }

    // Course filtering
    if (parameters.courseName && parameters.courseName.length > 0) {
      const targetCourse = parameters.courseName[0].toLowerCase();
      filteredAssignments = filteredAssignments.filter(assignment => 
        assignment.courseName?.toLowerCase().includes(targetCourse) ||
        assignment.courseId?.toLowerCase().includes(targetCourse)
      );
      
      if (filteredAssignments.length === 0) {
        return `I don't see any assignments for "${parameters.courseName[0]}" right now.`;
      }
    }

    // Sort assignments by due date (earliest first)
    filteredAssignments.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // Generate response
    const timeFrameText = parameters.timeFrame && parameters.timeFrame.length > 0 
      ? ` ${parameters.timeFrame[0]}` 
      : '';
    const courseText = parameters.courseName && parameters.courseName.length > 0
      ? ` for ${parameters.courseName[0]}`
      : '';
    
    response += `Here are your assignments${timeFrameText}${courseText}:\n\n`;

    // List assignments (limit to top 10 for readability)
    const displayAssignments = filteredAssignments.slice(0, 10);
    
    displayAssignments.forEach((assignment, index) => {
      const name = assignment.name || assignment.title || 'Unnamed Assignment';
      const course = assignment.courseName ? ` (${assignment.courseName})` : '';
      
      let dueDateText = '';
      if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        const diffTime = dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          dueDateText = ` - ⚠️ OVERDUE (${Math.abs(diffDays)} days ago)`;
        } else if (diffDays === 0) {
          dueDateText = ` - 🔥 DUE TODAY`;
        } else if (diffDays === 1) {
          dueDateText = ` - ⏰ Due tomorrow`;
        } else if (diffDays <= 7) {
          dueDateText = ` - Due in ${diffDays} days`;
        } else {
          dueDateText = ` - Due ${dueDate.toLocaleDateString()}`;
        }
      }
      
      response += `${index + 1}. **${name}**${course}${dueDateText}\n`;
    });

    if (filteredAssignments.length > 10) {
      response += `\n... and ${filteredAssignments.length - 10} more assignments.`;
    }

    // Add helpful suggestions
    response += `\n\n💡 **Tips:**\n`;
    response += `• Ask about a specific course: "What assignments do I have in Biology?"\n`;
    response += `• Check due dates: "What's due this week?" or "What's due tomorrow?"\n`;
    response += `• Get help with priorities: "Help me prioritize my assignments"`;

    return response;
  }

  /**
   * Generate courses response
   */
  async generateCoursesResponse(parameters, canvasData) {
    if (!canvasData) {
      return "I don't have access to your course data at the moment. Please make sure you're logged into Canvas and the autonomous data collection is running.";
    }

    // Synthesize courses from any available data if missing
    let courses = Array.isArray(canvasData.courses) ? [...canvasData.courses] : [];
    const addCourse = (id, name) => {
      if (!name) return;
      if (!courses.some(c => (c.id && id && c.id === id) || (c.name && c.name === name))) {
        courses.push({ id, name });
      }
    };
    // From assignments
    if (Array.isArray(canvasData.assignments)) {
      canvasData.assignments.forEach(a => addCourse(a.courseId, a.courseName));
    }
    // From grades
    if (Array.isArray(canvasData.grades)) {
      canvasData.grades.forEach(g => addCourse(g.courseId, g.courseName));
    }
    // From announcements/discussions
    if (Array.isArray(canvasData.announcements)) {
      canvasData.announcements.forEach(x => addCourse(x.courseId, x.courseName));
    }
    if (Array.isArray(canvasData.discussions)) {
      canvasData.discussions.forEach(x => addCourse(x.courseId, x.courseName));
    }

    if (courses.length === 0) {
      return "I don't see any courses in your current data. This might mean:\n• You're not enrolled in any courses this semester\n• The autonomous data collection hasn't run recently\n• You might need to visit your Canvas dashboard to refresh the data";
    }

    let response = `📚 **Your Current Courses (${canvasData.courses.length}):**\n\n`;
    
    // If specific course requested
    if (parameters.courseName && parameters.courseName.length > 0) {
      const targetCourse = parameters.courseName[0].toLowerCase();
      const matchingCourses = canvasData.courses.filter(course => 
        course.name?.toLowerCase().includes(targetCourse) ||
        course.title?.toLowerCase().includes(targetCourse) ||
        course.id?.toLowerCase().includes(targetCourse)
      );
      
      if (matchingCourses.length === 0) {
        return `I couldn't find a course matching "${parameters.courseName[0]}". Here are your current courses:\n\n${canvasData.courses.map(course => `• ${course.name || course.title}`).join('\n')}`;
      }
      
      // Show detailed info for specific course
      const course = matchingCourses[0];
      response = `📖 **${course.name || course.title}**\n\n`;
      
      if (course.instructor) {
        response += `👨‍🏫 **Instructor:** ${course.instructor.name || course.instructor}\n`;
      }
      
      if (course.term) {
        response += `📅 **Term:** ${course.term}\n`;
      }
      
      if (course.enrollmentType) {
        response += `📝 **Enrollment:** ${course.enrollmentType}\n`;
      }
      
      if (course.lastAccessed) {
        const lastAccessed = new Date(course.lastAccessed);
        response += `🕒 **Last Accessed:** ${lastAccessed.toLocaleDateString()}\n`;
      }
      
      response += `\n💡 **What I can help with for this course:**\n`;
      response += `• "What assignments do I have in ${course.name}?"\n`;
      response += `• "What's my grade in ${course.name}?"\n`;
      response += `• "Any announcements for ${course.name}?"\n`;
      response += `• "Show me the syllabus for ${course.name}"`;
      
      return response;
    }

    // Show all courses
    courses.forEach((course, index) => {
      const name = course.name || course.title || 'Unnamed Course';
      const instructor = course.instructor ? ` - ${course.instructor.name || course.instructor}` : '';
      const term = course.term ? ` (${course.term})` : '';
      
      response += `${index + 1}. **${name}**${instructor}${term}\n`;
    });

    response += `\n💡 **Tips:**\n`;
    response += `• Ask about a specific course: "Tell me about Biology"\n`;
    response += `• Get course assignments: "What assignments do I have in Math?"\n`;
    response += `• Check grades: "What's my grade in Chemistry?"\n`;
    response += `• View announcements: "Any news from my professors?"`;

    return response;
  }

  /**
   * Generate schedule response
   */
  async generateScheduleResponse(parameters, canvasData) {
    return "I can help you with your schedule! I'm currently working on implementing full calendar integration. For now, I can access your Canvas calendar data and will soon be able to show you upcoming events, class times, and important dates.";
  }

  /**
   * Generate announcements response
   */
  async generateAnnouncementsResponse(parameters, canvasData) {
    if (!canvasData) {
      return "I don't have access to your Canvas data right now. Please make sure you're logged into Canvas and the autonomous data collection is running.";
    }

    // Collect announcements from various sources
    const allAnnouncements = [];
    
    if (canvasData.announcements && Array.isArray(canvasData.announcements)) {
      allAnnouncements.push(...canvasData.announcements);
    }

    if (allAnnouncements.length === 0) {
      return "I don't see any announcement data. This could mean:\n• There are no recent announcements\n• The autonomous data collection hasn't gathered announcement data yet\n• You might need to visit your Canvas dashboard to refresh the data";
    }

    let response = "";
    
    // Course specific announcements
    if (parameters.courseName && parameters.courseName.length > 0) {
      const targetCourse = parameters.courseName[0].toLowerCase();
      const courseAnnouncements = allAnnouncements.filter(announcement =>
        announcement.courseName?.toLowerCase().includes(targetCourse) ||
        announcement.courseId?.toLowerCase().includes(targetCourse)
      );
      
      if (courseAnnouncements.length === 0) {
        return `I don't see any recent announcements for "${parameters.courseName[0]}".`;
      }
      
      response = `📢 **Recent Announcements for ${parameters.courseName[0]} (${courseAnnouncements.length}):**\n\n`;
      
      courseAnnouncements.slice(0, 5).forEach((announcement, index) => {
        const title = announcement.title || announcement.subject || 'Announcement';
        const author = announcement.author?.name || announcement.author || 'Instructor';
        const date = announcement.postedAt || announcement.createdAt;
        const dateText = date ? ` - ${new Date(date).toLocaleDateString()}` : '';
        
        response += `${index + 1}. **${title}**${dateText}\n`;
        response += `   👨‍🏫 ${author}\n`;
        
        if (announcement.message || announcement.content) {
          const message = (announcement.message || announcement.content).substring(0, 100);
          response += `   📄 ${message}${message.length >= 100 ? '...' : ''}\n`;
        }
        response += '\n';
      });
      
    } else {
      // Show all recent announcements
      response = `📢 **Recent Announcements (${allAnnouncements.length}):**\n\n`;
      
      // Sort by date (most recent first)
      const sortedAnnouncements = allAnnouncements.sort((a, b) => {
        const dateA = new Date(a.postedAt || a.createdAt || 0);
        const dateB = new Date(b.postedAt || b.createdAt || 0);
        return dateB - dateA;
      });
      
      sortedAnnouncements.slice(0, 5).forEach((announcement, index) => {
        const title = announcement.title || announcement.subject || 'Announcement';
        const courseName = announcement.courseName || 'Course';
        const author = announcement.author?.name || announcement.author || 'Instructor';
        const date = announcement.postedAt || announcement.createdAt;
        const dateText = date ? ` - ${new Date(date).toLocaleDateString()}` : '';
        
        response += `${index + 1}. **${title}** (${courseName})${dateText}\n`;
        response += `   👨‍🏫 ${author}\n`;
        
        if (announcement.message || announcement.content) {
          const message = (announcement.message || announcement.content).substring(0, 100);
          response += `   📄 ${message}${message.length >= 100 ? '...' : ''}\n`;
        }
        response += '\n';
      });
      
      if (allAnnouncements.length > 5) {
        response += `... and ${allAnnouncements.length - 5} more announcements.\n\n`;
      }
    }

    response += `💡 **Tips:**\n`;
    response += `• Ask about specific courses: "Any announcements for Biology?"\n`;
    response += `• Check recent updates: "What's new from my professors?"\n`;
    response += `• Stay informed: "Show me important announcements"`;

    return response;
  }

  // New: Syllabus
  async generateSyllabusResponse(parameters, canvasData) {
    const courses = canvasData?.courses || [];
    const syllabi = canvasData?.syllabi || [];

    let courseName = parameters.courseName?.[0];
    if (!courseName && courses.length === 1) {
      courseName = courses[0].name || courses[0].title;
    }

    if (!courseName) {
      return "Which course? Try: 'Show the syllabus for \"Course Name\"'";
    }

    const target = courseName.toLowerCase();
    const matchingCourse = courses.find(c =>
      c.name?.toLowerCase().includes(target) ||
      c.title?.toLowerCase().includes(target) ||
      c.id?.toLowerCase?.()?.includes(target)
    );

    // Try direct syllabus match
    let syllabus = null;
    if (matchingCourse) {
      const courseId = matchingCourse.id;
      syllabus = syllabi.find(s => s.courseId === courseId) || null;
    }

    if (!syllabus && syllabi.length > 0) {
      syllabus = syllabi.find(s => (s.courseName || '').toLowerCase().includes(target));
    }

    if (syllabus?.content) {
      const snippet = syllabus.content.substring(0, 600);
      return `📘 **Syllabus for ${courseName}:**\n\n${snippet}${syllabus.content.length > 600 ? '...' : ''}`;
    }

    // Provide a direct URL fallback
    if (matchingCourse?.id) {
      return `I couldn't read the syllabus content, but you can open it here:\nhttps://canvas.stanford.edu/courses/${matchingCourse.id}/assignments/syllabus`;
    }

    return `I couldn't find the syllabus for "${courseName}". Try opening the course once so I can cache it.`;
  }

  // New: Quizzes (filter assignments)
  async generateQuizzesResponse(parameters, canvasData) {
    console.log('🧪 Starting quiz filtering with parameters:', parameters);
    console.log('🧪 Canvas data keys available:', Object.keys(canvasData || {}));
    
    // If course name is specified, try to get assignments specifically for that course
    let assignments = canvasData?.assignments || [];
    
    if (parameters.courseName && parameters.courseName.length > 0) {
      const targetRaw = parameters.courseName[0];
      const courses = canvasData?.courses || [];
      const matchCourse = courses.find(c => {
        const courseName = (c.name || c.title || '').toLowerCase().replace(/[^a-z0-9\s]+/g, '').trim();
        const target = targetRaw.toLowerCase().replace(/[^a-z0-9\s]+/g, '').trim();
        return courseName === target || courseName.includes(target) || target.includes(courseName);
      });
      
      if (matchCourse && matchCourse.id) {
        console.log('🧪 Found target course:', matchCourse);
        // Try to get course-specific assignments from storage
        try {
          const allData = await chrome.storage.local.get();
          const courseAssignments = [];
          
          for (const [key, value] of Object.entries(allData)) {
            if (key.includes(`course-assignments_${matchCourse.id}`) && value?.data?.items) {
              console.log('🧪 Found course-specific assignments in:', key);
              // Add course info to each assignment
              const assignmentsWithCourse = value.data.items.map(a => ({
                ...a,
                courseName: matchCourse.name,
                courseId: matchCourse.id,
                _fromCourseStorage: true
              }));
              courseAssignments.push(...assignmentsWithCourse);
            }
          }
          
          if (courseAssignments.length > 0) {
            console.log('🧪 Using course-specific assignments:', courseAssignments.length);
            assignments = courseAssignments;
          }
        } catch (error) {
          console.warn('🧪 Failed to get course-specific assignments:', error);
        }
      }
    }
    
    console.log('🧪 Total assignments found:', assignments.length);
    
    if (assignments.length === 0) {
      return "I don't see any assignment data yet. Try: 'What assignments do I have?' first.";
    }

    // Helper to normalize strings for fuzzy match
    const norm = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9\s]+/g, '').trim();

    // First, find all quiz-like assignments
    let quizAssignments = assignments.filter(a => {
      const name = norm(a.name || a.title || '');
      const type = norm(a.type || '');
      
      const isQuiz = type.includes('quiz') || 
                    name.includes('quiz') || 
                    name.includes('exam') || 
                    name.includes('test') ||
                    name.includes('assessment');
      
      console.log(`🧪 Assignment "${a.name || a.title}" - Type: "${type}", Name normalized: "${name}", Is Quiz: ${isQuiz}`);
      return isQuiz;
    });

    console.log('🧪 Quiz assignments found:', quizAssignments.length);

    // If course name is specified, filter by course
    if (parameters.courseName && parameters.courseName.length > 0) {
      const targetRaw = parameters.courseName[0];
      const target = norm(targetRaw);
      
      console.log('🧪 Filtering for course:', targetRaw, '(normalized:', target + ')');

      // Get all courses for reference
      const courses = canvasData?.courses || [];
      console.log('🧪 Available courses:', courses.map(c => ({
        name: c.name || c.title,
        id: c.id,
        normalized: norm(c.name || c.title || '')
      })));

      // Find matching course
      const matchCourse = courses.find(c => {
        const courseName = norm(c.name || c.title || '');
        return courseName === target || 
               courseName.includes(target) || 
               target.includes(courseName);
      });
      
      console.log('🧪 Matched course:', matchCourse);

      // Filter quizzes by course
      quizAssignments = quizAssignments.filter(a => {
        const assignmentCourseName = norm(a.courseName || '');
        const assignmentCourseId = a.courseId;
        const assignmentUrl = a.url || '';
        
        // Match by course name
        const nameMatch = assignmentCourseName.includes(target) || target.includes(assignmentCourseName);
        
        // Match by course ID if we found a matching course
        const idMatch = matchCourse && matchCourse.id && (assignmentCourseId === matchCourse.id || assignmentCourseId === String(matchCourse.id));
        
        // Match by URL if course ID is available - check for the course ID in the URL
        const urlMatch = matchCourse && matchCourse.id && 
                        assignmentUrl.includes(`/courses/${matchCourse.id}/`);

        // ADDITIONAL: Check if assignment is from a storage key that contains the course ID
        // This handles cases where assignments don't have courseName/courseId but are stored by course
        const storageKeyMatch = matchCourse && matchCourse.id && 
                               (a._storageKey || '').includes(`_${matchCourse.id}_`);

        console.log(`🧪 Quiz "${a.name || a.title}" - Course: "${assignmentCourseName}", ID: "${assignmentCourseId}", URL: "${assignmentUrl}", Name Match: ${nameMatch}, ID Match: ${idMatch}, URL Match: ${urlMatch}, Storage Match: ${storageKeyMatch}`);
        
        return nameMatch || idMatch || urlMatch || storageKeyMatch;
      });

      console.log('🧪 Quizzes after course filtering:', quizAssignments.length);
    }

    if (quizAssignments.length === 0) {
      const courseText = parameters.courseName ? ` for "${parameters.courseName[0]}"` : '';
      return `I don't see any quizzes${courseText}. Available assignments: ${assignments.slice(0, 3).map(a => a.name || a.title).join(', ')}${assignments.length > 3 ? '...' : ''}`;
    }

    // Sort by due date if available
    quizAssignments.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date(0);
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date(0);
      return dateA - dateB;
    });

    const courseText = parameters.courseName ? ` in ${parameters.courseName[0]}` : '';
    const list = quizAssignments.slice(0, 10).map((q, i) => {
      const name = q.name || q.title || 'Unnamed Quiz';
      const course = q.courseName ? ` (${q.courseName})` : '';
      const dueDate = q.dueDate ? ` - Due: ${new Date(q.dueDate).toLocaleDateString()}` : '';
      return `${i + 1}. **${name}**${course}${dueDate}`;
    }).join('\n');

    const moreText = quizAssignments.length > 10 ? `\n\n... and ${quizAssignments.length - 10} more quizzes.` : '';
    
    return `🧪 **Quizzes${courseText} (${quizAssignments.length} found):**\n\n${list}${moreText}`;
  }

  /**
   * Generate help response
   */
  generateHelpResponse() {
    return `I'm your Canvas Assistant! Here's what I can help you with:

📊 **Grades**: Ask about your current grades, GPA, or what you need on upcoming assignments
📋 **Assignments**: Check what's due, get assignment details, and manage deadlines  
📚 **Courses**: Get information about your enrolled courses
📘 **Syllabus**: "Show the syllabus for \"Course Name\""  
🧪 **Quizzes**: "What quizzes do I have in \"Course Name\"?"  
📅 **Schedule**: View your class schedule and upcoming events
📢 **Announcements**: Stay updated with the latest course announcements
💬 **Discussions**: Get help with discussion boards and forums

**Examples:**
• "What's my grade in Math 101?"
• "What assignments are due this week?"
• "Show me my course schedule"
• "Any new announcements?"

Just ask me naturally - I understand conversational language!`;
  }

  /**
   * Generate goodbye response
   */
  generateGoodbyeResponse() {
    const goodbyes = [
      "Goodbye! Feel free to ask me anything about your Canvas coursework anytime.",
      "See you later! I'm here whenever you need help with your studies.",
      "Take care! Good luck with your courses, and don't hesitate to reach out if you need assistance."
    ];
    
    return goodbyes[Math.floor(Math.random() * goodbyes.length)];
  }

  /**
   * Generate response for low confidence queries
   */
  generateLowConfidenceResponse(analysis, parameters) {
    return `I'm not quite sure what you're asking about. I heard something about ${analysis.normalizedQuery}, but I'd like to help you more specifically. 

Could you try asking about:
• Your grades or GPA
• Upcoming assignments  
• Course information
• Your class schedule
• Recent announcements

For example: "What assignments are due this week?" or "What's my current grade in Biology?"`;
  }

  /**
   * Generate response for unknown intents
   */
  generateUnknownResponse(analysis, parameters) {
    return `I'm still learning to understand all types of questions. I can help you with grades, assignments, courses, schedules, and announcements. 

Could you try rephrasing your question or asking something like:
• "What's my grade in [course name]?"
• "What assignments are due this week?"
• "Show me my courses"
• "Any recent announcements?"`;
  }

  /**
   * Generate follow-up suggestions
   */
  generateSuggestions(intent, parameters) {
    const suggestions = [];
    
    switch (intent) {
      case this.intents.GRADES:
        suggestions.push("Calculate what I need on the final exam");
        suggestions.push("Show my grade trend this semester");
        if (!parameters.courseName) {
          suggestions.push("Ask about a specific course");
        }
        break;
        
      case this.intents.ASSIGNMENTS:
        suggestions.push("Show assignments due this week");
        suggestions.push("Help me prioritize my tasks");
        suggestions.push("Create a study schedule");
        break;
        
      case this.intents.SYLLABUS:
        suggestions.push("Open the course syllabus page");
        break;

      case this.intents.QUIZZES:
        suggestions.push("Quizzes due this week");
        suggestions.push("Quizzes in [Course Name]");
        break;
        
      case this.intents.COURSES:
        suggestions.push("Tell me about course requirements");
        suggestions.push("Show my course schedule");
        suggestions.push("Check course announcements");
        break;
        
      case this.intents.GREETING:
        suggestions.push("What assignments are due soon?");
        suggestions.push("How are my grades looking?");
        suggestions.push("Show me recent announcements");
        break;
        
      default:
        suggestions.push("Ask about your grades");
        suggestions.push("Check upcoming assignments");
        suggestions.push("View your courses");
    }
    
    return suggestions;
  }

  /**
   * Get conversation context for follow-up questions
   */
  getConversationContext() {
    return this.conversationContext;
  }

  /**
   * Reset conversation context
   */
  resetContext() {
    this.conversationContext = {
      lastIntent: null,
      lastCourse: null,
      lastTimeFrame: null,
      conversationHistory: []
    };
  }
}

// Export for use in service worker
if (typeof window === 'undefined') {
  // Service worker environment
  globalThis.CanvasNLPProcessor = CanvasNLPProcessor;
} else {
  // Browser environment
  window.CanvasNLPProcessor = CanvasNLPProcessor;
}
