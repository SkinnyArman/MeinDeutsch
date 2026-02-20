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
    id: "health",
    method: "GET",
    path: "/api/health",
    title: "Health Check",
    description: "Checks API and DB connectivity.",
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
    id: "submit-text",
    method: "POST",
    path: "/api/submissions/text",
    title: "Submit Text",
    description: "Submits a Daily Talk response for analysis and persistence (frontend can keep it concise).",
    requestFields: [
      {
        name: "questionId",
        label: "Question ID",
        type: "number",
        required: false,
        placeholder: "3"
      },
      {
        name: "prompt",
        label: "Question Text (Fallback)",
        type: "text",
        required: false,
        placeholder: "Describe your weekend in German"
      },
      {
        name: "answerText",
        label: "Answer Text",
        type: "textarea",
        required: true,
        placeholder: "Am Wochenende ich habe mit meine Freund gehen park."
      }
    ]
  }
];
