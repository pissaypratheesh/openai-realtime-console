/**
 * Conversation Analyzer for Interview Mode
 * Detects questions, speaker patterns, and determines when AI should intervene
 */

export class ConversationAnalyzer {
  constructor() {
    this.conversationHistory = [];
    this.lastSpeakerChange = null;
    this.silenceThreshold = 2000; // 2 seconds of silence
    this.questionPatterns = [
      // Direct question words
      /\b(what|how|why|when|where|who|which|whose|whom)\b/i,
      // Question phrases
      /\b(can you|could you|would you|will you|do you|did you|have you|are you|is it|was it)\b/i,
      // Interview-specific questions
      /\b(tell me about|describe|explain|walk me through|give me an example)\b/i,
      // Opinion/experience questions
      /\b(what's your|how do you|what would you|how would you)\b/i,
      // Clarification questions
      /\b(could you clarify|what do you mean|can you elaborate)\b/i,
    ];
    
    this.interviewerIndicators = [
      /\b(next question|moving on|let's talk about|another question)\b/i,
      /\b(thank you|thanks|okay|alright|good|great|excellent)\b.*\b(now|next|so)\b/i,
      /\b(final question|last question|one more thing)\b/i,
    ];

    this.responseEndIndicators = [
      /\b(that's all|that's it|nothing else|no more questions)\b/i,
      /\b(thank you|thanks|appreciate it|perfect|great answer)\b$/i,
    ];
  }

  /**
   * Analyze incoming audio transcript to determine if AI should respond
   */
  analyzeTranscript(transcript, timestamp = Date.now()) {
    if (!transcript || transcript.trim().length === 0) {
      return { shouldRespond: false, reason: 'empty_transcript' };
    }

    const analysis = {
      transcript: transcript.trim(),
      timestamp,
      isQuestion: this.detectQuestion(transcript),
      isInterviewerSpeaking: this.detectInterviewer(transcript),
      conversationFlow: this.analyzeConversationFlow(transcript),
      shouldRespond: false,
      confidence: 0,
      reason: '',
      suggestedResponse: null
    };

    // Add to conversation history
    this.addToHistory(analysis);

    // Determine if AI should respond
    const responseDecision = this.shouldAIRespond(analysis);
    analysis.shouldRespond = responseDecision.shouldRespond;
    analysis.confidence = responseDecision.confidence;
    analysis.reason = responseDecision.reason;
    analysis.suggestedResponse = responseDecision.suggestedResponse;

    return analysis;
  }

  /**
   * Detect if the transcript contains a question
   */
  detectQuestion(transcript) {
    const text = transcript.toLowerCase().trim();
    
    // Check for question mark
    if (text.endsWith('?')) {
      return { detected: true, type: 'punctuation', confidence: 0.9 };
    }

    // Check for question patterns
    for (const pattern of this.questionPatterns) {
      if (pattern.test(text)) {
        return { detected: true, type: 'pattern', confidence: 0.8, pattern: pattern.source };
      }
    }

    // Check for rising intonation patterns (basic heuristic)
    const risingWords = ['right', 'okay', 'yes', 'no', 'correct', 'true', 'false'];
    if (risingWords.some(word => text.endsWith(word))) {
      return { detected: true, type: 'intonation', confidence: 0.6 };
    }

    return { detected: false, confidence: 0 };
  }

  /**
   * Detect if the speaker is likely the interviewer
   */
  detectInterviewer(transcript) {
    const text = transcript.toLowerCase();

    // Check for interviewer-specific phrases
    for (const pattern of this.interviewerIndicators) {
      if (pattern.test(text)) {
        return { detected: true, confidence: 0.9, pattern: pattern.source };
      }
    }

    // Check for formal/professional language patterns
    const formalIndicators = [
      /\b(we're looking for|we need|the role requires|this position)\b/i,
      /\b(our company|our team|we offer|we provide)\b/i,
      /\b(interview|position|role|candidate|experience|qualifications)\b/i,
    ];

    for (const pattern of formalIndicators) {
      if (pattern.test(text)) {
        return { detected: true, confidence: 0.7, pattern: pattern.source };
      }
    }

    return { detected: false, confidence: 0.3 };
  }

  /**
   * Analyze the flow of conversation
   */
  analyzeConversationFlow(transcript) {
    const recentHistory = this.conversationHistory.slice(-3);
    
    return {
      recentQuestions: recentHistory.filter(entry => entry.isQuestion?.detected).length,
      speakerChanges: this.detectSpeakerChanges(recentHistory),
      conversationPace: this.calculateConversationPace(recentHistory),
      topicShift: this.detectTopicShift(transcript, recentHistory)
    };
  }

  /**
   * Determine if AI should respond based on analysis
   */
  shouldAIRespond(analysis) {
    const { transcript, isQuestion, isInterviewerSpeaking, conversationFlow } = analysis;
    
    // Don't respond if it's clearly not a question
    if (!isQuestion.detected) {
      return { shouldRespond: false, confidence: 0, reason: 'no_question_detected' };
    }

    // High confidence response triggers
    if (isQuestion.confidence > 0.8 && isInterviewerSpeaking.detected) {
      return {
        shouldRespond: true,
        confidence: 0.9,
        reason: 'clear_interviewer_question',
        suggestedResponse: this.generateResponseContext(analysis)
      };
    }

    // Medium confidence - question detected but unsure about speaker
    if (isQuestion.confidence > 0.7) {
      // Check conversation flow for context
      if (conversationFlow.recentQuestions > 0) {
        return {
          shouldRespond: true,
          confidence: 0.7,
          reason: 'likely_question_in_interview_context',
          suggestedResponse: this.generateResponseContext(analysis)
        };
      }
    }

    // Low confidence - might be a question but context is unclear
    if (isQuestion.confidence > 0.5 && this.hasRecentInterviewActivity()) {
      return {
        shouldRespond: true,
        confidence: 0.5,
        reason: 'possible_question_in_interview',
        suggestedResponse: this.generateResponseContext(analysis)
      };
    }

    return { shouldRespond: false, confidence: 0, reason: 'insufficient_confidence' };
  }

  /**
   * Generate context for AI response
   */
  generateResponseContext(analysis) {
    const recentContext = this.conversationHistory
      .slice(-5)
      .map(entry => entry.transcript)
      .join(' ');

    return {
      question: analysis.transcript,
      context: recentContext,
      questionType: analysis.isQuestion.type,
      interviewerConfidence: analysis.isInterviewerSpeaking.confidence,
      responseStyle: this.determineResponseStyle(analysis)
    };
  }

  /**
   * Determine appropriate response style
   */
  determineResponseStyle(analysis) {
    const text = analysis.transcript.toLowerCase();

    if (text.includes('experience') || text.includes('background')) {
      return 'experience_focused';
    }
    if (text.includes('technical') || text.includes('how do you')) {
      return 'technical_explanation';
    }
    if (text.includes('example') || text.includes('tell me about')) {
      return 'example_based';
    }
    if (text.includes('why') || text.includes('what motivates')) {
      return 'motivation_focused';
    }

    return 'general_professional';
  }

  /**
   * Add entry to conversation history
   */
  addToHistory(analysis) {
    this.conversationHistory.push(analysis);
    
    // Keep only last 20 entries to prevent memory issues
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }

  /**
   * Detect speaker changes in conversation
   */
  detectSpeakerChanges(recentHistory) {
    let changes = 0;
    for (let i = 1; i < recentHistory.length; i++) {
      const current = recentHistory[i];
      const previous = recentHistory[i - 1];
      
      if (current.isInterviewerSpeaking.detected !== previous.isInterviewerSpeaking.detected) {
        changes++;
      }
    }
    return changes;
  }

  /**
   * Calculate conversation pace
   */
  calculateConversationPace(recentHistory) {
    if (recentHistory.length < 2) return 'unknown';
    
    const timeSpan = recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp;
    const entriesPerMinute = (recentHistory.length / timeSpan) * 60000;
    
    if (entriesPerMinute > 10) return 'fast';
    if (entriesPerMinute > 5) return 'normal';
    return 'slow';
  }

  /**
   * Detect topic shifts
   */
  detectTopicShift(currentTranscript, recentHistory) {
    if (recentHistory.length === 0) return false;
    
    const topicKeywords = [
      'experience', 'background', 'technical', 'project', 'team', 'challenge',
      'achievement', 'goal', 'skill', 'technology', 'role', 'responsibility'
    ];
    
    const currentTopics = topicKeywords.filter(keyword => 
      currentTranscript.toLowerCase().includes(keyword)
    );
    
    const recentTopics = recentHistory
      .slice(-2)
      .flatMap(entry => 
        topicKeywords.filter(keyword => 
          entry.transcript.toLowerCase().includes(keyword)
        )
      );
    
    const commonTopics = currentTopics.filter(topic => recentTopics.includes(topic));
    return commonTopics.length < currentTopics.length * 0.5;
  }

  /**
   * Check if there's been recent interview activity
   */
  hasRecentInterviewActivity() {
    const recentEntries = this.conversationHistory.slice(-5);
    return recentEntries.some(entry => 
      entry.isQuestion?.detected || entry.isInterviewerSpeaking?.detected
    );
  }

  /**
   * Get conversation summary
   */
  getConversationSummary() {
    const totalEntries = this.conversationHistory.length;
    const questions = this.conversationHistory.filter(entry => entry.isQuestion?.detected);
    const interviewerStatements = this.conversationHistory.filter(entry => entry.isInterviewerSpeaking?.detected);
    
    return {
      totalEntries,
      totalQuestions: questions.length,
      interviewerStatements: interviewerStatements.length,
      averageQuestionConfidence: questions.reduce((sum, q) => sum + q.isQuestion.confidence, 0) / questions.length || 0,
      conversationDuration: totalEntries > 0 ? 
        this.conversationHistory[totalEntries - 1].timestamp - this.conversationHistory[0].timestamp : 0
    };
  }

  /**
   * Reset conversation state
   */
  reset() {
    this.conversationHistory = [];
    this.lastSpeakerChange = null;
  }
}

export default ConversationAnalyzer; 