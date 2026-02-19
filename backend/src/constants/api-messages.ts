export const API_MESSAGES = {
  health: {
    ok: "Health check passed"
  },
  submission: {
    created: "Submission processed successfully"
  },
  errors: {
    validationFailed: "Validation failed",
    invalidJson: "Invalid JSON payload",
    aiConfigurationMissing: "AI provider is not configured",
    aiAnalysisFailed: "AI analysis failed",
    internalServerError: "Internal server error",
    routeNotFound: "Route not found"
  }
} as const;
