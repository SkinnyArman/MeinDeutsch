export const QUESTION_GENERATION_TEMPLATE = `Generate exactly one short German question using only the provided topic context.
Constraints:
- Keep it concise (one sentence, ideally 8-12 words).
- The question must be practical and concrete.
- Avoid yes/no-only questions.
- The learner should answer in 2-4 German sentences.
- Target upper-intermediate difficulty (B1+ to C1); the learner's answer is what gets CEFR-graded, not the question.
- Keep language aligned with the provided CEFR target when present.
- Strict anti-repetition: do not output a question identical or near-identical to entries in the provided avoid list.`;
