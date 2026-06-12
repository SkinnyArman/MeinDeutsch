import { appDataSource } from "../src/db/pool.js";
import { DEFAULT_TOPICS } from "../src/constants/default-topics.js";
import { User } from "../src/models/user.model.js";
import { topicRepository } from "../src/repositories/topic.repository.js";

const seed = async (): Promise<void> => {
  await appDataSource.initialize();

  const users = await appDataSource.getRepository(User).find();
  for (const user of users) {
    const created = await topicRepository.createMissingByName(Number(user.id), DEFAULT_TOPICS);
    console.log(`${user.email}: added ${created.length} default topic(s)${created.length ? ` (${created.map((t) => t.name).join(", ")})` : ""}`);
  }

  await appDataSource.destroy();
};

seed().catch((error: unknown) => {
  console.error("Seeding default topics failed", error);
  process.exit(1);
});
