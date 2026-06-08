import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddVocabularyReviewHistory1780883000000 implements MigrationInterface {
  name = "AddVocabularyReviewHistory1780883000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE vocabulary_review_logs (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vocabulary_item_id bigint NOT NULL REFERENCES vocabulary_items(id) ON DELETE CASCADE,
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 4),
        previous_due_at timestamptz,
        next_due_at timestamptz NOT NULL,
        previous_interval_days integer NOT NULL,
        next_interval_days integer NOT NULL,
        previous_ease_factor double precision NOT NULL,
        next_ease_factor double precision NOT NULL,
        reviewed_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_vocabulary_review_logs_user_id
      ON vocabulary_review_logs(user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_vocabulary_review_logs_item_reviewed
      ON vocabulary_review_logs(vocabulary_item_id, reviewed_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS vocabulary_review_logs");
  }
}
