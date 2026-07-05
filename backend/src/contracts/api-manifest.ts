export type EndpointFieldType = "text" | "textarea" | "number";

export interface EndpointField {
  name: string;
  label: string;
  type: EndpointFieldType;
  required: boolean;
  placeholder?: string;
}

export interface ApiEndpointDefinition {
  id: string;
  method: "GET" | "POST";
  path: string;
  title: string;
  description: string;
  requestFields: EndpointField[];
}

export const API_ENDPOINTS: ApiEndpointDefinition[] = [
  {
    id: "google-signin",
    method: "POST",
    path: "/api/auth/google",
    title: "Google Sign-In",
    description: "Authenticates with a Google ID token and returns an app JWT session.",
    requestFields: [
      {
        name: "idToken",
        label: "Google ID Token",
        type: "textarea",
        required: true
      }
    ]
  },
  {
    id: "password-signin",
    method: "POST",
    path: "/api/auth/password",
    title: "Password Sign-In",
    description: "Google-free fallback login for whitelisted emails (requires AUTH_PASSWORD in backend env).",
    requestFields: [
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true
      },
      {
        name: "password",
        label: "Password",
        type: "text",
        required: true
      }
    ]
  },
  {
    id: "health",
    method: "GET",
    path: "/api/health",
    title: "Health Check",
    description: "Checks API and DB connectivity.",
    requestFields: []
  },
  {
    id: "auth-me",
    method: "GET",
    path: "/api/auth/me",
    title: "Session User",
    description: "Returns current authenticated user from app JWT.",
    requestFields: []
  },
  {
    id: "create-topic",
    method: "POST",
    path: "/api/topics",
    title: "Create Topic",
    description: "Adds a topic that AI question generation must use.",
    requestFields: [
      {
        name: "name",
        label: "Topic Name",
        type: "text",
        required: true,
        placeholder: "Nature"
      },
      {
        name: "description",
        label: "Topic Description",
        type: "textarea",
        required: false,
        placeholder: "German conversations about nature, climate, and forests."
      }
    ]
  },
  {
    id: "list-topics",
    method: "GET",
    path: "/api/topics",
    title: "List Topics",
    description: "Lists all stored topics.",
    requestFields: []
  },
  {
    id: "generate-question",
    method: "POST",
    path: "/api/questions/generate",
    title: "Generate Question",
    description: "Generates one question strictly from an existing topic using backend prompt template.",
    requestFields: [
      {
        name: "topicId",
        label: "Topic ID",
        type: "number",
        required: true,
        placeholder: "1"
      },
      {
        name: "cefrTarget",
        label: "CEFR Target",
        type: "text",
        required: false,
        placeholder: "B1"
      }
    ]
  },
  {
    id: "next-question",
    method: "POST",
    path: "/api/questions/next",
    title: "Get Next Daily Talk Question",
    description: "Returns next unseen question for the topic from the user's pool; generates only when the pool is exhausted.",
    requestFields: [
      {
        name: "topicId",
        label: "Topic ID",
        type: "number",
        required: true,
        placeholder: "1"
      }
    ]
  },
  {
    id: "list-questions",
    method: "GET",
    path: "/api/questions",
    title: "List Questions",
    description: "Lists generated questions.",
    requestFields: []
  },
  {
    id: "list-knowledge",
    method: "GET",
    path: "/api/knowledge",
    title: "List Knowledge",
    description: "Lists knowledge base entries built from Daily Talk submissions.",
    requestFields: []
  },
  {
    id: "save-vocabulary",
    method: "POST",
    path: "/api/vocabulary",
    title: "Save Vocabulary",
    description: "Stores a suggested vocabulary word with description, examples, and category.",
    requestFields: [
      {
        name: "word",
        label: "Word",
        type: "text",
        required: true,
        placeholder: "die Veränderung"
      },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        required: true,
        placeholder: "A change or transformation."
      },
      {
        name: "examples",
        label: "Examples (JSON array)",
        type: "textarea",
        required: true,
        placeholder: "[\"Diese Veränderung ist wichtig.\"]"
      },
      {
        name: "category",
        label: "Category",
        type: "text",
        required: false,
        placeholder: "Umwelt"
      }
    ]
  },
  {
    id: "list-vocabulary-categories",
    method: "GET",
    path: "/api/vocabulary/categories",
    title: "List Vocabulary Categories",
    description: "Lists vocabulary categories.",
    requestFields: []
  },
  {
    id: "list-vocabulary",
    method: "GET",
    path: "/api/vocabulary?category=...&limit=...&offset=...",
    title: "List Vocabulary",
    description: "Lists vocabulary items with optional pagination.",
    requestFields: []
  },
  {
    id: "list-due-vocabulary",
    method: "GET",
    path: "/api/vocabulary/review/due?limit=...",
    title: "List Due Vocabulary",
    description: "Returns the focused vocabulary review queue, due count, and next scheduled review.",
    requestFields: []
  },
  {
    id: "list-expression-categories",
    method: "GET",
    path: "/api/expressions/categories",
    title: "List Alltagssprache Categories",
    description: "Returns dynamic Alltagssprache generation categories configured in backend.",
    requestFields: []
  },
  {
    id: "generate-expression",
    method: "POST",
    path: "/api/expressions/generate",
    title: "Generate Alltagssprache Expression",
    description: "Generates one English everyday sentence/expression for a selected category.",
    requestFields: [
      {
        name: "category",
        label: "Category",
        type: "text",
        required: false,
        placeholder: "Use value from GET /api/expressions/categories"
      }
    ]
  },
  {
    id: "generate-expression-pool",
    method: "POST",
    path: "/api/expressions/pool",
    title: "Generate Alltagssprache Prompt Pool",
    description: "Pre-generates multiple prompts per selected category for client-side caching.",
    requestFields: [
      {
        name: "categories",
        label: "Categories (JSON array)",
        type: "textarea",
        required: false,
        placeholder: "[\"random\", \"work\", \"transport\"]"
      },
      {
        name: "countPerCategory",
        label: "Count Per Category",
        type: "number",
        required: false,
        placeholder: "5"
      }
    ]
  },
  {
    id: "next-expression",
    method: "POST",
    path: "/api/expressions/next",
    title: "Get Next Alltagssprache Prompt",
    description: "Returns next unseen prompt for the user from shared category pool; generates only when pool is exhausted.",
    requestFields: [
      {
        name: "category",
        label: "Category",
        type: "text",
        required: false,
        placeholder: "Use value from GET /api/expressions/categories"
      }
    ]
  },
  {
    id: "assess-expression-recognition",
    method: "POST",
    path: "/api/expressions/recognition",
    title: "Assess Alltagssprache Recognition",
    description: "Checks a multiple-choice recognition answer and schedules the spaced production phase.",
    requestFields: [
      { name: "promptId", label: "Prompt ID", type: "number", required: true, placeholder: "1" },
      { name: "chosenText", label: "Chosen option (German)", type: "text", required: true }
    ]
  },
  {
    id: "assess-expression",
    method: "POST",
    path: "/api/expressions/attempt",
    title: "Assess Alltagssprache Answer",
    description: "Returns naturalness score (0-100), feedback, and native-like phrasing.",
    requestFields: [
      {
        name: "promptId",
        label: "Prompt ID",
        type: "number",
        required: true,
        placeholder: "1"
      },
      {
        name: "userAnswerText",
        label: "German Answer",
        type: "textarea",
        required: true,
        placeholder: "Ich bin zu Tode gelangweilt."
      }
    ]
  },
  {
    id: "list-expression-history",
    method: "GET",
    path: "/api/expressions/history?limit=...&offset=...",
    title: "List Alltagssprache History",
    description: "Lists recent Alltagssprache attempts with pagination.",
    requestFields: []
  },
  {
    id: "list-expression-review",
    method: "GET",
    path: "/api/expressions/review",
    title: "List Alltagssprache Review Queue",
    description: "Lists due Alltagssprache review items auto-added from low scores.",
    requestFields: []
  },
  {
    id: "assess-expression-review",
    method: "POST",
    path: "/api/expressions/review/:id/attempt",
    title: "Assess Alltagssprache Review Attempt",
    description: "Assesses a review attempt with a lighter token-efficient AI call.",
    requestFields: [
      {
        name: "userAnswerText",
        label: "German Answer",
        type: "textarea",
        required: true,
        placeholder: "Das ist nicht mein Ding."
      }
    ]
  },
  {
    id: "list-collocation-categories",
    method: "GET",
    path: "/api/collocations/categories",
    title: "List Collocation Categories",
    description: "Returns Kollokationen practice categories configured in backend.",
    requestFields: []
  },
  {
    id: "next-collocation",
    method: "POST",
    path: "/api/collocations/next",
    title: "Get Next Collocation Prompt",
    description: "Returns next unseen collocation cloze prompt from the shared category pool.",
    requestFields: [
      {
        name: "category",
        label: "Category",
        type: "text",
        required: false,
        placeholder: "Use value from GET /api/collocations/categories"
      }
    ]
  },
  {
    id: "assess-collocation",
    method: "POST",
    path: "/api/collocations/attempt",
    title: "Assess Collocation Answer",
    description: "Scores the learner's gap answer (0-100) with partner-word feedback and alternatives.",
    requestFields: [
      {
        name: "promptId",
        label: "Prompt ID",
        type: "number",
        required: true,
        placeholder: "1"
      },
      {
        name: "userAnswerText",
        label: "German Answer (gap text)",
        type: "textarea",
        required: true,
        placeholder: "eine Entscheidung treffen"
      }
    ]
  },
  {
    id: "list-collocation-history",
    method: "GET",
    path: "/api/collocations/history?limit=...&offset=...",
    title: "List Collocation History",
    description: "Lists recent collocation attempts with pagination.",
    requestFields: []
  },
  {
    id: "list-collocation-review",
    method: "GET",
    path: "/api/collocations/review",
    title: "List Collocation Review Queue",
    description: "Lists due collocation review items auto-added from low scores.",
    requestFields: []
  },
  {
    id: "assess-collocation-review",
    method: "POST",
    path: "/api/collocations/review/:id/attempt",
    title: "Assess Collocation Review Attempt",
    description: "Re-tests a weak collocation against its baseline answer.",
    requestFields: [
      {
        name: "userAnswerText",
        label: "German Answer (gap text)",
        type: "textarea",
        required: true,
        placeholder: "Verantwortung übernehmen"
      }
    ]
  },
  {
    id: "review-vocabulary",
    method: "POST",
    path: "/api/vocabulary/:id/review",
    title: "Review Vocabulary",
    description: "Submits SRS memory rating points (1=Again, 2=Hard, 3=Good, 4=Easy).",
    requestFields: [
      {
        name: "rating",
        label: "Rating",
        type: "number",
        required: true,
        placeholder: "3"
      }
    ]
  },
  {
    id: "list-conversation-scenarios",
    method: "GET",
    path: "/api/conversations/scenarios",
    title: "List Conversation Scenarios",
    description: "Returns the available Gespräch role-play scenarios.",
    requestFields: []
  },
  {
    id: "start-conversation",
    method: "POST",
    path: "/api/conversations",
    title: "Start Conversation",
    description: "Starts a level-scaled role-play conversation and returns the AI's opening turn.",
    requestFields: [{ name: "scenarioId", label: "Scenario ID", type: "text", required: true, placeholder: "cafe" }]
  },
  {
    id: "send-conversation-message",
    method: "POST",
    path: "/api/conversations/:id/message",
    title: "Send Conversation Message",
    description: "Sends the learner's German turn and returns the AI character's reply.",
    requestFields: [{ name: "content", label: "Your German message", type: "textarea", required: true }]
  },
  {
    id: "end-conversation",
    method: "POST",
    path: "/api/conversations/:id/end",
    title: "End Conversation",
    description: "Ends the conversation and returns a debrief (corrections + vocab suggestions).",
    requestFields: []
  },
  {
    id: "list-conversations",
    method: "GET",
    path: "/api/conversations?limit=...&offset=...",
    title: "List Conversations",
    description: "Lists the user's past conversations with previews.",
    requestFields: []
  },
  {
    id: "get-conversation",
    method: "GET",
    path: "/api/conversations/:id",
    title: "Get Conversation",
    description: "Fetches one conversation with all its messages (and debrief if ended).",
    requestFields: []
  },
  {
    id: "delete-conversation",
    method: "POST",
    path: "/api/conversations/:id (DELETE)",
    title: "Delete Conversation",
    description: "Deletes a conversation and its messages.",
    requestFields: []
  },
  {
    id: "get-progress",
    method: "GET",
    path: "/api/progress",
    title: "Get Progress",
    description: "Returns CEFR level, estimated readiness toward the next level, recent score trend, and top mistakes.",
    requestFields: []
  },
  {
    id: "get-level",
    method: "GET",
    path: "/api/level",
    title: "Get User Level",
    description: "Returns the authenticated user's CEFR level, rationale, and assessment date.",
    requestFields: []
  },
  {
    id: "get-level-exam",
    method: "GET",
    path: "/api/level/exam",
    title: "Get Placement Exam",
    description: "Returns a lightweight CEFR placement exam with self-assessment, multiple-choice questions, and one short writing prompt.",
    requestFields: []
  },
  {
    id: "assess-level",
    method: "POST",
    path: "/api/level/assess",
    title: "Assess Placement Exam",
    description: "Estimates CEFR from self-estimate, multiple-choice answers, and one short writing sample.",
    requestFields: [
      {
        name: "selfEstimate",
        label: "Self Estimate",
        type: "text",
        required: true,
        placeholder: "B1"
      },
      {
        name: "answers",
        label: "Answers (JSON array of {questionId, selectedOptionId})",
        type: "textarea",
        required: true
      },
      {
        name: "writingAnswer",
        label: "Writing Answer",
        type: "textarea",
        required: false
      }
    ]
  },
  {
    id: "set-level",
    method: "POST",
    path: "/api/level",
    title: "Set Level Manually",
    description: "Manually sets the user's CEFR level (A1-C2).",
    requestFields: [{ name: "cefrLevel", label: "CEFR Level", type: "text", required: true, placeholder: "B1" }]
  },
  {
    id: "dashboard-overview",
    method: "GET",
    path: "/api/dashboard/overview",
    title: "Dashboard Overview",
    description: "Returns daily goal checklist, day streak, 14-day activity, totals, due counts, and score trends.",
    requestFields: []
  },
  {
    id: "daily-talk-streak",
    method: "GET",
    path: "/api/streaks/daily-talk",
    title: "Daily Talk Streak",
    description: "Fetches current Daily Talk streak and remaining time window.",
    requestFields: []
  },
  {
    id: "submit-text",
    method: "POST",
    path: "/api/submissions/text",
    title: "Submit Text",
    description: "Submits a Daily Talk response for analysis and persistence using a generated question ID.",
    requestFields: [
      {
        name: "questionId",
        label: "Generated Question ID",
        type: "number",
        required: true,
        placeholder: "3"
      },
      {
        name: "answerText",
        label: "Answer Text",
        type: "textarea",
        required: true,
        placeholder: "Am Wochenende ich habe mit meine Freund gehen park."
      }
    ]
  },
  {
    id: "list-submissions",
    method: "GET",
    path: "/api/submissions",
    title: "List Submissions",
    description: "Lists Daily Talk submissions with analysis details.",
    requestFields: []
  },
  {
    id: "get-submission",
    method: "GET",
    path: "/api/submissions/:id",
    title: "Get Submission",
    description: "Fetches one Daily Talk submission by ID.",
    requestFields: []
  }
];
