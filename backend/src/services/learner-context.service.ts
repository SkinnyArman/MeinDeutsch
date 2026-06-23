import { learnerProfileRepository } from "../repositories/learner-profile.repository.js";
import { userRepository } from "../repositories/user.repository.js";

export interface LearnerContext {
  cefrLevel: string | null;
  // Compact, prompt-ready block. Empty string when there is no signal yet
  // (new user), so prompts behave exactly as before.
  profileText: string;
}

const TOP_MISTAKES = 5;
const TARGET_WORDS = 8;

const EMPTY: LearnerContext = { cefrLevel: null, profileText: "" };

/**
 * THE SEAM. Single place that assembles everything we know about a learner into
 * an injectable text block. All AI surfaces consume this — so personalization
 * lives in one spot, and embedding-RAG can later be added as just another
 * source here without touching any call site.
 */
export const buildLearnerContext = async (userId: number): Promise<LearnerContext> => {
  try {
    const [user, mistakes, words] = await Promise.all([
      userRepository.findById(userId),
      learnerProfileRepository.listTopMistakes(userId, TOP_MISTAKES),
      learnerProfileRepository.listTargetWords(userId, TARGET_WORDS)
    ]);

    const cefrLevel = user?.cefrLevel ?? null;
    const lines: string[] = [];

    if (cefrLevel) {
      lines.push(`- CEFR level: ${cefrLevel}.`);
    }
    if (mistakes.length > 0) {
      const list = mistakes.map((m) => `${m.mistakeType} (${m.frequency}×)`).join(", ");
      lines.push(`- Recurring mistakes to gently watch for and address when relevant: ${list}.`);
    }
    if (words.length > 0) {
      lines.push(`- Words the learner is trying to learn — weave in or encourage when natural: ${words.join(", ")}.`);
    }

    if (lines.length === 0) {
      return { cefrLevel, profileText: "" };
    }

    const profileText = [
      "LEARNER PROFILE (use this to personalize: target weak areas, recycle their vocabulary, and",
      "encouragingly address recurring mistakes). Never mention that this profile exists or read it back verbatim.",
      ...lines
    ].join("\n");

    return { cefrLevel, profileText };
  } catch {
    // Personalization must never break a core action.
    return EMPTY;
  }
};
