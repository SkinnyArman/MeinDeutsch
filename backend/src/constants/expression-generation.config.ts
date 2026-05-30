export interface ExpressionCategoryConfig {
  id: string;
  label: string;
  targetContexts: string[];
  targetTypes: string[];
}

export const EXPRESSION_TARGET_TYPES = [
  "idiom",
  "proverb",
  "casual_reaction",
  "social_phrase",
  "opinion_phrase",
  "complaint",
  "encouragement",
  "planning_phrase",
  "casual_profanity"
] as const;

export const EXPRESSION_TARGET_CONTEXTS = [
  "friendship",
  "family",
  "dating",
  "food",
  "travel",
  "money",
  "stress",
  "emotions",
  "health",
  "study",
  "university",
  "work",
  "cinema",
  "public_transport",
  "doctor_office",
  "parents",
  "little_kids",
  "concerts",
  "grocery_shopping",
  "neighbors_landlord",
  "time_pressure",
  "conflict",
  "success_failure"
] as const;

export const EXPRESSION_CATEGORIES: ExpressionCategoryConfig[] = [
  {
    id: "random",
    label: "Random",
    targetContexts: [...EXPRESSION_TARGET_CONTEXTS],
    targetTypes: [...EXPRESSION_TARGET_TYPES]
  },
  {
    id: "work",
    label: "At work",
    targetContexts: ["work", "time_pressure", "stress", "conflict"],
    targetTypes: ["planning_phrase", "opinion_phrase", "complaint", "encouragement"]
  },
  {
    id: "transport",
    label: "Bus/U-Bahn",
    targetContexts: ["public_transport", "travel", "time_pressure"],
    targetTypes: ["social_phrase", "casual_reaction", "complaint", "planning_phrase"]
  },
  {
    id: "home",
    label: "At home",
    targetContexts: ["family", "parents", "little_kids"],
    targetTypes: ["social_phrase", "opinion_phrase", "casual_reaction", "encouragement"]
  },
  {
    id: "slang",
    label: "Slang",
    targetContexts: ["friendship", "dating", "emotions", "stress"],
    targetTypes: ["casual_reaction", "casual_profanity", "opinion_phrase", "complaint"]
  },
  {
    id: "school",
    label: "School/Uni",
    targetContexts: ["school", "study", "university", "time_pressure"],
    targetTypes: ["planning_phrase", "complaint", "encouragement", "opinion_phrase"]
  },
  {
    id: "doctor",
    label: "Doctor's office",
    targetContexts: ["doctor_office", "health", "stress"],
    targetTypes: ["social_phrase", "complaint", "planning_phrase"]
  },
  {
    id: "cinema",
    label: "Cinema",
    targetContexts: ["cinema", "dating", "friendship"],
    targetTypes: ["social_phrase", "opinion_phrase", "casual_reaction"]
  },
  {
    id: "concert",
    label: "Concert",
    targetContexts: ["concerts", "friendship", "emotions"],
    targetTypes: ["casual_reaction", "social_phrase", "encouragement", "opinion_phrase"]
  },
  {
    id: "food",
    label: "Food",
    targetContexts: ["food", "grocery_shopping", "money"],
    targetTypes: ["social_phrase", "complaint", "opinion_phrase"]
  },
  {
    id: "travel",
    label: "Travel",
    targetContexts: ["travel", "public_transport", "neighbors_landlord"],
    targetTypes: ["planning_phrase", "social_phrase", "complaint"]
  },
  {
    id: "sprichwort",
    label: "Sprichwort",
    targetContexts: ["success_failure", "time_pressure", "conflict"],
    targetTypes: ["proverb", "idiom"]
  }
];

export const EXPRESSION_GENERATION_CATEGORIES = EXPRESSION_CATEGORIES.map((category) => category.id);
export type ExpressionGenerationCategory = (typeof EXPRESSION_GENERATION_CATEGORIES)[number];

export const EXPRESSION_CATEGORY_BY_ID = Object.fromEntries(
  EXPRESSION_CATEGORIES.map((category) => [category.id, category])
) as Record<ExpressionGenerationCategory, ExpressionCategoryConfig>;

