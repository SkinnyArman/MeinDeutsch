import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCollocationTables1780885000000 implements MigrationInterface {
  name = "AddCollocationTables1780885000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS collocation_prompts (
        id bigserial PRIMARY KEY,
        user_id bigint REFERENCES users(id) ON DELETE SET NULL,
        german_text text NOT NULL,
        normalized_german_text text NOT NULL,
        english_text text NOT NULL,
        cloze_sentence text NOT NULL,
        cloze_answer text NOT NULL,
        collocation_type text NOT NULL DEFAULT 'verb_noun',
        generation_category text NOT NULL DEFAULT 'random',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_collocation_prompts_category_normalized_text
      ON collocation_prompts(generation_category, normalized_german_text)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS collocation_prompt_views (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt_id bigint NOT NULL REFERENCES collocation_prompts(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_collocation_prompt_view_user_prompt UNIQUE (user_id, prompt_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_collocation_prompt_views_user
      ON collocation_prompt_views(user_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS collocation_attempts (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt_id bigint NOT NULL REFERENCES collocation_prompts(id) ON DELETE CASCADE,
        german_text text NOT NULL,
        english_text text NOT NULL,
        cloze_sentence text NOT NULL,
        user_answer_text text NOT NULL,
        score integer NOT NULL DEFAULT 0,
        feedback text NOT NULL,
        correct_version text NOT NULL,
        alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_collocation_attempts_user
      ON collocation_attempts(user_id, created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS collocation_review_items (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        german_text text NOT NULL,
        normalized_german_text text NOT NULL,
        english_text text NOT NULL,
        cloze_sentence text NOT NULL,
        initial_score integer NOT NULL,
        last_score integer NOT NULL,
        success_count integer NOT NULL DEFAULT 0,
        review_attempt_count integer NOT NULL DEFAULT 0,
        next_review_at timestamptz NOT NULL,
        last_reviewed_at timestamptz,
        status text NOT NULL DEFAULT 'active',
        baseline_correct_version text NOT NULL,
        baseline_alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
        baseline_feedback text NOT NULL,
        score_history jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_collocation_review_user_normalized UNIQUE (user_id, normalized_german_text)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_collocation_review_user_due
      ON collocation_review_items(user_id, status, next_review_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS collocation_review_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS collocation_attempts`);
    await queryRunner.query(`DROP TABLE IF EXISTS collocation_prompt_views`);
    await queryRunner.query(`DROP TABLE IF EXISTS collocation_prompts`);
  }
}
