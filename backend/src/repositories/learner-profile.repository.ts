import { appDataSource } from "../db/pool.js";
import { MistakeStat } from "../models/mistake-stat.model.js";
import { VocabularyItem } from "../models/vocabulary-item.model.js";

export interface TopMistake {
  mistakeType: string;
  frequency: number;
}

export const learnerProfileRepository = {
  // Recurring mistake types, ranked by how often / how badly the learner makes them.
  async listTopMistakes(userId: number, limit: number): Promise<TopMistake[]> {
    const rows = await appDataSource
      .getRepository(MistakeStat)
      .createQueryBuilder("m")
      .where("m.user_id = :userId", { userId: String(userId) })
      .orderBy("m.frequency", "DESC")
      .addOrderBy("m.severity_score", "DESC")
      .take(limit)
      .getMany();
    return rows.map((row) => ({ mistakeType: row.mistakeType, frequency: row.frequency }));
  },

  // A few words the learner saved and is trying to learn (recent first), to
  // weave back into generated content and feedback.
  async listTargetWords(userId: number, limit: number): Promise<string[]> {
    const rows = await appDataSource
      .getRepository(VocabularyItem)
      .find({
        where: { userId: String(userId) },
        order: { createdAt: "DESC" },
        take: limit,
        select: { word: true }
      });
    return rows.map((row) => row.word).filter((w) => w.trim().length > 0);
  }
};
