export interface CollocationCategoryConfig {
  id: string;
  label: string;
  targetContexts: string[];
}

export const COLLOCATION_TYPES = [
  "verb_noun",
  "adj_noun",
  "noun_verb",
  "verb_prep",
  "fixed_pair"
] as const;

export type CollocationType = (typeof COLLOCATION_TYPES)[number];

export const COLLOCATION_TARGET_CONTEXTS = [
  "work_office",
  "studies_university",
  "everyday_errands",
  "opinions_discussions",
  "feelings_relationships",
  "health_body",
  "travel_transport",
  "money_shopping",
  "news_society",
  "plans_decisions"
] as const;

export const COLLOCATION_CATEGORIES: CollocationCategoryConfig[] = [
  {
    id: "random",
    label: "Random",
    targetContexts: [...COLLOCATION_TARGET_CONTEXTS]
  },
  {
    id: "work",
    label: "Work & Office",
    targetContexts: ["work_office", "plans_decisions"]
  },
  {
    id: "studies",
    label: "Studies & Uni",
    targetContexts: ["studies_university"]
  },
  {
    id: "opinions",
    label: "Opinions & Discussions",
    targetContexts: ["opinions_discussions", "news_society"]
  },
  {
    id: "everyday",
    label: "Everyday Life",
    targetContexts: ["everyday_errands", "money_shopping", "travel_transport"]
  },
  {
    id: "feelings",
    label: "Feelings & People",
    targetContexts: ["feelings_relationships", "health_body"]
  }
];

export const COLLOCATION_CATEGORY_BY_ID: Record<string, CollocationCategoryConfig> =
  COLLOCATION_CATEGORIES.reduce<Record<string, CollocationCategoryConfig>>((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});

export const COLLOCATION_GENERATION_CATEGORIES = COLLOCATION_CATEGORIES.map((category) => category.id);

export type CollocationGenerationCategory = (typeof COLLOCATION_GENERATION_CATEGORIES)[number];
