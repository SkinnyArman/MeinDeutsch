import type { MigrationInterface, QueryRunner } from "typeorm";

const USER_OWNED_TABLES = [
  "topics",
  "questions",
  "answer_logs",
  "mistake_stats",
  "knowledge_items",
  "streak_status",
  "vocabulary_items",
  "expression_prompt_views",
  "expression_attempts",
  "expression_review_items"
] as const;

export class InitialSchemaAndUserOwnership1780880000000 implements MigrationInterface {
  name = "InitialSchemaAndUserOwnership1780880000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id bigserial PRIMARY KEY,
        google_sub text NOT NULL,
        email text NOT NULL,
        display_name text,
        avatar_url text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_users_google_sub UNIQUE (google_sub),
        CONSTRAINT uq_users_email UNIQUE (email)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id bigserial PRIMARY KEY,
        user_id bigint,
        name text NOT NULL,
        description text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_topics_user_name UNIQUE (user_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id bigserial PRIMARY KEY,
        user_id bigint,
        topic_id bigint NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        question_text text NOT NULL,
        cefr_target text,
        generation_prompt text NOT NULL,
        source text NOT NULL DEFAULT 'ai',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS answer_logs (
        id bigserial PRIMARY KEY,
        user_id bigint,
        prompt text NOT NULL,
        question_id bigint REFERENCES questions(id) ON DELETE SET NULL,
        answer_text text NOT NULL,
        corrected_text text NOT NULL DEFAULT '',
        cefr_level text NOT NULL DEFAULT 'unknown',
        error_types jsonb NOT NULL DEFAULT '[]'::jsonb,
        tips jsonb NOT NULL DEFAULT '[]'::jsonb,
        contextual_word_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
        model_used text NOT NULL DEFAULT 'unknown',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mistake_stats (
        id bigserial PRIMARY KEY,
        user_id bigint,
        mistake_type text NOT NULL,
        frequency integer NOT NULL DEFAULT 0,
        severity_score double precision NOT NULL DEFAULT 0,
        last_seen timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_mistake_stats_user_type UNIQUE (user_id, mistake_type)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS knowledge_items (
        id bigserial PRIMARY KEY,
        user_id bigint,
        topic_id bigint REFERENCES topics(id) ON DELETE SET NULL,
        question_id bigint REFERENCES questions(id) ON DELETE SET NULL,
        answer_log_id bigint REFERENCES answer_logs(id) ON DELETE SET NULL,
        item_type text NOT NULL DEFAULT 'daily_talk_submission',
        text_chunk text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS streak_status (
        id bigserial PRIMARY KEY,
        user_id bigint,
        feature_key text NOT NULL,
        current_streak integer NOT NULL DEFAULT 0,
        longest_streak integer NOT NULL DEFAULT 0,
        last_completion_date date,
        window_start_at timestamptz NOT NULL,
        window_end_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_streak_user_feature UNIQUE (user_id, feature_key)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vocabulary_items (
        id bigserial PRIMARY KEY,
        user_id bigint,
        word text NOT NULL,
        normalized_word text NOT NULL,
        description text NOT NULL,
        examples jsonb NOT NULL DEFAULT '[]'::jsonb,
        category text NOT NULL DEFAULT 'General',
        source_answer_log_id bigint,
        source_question_id bigint,
        srs_interval_days integer NOT NULL DEFAULT 0,
        srs_ease_factor double precision NOT NULL DEFAULT 2.5,
        srs_due_at timestamptz,
        srs_last_rating integer,
        srs_review_count integer NOT NULL DEFAULT 0,
        srs_lapse_count integer NOT NULL DEFAULT 0,
        srs_last_reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_vocabulary_user_word_category UNIQUE (user_id, normalized_word, category)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expression_prompts (
        id bigserial PRIMARY KEY,
        user_id bigint,
        english_text text NOT NULL,
        generated_context text,
        generation_category text NOT NULL DEFAULT 'random',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE expression_prompts
      ADD COLUMN IF NOT EXISTS generation_category text NOT NULL DEFAULT 'random'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expression_prompt_views (
        id bigserial PRIMARY KEY,
        user_id bigint,
        prompt_id bigint NOT NULL REFERENCES expression_prompts(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_expression_prompt_view_user_prompt UNIQUE (user_id, prompt_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expression_attempts (
        id bigserial PRIMARY KEY,
        user_id bigint,
        prompt_id bigint NOT NULL REFERENCES expression_prompts(id) ON DELETE CASCADE,
        english_text text NOT NULL,
        user_answer_text text NOT NULL,
        naturalness_score integer NOT NULL DEFAULT 0,
        feedback text NOT NULL,
        native_like_version text NOT NULL,
        alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expression_review_items (
        id bigserial PRIMARY KEY,
        user_id bigint,
        english_text text NOT NULL,
        normalized_english_text text NOT NULL,
        initial_score integer NOT NULL,
        last_score integer NOT NULL,
        success_count integer NOT NULL DEFAULT 0,
        review_attempt_count integer NOT NULL DEFAULT 0,
        next_review_at timestamptz NOT NULL,
        last_reviewed_at timestamptz,
        status text NOT NULL DEFAULT 'active',
        baseline_native_like_version text NOT NULL,
        baseline_alternatives jsonb NOT NULL DEFAULT '[]'::jsonb,
        baseline_feedback text NOT NULL,
        score_history jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const table of USER_OWNED_TABLES) {
      await queryRunner.query(`
        DELETE FROM ${table} owned
        WHERE owned.user_id IS NULL
           OR NOT EXISTS (SELECT 1 FROM users WHERE users.id = owned.user_id)
      `);
      await queryRunner.query(`ALTER TABLE ${table} ALTER COLUMN user_id SET NOT NULL`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_${table}_user_id ON ${table}(user_id)`);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_${table}_user'
          ) THEN
            ALTER TABLE ${table}
              ADD CONSTRAINT fk_${table}_user
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
          END IF;
        END
        $$
      `);
    }

    await queryRunner.query(`
      UPDATE expression_prompts prompt
      SET user_id = NULL
      WHERE prompt.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users WHERE users.id = prompt.user_id)
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_expression_prompts_user'
        ) THEN
          ALTER TABLE expression_prompts
            ADD CONSTRAINT fk_expression_prompts_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
      END
      $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_answer_logs_question_id ON answer_logs(question_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_expression_prompt_views_prompt_id ON expression_prompt_views(prompt_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_expression_attempts_prompt_id ON expression_attempts(prompt_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_expression_prompts_category_created_at
      ON expression_prompts(generation_category, created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS expression_review_items CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS expression_attempts CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS expression_prompt_views CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS expression_prompts CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS vocabulary_items CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS streak_status CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS knowledge_items CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS mistake_stats CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS answer_logs CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS questions CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS topics CASCADE");
    await queryRunner.query("DROP TABLE IF EXISTS users CASCADE");
  }
}
