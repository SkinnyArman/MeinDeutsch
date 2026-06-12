export interface ApiErrorBody {
  code: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiErrorBody | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TopicRecord {
  id: number;
  name: string;
  description: string | null;
  createdAt?: string;
}

export interface QuestionRecord {
  id: number;
  topicId: number;
  questionText: string;
  cefrTarget: string | null;
}

export interface AnalysisError {
  type: string;
  message: string;
  description: string;
  evidence: string;
  correction: string;
  start: number | null;
  end: number | null;
  severity: number;
}

export interface ContextualWordSuggestion {
  word: string;
  description: string;
  examples: string[];
}

export interface AnswerLogRecord {
  id: number;
  questionId: number | null;
  topicId?: number | null;
  topicName?: string;
  questionText: string;
  answerText: string;
  correctedText: string;
  cefrLevel: string;
  errorTypes: AnalysisError[];
  tips: string[];
  contextualWordSuggestions: ContextualWordSuggestion[];
  modelUsed: string;
  createdAt: string;
}

export interface VocabularyItemRecord {
  id: number;
  word: string;
  description: string;
  examples: string[];
  category: string;
  sourceAnswerLogId: number | null;
  sourceQuestionId: number | null;
  srsIntervalDays: number;
  srsEaseFactor: number;
  srsDueAt: string | null;
  srsLastRating: number | null;
  srsReviewCount: number;
  srsLapseCount: number;
  srsLastReviewedAt: string | null;
  createdAt: string;
}

export interface VocabularyCategoryRecord {
  name: string;
  icon: string;
}

export const VOCABULARY_REVIEW_RATINGS = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4
} as const;

export type VocabularyReviewRating =
  (typeof VOCABULARY_REVIEW_RATINGS)[keyof typeof VOCABULARY_REVIEW_RATINGS];

export interface VocabularyReviewQueuePayload {
  items: VocabularyItemRecord[];
  dueCount: number;
  nextDueAt: string | null;
  generatedAt: string;
}

export interface SavedVocabularyPayload {
  entry: VocabularyItemRecord;
  created: boolean;
}

export interface ExpressionPromptRecord {
  id: number;
  englishText: string;
  generatedContext: string | null;
  generationCategory: string;
  createdAt: string;
}

export interface ExpressionPromptPoolPayload {
  promptsByCategory: Record<string, ExpressionPromptRecord[]>;
  countPerCategory: number;
  categories: string[];
}

export interface ExpressionCategoryRecord {
  id: string;
  label: string;
}

export interface ExpressionAttemptRecord {
  id: number;
  promptId: number;
  englishText: string;
  userAnswerText: string;
  naturalnessScore: number;
  feedback: string;
  nativeLikeVersion: string;
  alternatives: string[];
  attemptHistory: ExpressionAttemptHistoryPoint[];
  createdAt: string;
}

export interface ExpressionAttemptHistoryPoint {
  id: number;
  userAnswerText: string;
  naturalnessScore: number;
  createdAt: string;
}

export interface ExpressionReviewScorePoint {
  score: number;
  at: string;
}

export interface ExpressionReviewItemRecord {
  id: number;
  englishText: string;
  initialScore: number;
  lastScore: number;
  successCount: number;
  reviewAttemptCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  status: "active" | "graduated";
  baselineNativeLikeVersion: string;
  baselineAlternatives: string[];
  baselineFeedback: string;
  scoreHistory: ExpressionReviewScorePoint[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpressionReviewListPayload {
  dueCount: number;
  items: ExpressionReviewItemRecord[];
}

export interface ExpressionReviewAssessmentPayload {
  reviewItem: ExpressionReviewItemRecord;
  naturalnessScore: number;
  feedback: string;
}

export interface CollocationCategoryRecord {
  id: string;
  label: string;
}

/**
 * Served practice prompt. Deliberately excludes the German collocation and
 * cloze answer — the learner has to produce them.
 */
export interface CollocationPromptRecord {
  id: number;
  englishText: string;
  clozeSentence: string;
  collocationType: string;
  generationCategory: string;
  createdAt: string;
}

export interface CollocationAttemptHistoryPoint {
  id: number;
  userAnswerText: string;
  score: number;
  createdAt: string;
}

export interface CollocationAttemptRecord {
  id: number;
  promptId: number;
  germanText: string;
  englishText: string;
  clozeSentence: string;
  userAnswerText: string;
  score: number;
  feedback: string;
  correctVersion: string;
  alternatives: string[];
  attemptHistory: CollocationAttemptHistoryPoint[];
  createdAt: string;
}

export interface CollocationReviewScorePoint {
  score: number;
  at: string;
}

export interface CollocationReviewItemRecord {
  id: number;
  germanText: string;
  englishText: string;
  clozeSentence: string;
  initialScore: number;
  lastScore: number;
  successCount: number;
  reviewAttemptCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  status: "active" | "graduated";
  baselineCorrectVersion: string;
  baselineAlternatives: string[];
  baselineFeedback: string;
  scoreHistory: CollocationReviewScorePoint[];
  createdAt: string;
  updatedAt: string;
}

export interface CollocationReviewListPayload {
  dueCount: number;
  items: CollocationReviewItemRecord[];
}

export interface CollocationReviewAssessmentPayload {
  reviewItem: CollocationReviewItemRecord;
  score: number;
  feedback: string;
}

export interface KnowledgeItemRecord {
  id: number;
  topicId: number | null;
  topicName?: string;
  questionId: number | null;
  answerLogId: number | null;
  itemType: string;
  textChunk: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface DailyTalkStreakRecord {
  featureKey: "daily_talk";
  currentStreak: number;
  longestStreak: number;
  hasCompletedToday: boolean;
  lastCompletionDate: string | null;
  windowStartAt: string;
  windowEndAt: string;
  remainingMs: number;
}
