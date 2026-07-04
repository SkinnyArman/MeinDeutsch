export const QUESTION_GENERATION_TEMPLATE = `Generate exactly one German WRITING PROMPT using only the provided topic context.
Constraints:
- One or two sentences that set up a short writing task the learner will respond to.
- The learner should respond with a coherent paragraph or two (roughly 5-10 sentences), so the prompt must invite development, not a one-line answer.
- Elicit opinion, description, narration, comparison, or reflection. Do NOT ask for a letter, an email, or any formal correspondence.
- Concrete and engaging; avoid yes/no prompts.
- Pitch the prompt's vocabulary and structures to the provided CEFR target (the learner's level): simpler for A1/A2, richer and more abstract for C1/C2.
- Strict anti-repetition: do not output a prompt identical or near-identical to entries in the provided avoid list.`;
