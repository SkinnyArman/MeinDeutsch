export const API_MESSAGES = {
  health: {
    ok: "Health check passed"
  },
  auth: {
    signedIn: "Signed in successfully",
    sessionFetched: "Session fetched successfully"
  },
  submission: {
    created: "Submission processed successfully",
    listed: "Submissions fetched successfully",
    fetched: "Submission fetched successfully"
  },
  topic: {
    created: "Topic created successfully",
    listed: "Topics fetched successfully",
    deleted: "Topic deleted successfully"
  },
  question: {
    generated: "Question generated successfully",
    nextServed: "Next question served successfully",
    listed: "Questions fetched successfully"
  },
  knowledge: {
    listed: "Knowledge items fetched successfully"
  },
  streak: {
    fetched: "Streak fetched successfully"
  },
  dashboard: {
    fetched: "Dashboard overview fetched successfully"
  },
  level: {
    fetched: "Level fetched successfully",
    examGenerated: "Level exam generated successfully",
    assessed: "Level assessed successfully",
    updated: "Level updated successfully"
  },
  conversation: {
    scenariosListed: "Conversation scenarios fetched successfully",
    started: "Conversation started successfully",
    replied: "Conversation reply generated successfully",
    ended: "Conversation ended successfully",
    fetched: "Conversation fetched successfully",
    listed: "Conversations fetched successfully",
    deleted: "Conversation deleted successfully"
  },
  vocabulary: {
    saved: "Vocabulary item saved successfully",
    listed: "Vocabulary items fetched successfully",
    categoriesListed: "Vocabulary categories fetched successfully",
    dueListed: "Due vocabulary items fetched successfully",
    reviewed: "Vocabulary review saved successfully"
  },
  expression: {
    generated: "Expression generated successfully",
    categoriesListed: "Expression categories fetched successfully",
    assessed: "Expression attempt assessed successfully",
    recognitionAssessed: "Expression recognition assessed successfully",
    historyListed: "Expression history fetched successfully",
    reviewListed: "Expression review items fetched successfully",
    reviewAssessed: "Expression review attempt assessed successfully"
  },
  collocation: {
    nextServed: "Next collocation served successfully",
    categoriesListed: "Collocation categories fetched successfully",
    assessed: "Collocation attempt assessed successfully",
    historyListed: "Collocation history fetched successfully",
    reviewListed: "Collocation review items fetched successfully",
    reviewAssessed: "Collocation review attempt assessed successfully"
  },
  errors: {
    validationFailed: "Validation failed",
    invalidJson: "Invalid JSON payload",
    aiConfigurationMissing: "AI provider is not configured",
    aiAnalysisFailed: "AI analysis failed",
    aiQuestionGenerationFailed: "AI question generation failed",
    aiExpressionGenerationFailed: "AI expression generation failed",
    aiExpressionAssessmentFailed: "AI expression assessment failed",
    aiExpressionReviewAssessmentFailed: "AI expression review assessment failed",
    aiCollocationGenerationFailed: "AI collocation generation failed",
    aiCollocationAssessmentFailed: "AI collocation assessment failed",
    aiCollocationReviewAssessmentFailed: "AI collocation review assessment failed",
    aiLevelExamFailed: "AI level exam generation failed",
    aiLevelAssessmentFailed: "AI level assessment failed",
    aiConversationFailed: "AI conversation failed",
    aiConversationDebriefFailed: "AI conversation debrief failed",
    authMissingToken: "Authentication token is required",
    authInvalidGoogleToken: "Google sign-in failed",
    authGoogleUpstreamUnavailable: "Google sign-in is blocked by your network (403). Please try turning on a VPN and sign in again.",
    authEmailNotAllowed: "This email is not allowed to sign in",
    authInvalidSession: "Invalid or expired session",
    authPasswordDisabled: "Password sign-in is not enabled. Set AUTH_PASSWORD in the backend .env.",
    authInvalidCredentials: "Email or password is incorrect",
    authTooManyAttempts: "Too many failed attempts. Try again in 15 minutes.",
    topicNotFound: "Topic not found",
    questionNotFound: "Question not found",
    questionTextRequired: "Either questionId or prompt is required",
    submissionNotFound: "Submission not found",
    expressionPromptNotFound: "Expression prompt not found",
    expressionReviewItemNotFound: "Expression review item not found",
    expressionReviewItemNotDue: "Expression review item is not due yet",
    collocationPromptNotFound: "Collocation prompt not found",
    collocationReviewItemNotFound: "Collocation review item not found",
    collocationReviewItemNotDue: "Collocation review item is not due yet",
    conversationNotFound: "Conversation not found",
    conversationEnded: "This conversation has already ended",
    vocabularyNotFound: "Vocabulary item not found",
    vocabularyNotDue: "Vocabulary item is not due for review yet",
    internalServerError: "Internal server error",
    routeNotFound: "Route not found"
  }
} as const;
