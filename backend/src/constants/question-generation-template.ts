export const QUESTION_GENERATION_TEMPLATE = `Generate exactly one short German question using only the provided topic context.
Constraints:
- Keep it concise (one sentence, ideally 8-12 words).
- The question must be practical and concrete.
- Avoid yes/no-only questions.
- The learner should answer in 2-4 German sentences.
- Pitch the question's vocabulary and structures to the provided CEFR target (the learner's level): simpler and more concrete for A1/A2, richer and more abstract for C1/C2. The question wording itself should sit near that level.
- Strict anti-repetition: do not output a question identical or near-identical to entries in the provided avoid list.`;
