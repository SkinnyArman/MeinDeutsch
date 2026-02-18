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
  prompt: string;
  answerText: string;
}

export interface AnalysisError {
  type: MistakeType;
  message: string;
  severity: number;
}

export interface AnalysisMetrics {
  grammarAccuracy: number;
  lexicalDiversity: number;
  avgSentenceLength: number;
  clauseDepth: number;
}

export interface AnalysisResult {
  correctedText: string;
  nativeRewrite: string;
  tips: string[];
  errors: AnalysisError[];
  metrics: AnalysisMetrics;
}
