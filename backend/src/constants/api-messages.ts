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
    listed: "Questions fetched successfully"
  },
  knowledge: {
    listed: "Knowledge items fetched successfully"
  },
  streak: {
    fetched: "Streak fetched successfully"
  },
  vocabulary: {
    saved: "Vocabulary item saved successfully",
    listed: "Vocabulary items fetched successfully",
    categoriesListed: "Vocabulary categories fetched successfully"
  },
  errors: {
    validationFailed: "Validation failed",
    invalidJson: "Invalid JSON payload",
    aiConfigurationMissing: "AI provider is not configured",
    aiAnalysisFailed: "AI analysis failed",
    aiQuestionGenerationFailed: "AI question generation failed",
    authMissingToken: "Authentication token is required",
    authInvalidGoogleToken: "Google sign-in failed",
    authEmailNotAllowed: "This email is not allowed to sign in",
    authInvalidSession: "Invalid or expired session",
    topicNotFound: "Topic not found",
    questionNotFound: "Question not found",
    questionTextRequired: "Either questionId or prompt is required",
    submissionNotFound: "Submission not found",
    internalServerError: "Internal server error",
    routeNotFound: "Route not found"
  }
} as const;
