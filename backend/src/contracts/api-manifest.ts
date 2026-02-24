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
    path: "/api/vocabulary?category=...",
    title: "List Vocabulary",
    description: "Lists vocabulary items, optionally filtered by category.",
    requestFields: []
  },
  {
    id: "generate-expression",
    method: "POST",
    path: "/api/expressions/generate",
    title: "Generate Alltagssprache Expression",
    description: "Generates one common English everyday sentence/expression.",
    requestFields: []
  },
  {
    id: "assess-expression",
    method: "POST",
    path: "/api/expressions/attempt",
    title: "Assess Alltagssprache Answer",
    description: "Checks user German answer for correctness and naturalness, and returns native-like phrasing.",
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
    path: "/api/expressions/history",
    title: "List Alltagssprache History",
    description: "Lists recent Alltagssprache attempts.",
    requestFields: []
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
