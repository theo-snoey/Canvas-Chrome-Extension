# Canvas LMS Chat Assistant - Scope 2.0
*AI-Powered Chat Interface with OpenAI Integration*

## Project Overview
Build a comprehensive Chrome extension that replaces the current popup with a large, intelligent chat interface. The extension will perform thorough Canvas data scraping, store all content locally, and use OpenAI's Chat API to provide intelligent responses about coursework, generate homework lists, and execute assignments.

## Core Requirements
- **Chat Interface**: Large chat window (~50% screen size) replacing current popup
- **Immediate Scraping**: Full Canvas scrape on Chrome startup (within 10 seconds)
- **Background Refresh**: Re-scrape every 10 minutes to maintain data freshness
- **OpenAI Integration**: Use project API key + Project ID for all chat responses
- **Assignment Execution**: Generate written responses/essays for assignments
- **File Processing**: Download and extract text content from Canvas files
- **Current Semester Focus**: Only active/dashboard courses, not archived ones
- **Query by Due Date**: Chat can filter assignments by when they're due

---

## Phase 1: Enhanced Data Collection & Storage
**Goal**: Thorough, immediate Canvas scraping with file downloads and deep content extraction

### 1.1 Immediate Startup Scraping ⏱️
- [ ] Modify background worker to trigger full scrape on Chrome startup/extension load
- [ ] Remove 5-minute delay, start scraping within 10 seconds of extension activation
- [ ] Add progress indicators in popup/chat interface
- [ ] Implement startup detection and auto-trigger mechanisms
- [ ] Add visual feedback for ongoing scraping operations

### 1.2 Enhanced Content Extraction 📄
- [ ] **Files**: Download and extract text from PDFs, docs, images from Canvas file sections
  - [ ] PDF text extraction using PDF.js or similar
  - [ ] Document parsing (Word docs, PowerPoint, etc.)
  - [ ] Image OCR for scanned documents/handwritten content
  - [ ] Store extracted text content, not binary files
- [ ] **Pages**: Extract full HTML content from Canvas pages, announcements, modules
  - [ ] Clean HTML and convert to readable text
  - [ ] Preserve formatting and structure information
  - [ ] Extract embedded media descriptions
- [ ] **Syllabi**: Deep scrape syllabus pages for assignment lists, due dates, reading schedules
  - [ ] Parse syllabus tables and schedules
  - [ ] Extract reading assignments and materials
  - [ ] Identify assignment types and requirements
- [ ] **Discussions**: Extract discussion posts and replies for context
  - [ ] Thread structure preservation
  - [ ] Author information and timestamps
  - [ ] Attachment content extraction
- [ ] **Grades**: Get detailed grade breakdowns and rubrics
  - [ ] Assignment-specific rubrics
  - [ ] Grade distributions and class averages
  - [ ] Feedback and comments from instructors

### 1.3 Current Semester Focus 🎯
- [ ] Filter courses to only active/current ones (not completed courses)
- [ ] Identify "dashboard courses" vs archived ones using Canvas indicators
- [ ] Prioritize recent assignments and upcoming deadlines
- [ ] Implement course status detection logic
- [ ] Add date-based filtering for relevancy

### 1.4 10-minute Background Refresh 🔄
- [ ] Set up reliable 10-minute intervals for re-scraping
- [ ] Smart diff detection to only update changed content
- [ ] Maintain data freshness without overwhelming Canvas servers
- [ ] Implement incremental updates for efficiency
- [ ] Add conflict resolution for concurrent updates

---

## Phase 2: Chat API Integration
**Goal**: Replace popup with large chat interface powered by OpenAI

### 2.1 Hardcoded API Setup 🔑
- [ ] Embed project API key and Project ID directly in the code
- [ ] Add API health checking (test connection on startup)
- [ ] Implement fallback error handling if API fails
- [ ] Add API usage monitoring and rate limiting
- [ ] Create clear error messages for API issues
- [ ] Implement automatic retry logic with exponential backoff

### 2.2 Large Chat Interface 💬
- [ ] Replace current popup with chat-focused UI
- [ ] Size: ~50% screen width/height (resizable window)
- [ ] Modern chat interface with message history
- [ ] Loading states for API responses
- [ ] Message threading and conversation context
- [ ] Copy/export functionality for responses
- [ ] Keyboard shortcuts and accessibility features

### 2.3 Context Management 📊
- [ ] Send ALL scraped Canvas data as context to ChatGPT
- [ ] Format data as structured JSON for the API
- [ ] Include: courses, assignments, files, syllabi, grades, announcements
- [ ] Implement context size management (token limits)
- [ ] Add context relevancy scoring for large datasets
- [ ] Create data summarization for oversized contexts

---

## Phase 3: Smart Assignment Features
**Goal**: Homework lists and assignment execution with due date querying

### 3.1 Intelligent Homework Lists 📋
- [ ] Parse current assignments from Canvas + syllabi
- [ ] Generate prioritized to-do lists with due dates
- [ ] Include reading assignments from syllabi
- [ ] Smart categorization (urgent, upcoming, long-term)
- [ ] Due date filtering and sorting capabilities
- [ ] Assignment type classification and icons
- [ ] Progress tracking and completion status

### 3.2 Assignment Execution ✍️
- [ ] Detect assignment types (essay, report, analysis, etc.)
- [ ] Generate written responses based on:
  - [ ] Assignment instructions and requirements
  - [ ] Required readings (from scraped files/pages)
  - [ ] Course context and syllabus information
  - [ ] Grading rubrics if available
- [ ] Support for all assignment types equally
- [ ] Word count and formatting requirements adherence
- [ ] Citation and reference generation

### 3.3 File Integration 📁
- [ ] Use downloaded PDFs/docs as source material
- [ ] Reference specific readings in generated work
- [ ] Cite sources properly based on assignment requirements
- [ ] Cross-reference multiple documents for comprehensive responses
- [ ] Extract and use relevant quotes and data

### 3.4 Due Date Query System 📅
- [ ] Implement natural language due date queries:
  - [ ] "What's due this week?"
  - [ ] "Show me assignments due tomorrow"
  - [ ] "What do I have due in the next 3 days?"
  - [ ] "Assignments due before Friday"
- [ ] Date parsing and filtering logic
- [ ] Relative date calculations (today, tomorrow, next week)
- [ ] Calendar integration and timeline views

---

## Phase 4: Quality & Reliability
**Goal**: Robust, production-ready experience

### 4.1 API Key Management 🔐
- [ ] Regular API key health checks
- [ ] Clear error messages if key expires/fails
- [ ] Easy process for updating the key when needed
- [ ] Usage tracking and quota monitoring
- [ ] Automatic key rotation preparation

### 4.2 Data Quality Assurance ✅
- [ ] Validate scraped content completeness
- [ ] Handle Canvas layout changes gracefully
- [ ] Retry failed scraping attempts with backoff
- [ ] Data integrity checks and validation
- [ ] Error reporting and diagnostics

### 4.3 Performance Optimization ⚡
- [ ] Efficient data storage and retrieval
- [ ] Fast chat response times (<3 seconds)
- [ ] Smooth UI interactions and animations
- [ ] Memory usage optimization
- [ ] Caching strategies for repeated queries

### 4.4 User Experience Polish 🎨
- [ ] Intuitive chat commands and shortcuts
- [ ] Rich text formatting in responses
- [ ] Export functionality for generated assignments
- [ ] Search through chat history
- [ ] Customizable interface preferences

---

## Technical Architecture

### Data Flow
1. **Startup**: Extension loads → Immediate Canvas scrape begins
2. **Background**: 10-minute intervals → Incremental data updates
3. **User Query**: Chat input → Context preparation → OpenAI API call → Response display
4. **Assignment Generation**: User request → Relevant data gathering → AI generation → Formatted output

### Storage Strategy
- **Local Storage**: All Canvas data stored in `chrome.storage.local`
- **Text Extraction**: File contents stored as searchable text
- **Structured Data**: JSON schemas for courses, assignments, grades
- **Indexing**: Fast retrieval for chat context preparation

### API Integration
- **OpenAI Chat API**: GPT-4 with project key and Project ID
- **Context Management**: Structured JSON payload with all relevant Canvas data
- **Error Handling**: Graceful degradation and retry logic
- **Rate Limiting**: Respect API limits and implement queuing

---

## Success Metrics
- [ ] Scraping completes within 10 seconds of Chrome startup
- [ ] Chat responses generated within 3 seconds
- [ ] All current semester assignments accurately identified
- [ ] File content successfully extracted and searchable
- [ ] Due date queries return accurate, filtered results
- [ ] Generated assignments meet typical academic standards
- [ ] 99% uptime for background scraping operations

---

## Future Enhancements (Post-MVP)
- [ ] Selective data scraping for cost optimization
- [ ] Data sanitization and privacy controls
- [ ] Canvas API integration for direct submissions
- [ ] Multi-school Canvas instance support
- [ ] Advanced assignment templates and styles
- [ ] Collaboration features and sharing
- [ ] Mobile companion app integration

---

## Implementation Timeline
- **Phase 1**: 2-3 days (Enhanced data collection)
- **Phase 2**: 2-3 days (Chat API integration)
- **Phase 3**: 3-4 days (Assignment features)
- **Phase 4**: 1-2 days (Polish and optimization)

**Total Estimated Time**: 8-12 days for full implementation

---

*This scope represents a complete rebuild focused on AI-powered chat functionality with comprehensive Canvas integration.*
