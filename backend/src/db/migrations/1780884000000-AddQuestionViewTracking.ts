import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuestionViewTracking1780884000000 implements MigrationInterface {
  name = "AddQuestionViewTracking1780884000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE questions
      ADD COLUMN IF NOT EXISTS viewed_at timestamptz NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_questions_user_topic_viewed
      ON questions(user_id, topic_id, viewed_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_questions_user_topic_viewed
    `);
    await queryRunner.query(`
      ALTER TABLE questions
      DROP COLUMN IF EXISTS viewed_at
    `);
  }
}
