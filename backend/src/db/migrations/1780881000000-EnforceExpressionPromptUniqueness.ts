import type { MigrationInterface, QueryRunner } from "typeorm";

export class EnforceExpressionPromptUniqueness1780881000000 implements MigrationInterface {
  name = "EnforceExpressionPromptUniqueness1780881000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE expression_prompts
      ADD COLUMN IF NOT EXISTS normalized_english_text text
    `);

    await queryRunner.query(`
      UPDATE expression_prompts
      SET normalized_english_text = regexp_replace(lower(trim(english_text)), '\\s+', ' ', 'g')
      WHERE normalized_english_text IS NULL OR normalized_english_text = ''
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE expression_prompt_duplicates ON COMMIT DROP AS
      SELECT
        id AS duplicate_id,
        min(id) OVER (
          PARTITION BY generation_category, normalized_english_text
        ) AS canonical_id
      FROM expression_prompts
    `);

    await queryRunner.query(`
      INSERT INTO expression_prompt_views (user_id, prompt_id, created_at)
      SELECT view_row.user_id, duplicate.canonical_id, min(view_row.created_at)
      FROM expression_prompt_views view_row
      JOIN expression_prompt_duplicates duplicate
        ON duplicate.duplicate_id = view_row.prompt_id
      WHERE duplicate.duplicate_id <> duplicate.canonical_id
      GROUP BY view_row.user_id, duplicate.canonical_id
      ON CONFLICT (user_id, prompt_id) DO NOTHING
    `);

    await queryRunner.query(`
      DELETE FROM expression_prompt_views view_row
      USING expression_prompt_duplicates duplicate
      WHERE view_row.prompt_id = duplicate.duplicate_id
        AND duplicate.duplicate_id <> duplicate.canonical_id
    `);

    await queryRunner.query(`
      UPDATE expression_attempts attempt
      SET prompt_id = duplicate.canonical_id
      FROM expression_prompt_duplicates duplicate
      WHERE attempt.prompt_id = duplicate.duplicate_id
        AND duplicate.duplicate_id <> duplicate.canonical_id
    `);

    await queryRunner.query(`
      DELETE FROM expression_prompts prompt
      USING expression_prompt_duplicates duplicate
      WHERE prompt.id = duplicate.duplicate_id
        AND duplicate.duplicate_id <> duplicate.canonical_id
    `);

    await queryRunner.query(`
      ALTER TABLE expression_prompts
      ALTER COLUMN normalized_english_text SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_expression_prompts_category_normalized_text
      ON expression_prompts(generation_category, normalized_english_text)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_expression_prompts_category_normalized_text
    `);
    await queryRunner.query(`
      ALTER TABLE expression_prompts DROP COLUMN IF EXISTS normalized_english_text
    `);
  }
}
