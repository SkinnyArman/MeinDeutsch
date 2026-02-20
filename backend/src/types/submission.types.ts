export const MISTAKE_TYPES = [
  "article_gender",
  "article_case",
  "dative_preposition",
  "accusative_preposition",
  "main_clause_word_order",
  "subordinate_clause_word_order",
  "weak_connector",
  "connector_repetition",
  "weak_adjective",
  "limited_vocabulary_range",
  "tense_shift_error",
  "filler_word",
  "overuse_simple_sentence"
] as const;

export type MistakeType = (typeof MISTAKE_TYPES)[number];

export interface SubmissionInput {
  questionId: number;
  answerText: string;
}

export interface SubmissionAssessmentInput {
  questionText: string;
  answerText: string;
}

export interface AssessmentContext {
  topMistakes: Array<{
    type: MistakeType;
    frequency: number;
    severityScore: number;
  }>;
  recentTips: string[];
  recentQAs: Array<{
    questionText: string;
    answerText: string;
    correctedText: string;
    cefrLevel: string;
    tips: string[];
  }>;
}

export interface AnalysisError {
  type: MistakeType;
  message: string;
  severity: number;
}

export interface AnalysisResult {
  cefrLevel: string;
  correctedText: string;
  contextualWordSuggestions: string[];
  tips: string[];
  errors: AnalysisError[];
}
