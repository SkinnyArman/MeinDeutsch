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
    internalServerError: "Internal server error",
    routeNotFound: "Route not found"
  }
} as const;
