export const API_MESSAGES = {
  health: {
    ok: "Health check passed"
  },
  submission: {
    created: "Submission processed successfully"
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
  errors: {
    validationFailed: "Validation failed",
    invalidJson: "Invalid JSON payload",
    aiConfigurationMissing: "AI provider is not configured",
    aiAnalysisFailed: "AI analysis failed",
    aiQuestionGenerationFailed: "AI question generation failed",
    topicNotFound: "Topic not found",
    questionNotFound: "Question not found",
    questionTextRequired: "Either questionId or prompt is required",
    internalServerError: "Internal server error",
    routeNotFound: "Route not found"
  }
} as const;
