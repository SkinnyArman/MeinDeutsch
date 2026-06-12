import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpressionRecognition1780887000000 implements MigrationInterface {
  name = "AddExpressionRecognition1780887000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Stored target answer + distractors power the recognition (MCQ) phase and
    // give the production phase a fixed reference answer.
    await queryRunner.query(`
      ALTER TABLE expression_prompts
      ADD COLUMN IF NOT EXISTS native_answer text NULL
    `);
    await queryRunner.query(`
      ALTER TABLE expression_prompts
      ADD COLUMN IF NOT EXISTS distractors jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // Per-user phase state: recognition now, production later.
    await queryRunner.query(`
      ALTER TABLE expression_prompt_views
      ADD COLUMN IF NOT EXISTS recognition_done_at timestamptz NULL
    `);
    await queryRunner.query(`
      ALTER TABLE expression_prompt_views
      ADD COLUMN IF NOT EXISTS production_due_at timestamptz NULL
    `);
    await queryRunner.query(`
      ALTER TABLE expression_prompt_views
      ADD COLUMN IF NOT EXISTS production_done_at timestamptz NULL
    `);

    // Distinguish recognition vs production attempts so history/trends/review
    // only reflect production while the daily goal still counts any practice.
    await queryRunner.query(`
      ALTER TABLE expression_attempts
      ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'production'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE expression_attempts DROP COLUMN IF EXISTS phase`);
    await queryRunner.query(`ALTER TABLE expression_prompt_views DROP COLUMN IF EXISTS production_done_at`);
    await queryRunner.query(`ALTER TABLE expression_prompt_views DROP COLUMN IF EXISTS production_due_at`);
    await queryRunner.query(`ALTER TABLE expression_prompt_views DROP COLUMN IF EXISTS recognition_done_at`);
    await queryRunner.query(`ALTER TABLE expression_prompts DROP COLUMN IF EXISTS distractors`);
    await queryRunner.query(`ALTER TABLE expression_prompts DROP COLUMN IF EXISTS native_answer`);
  }
}
