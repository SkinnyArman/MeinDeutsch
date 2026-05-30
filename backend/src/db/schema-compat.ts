import { appDataSource } from "./pool.js";

export const ensureSchemaCompat = async (): Promise<void> => {
  const runner = appDataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.query(`
      ALTER TABLE expression_prompts
      ADD COLUMN IF NOT EXISTS generation_category text NOT NULL DEFAULT 'random'
    `);

    await runner.query(`
      CREATE TABLE IF NOT EXISTS expression_prompt_views (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL,
        prompt_id bigint NOT NULL REFERENCES expression_prompts(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_expression_prompt_view_user_prompt UNIQUE(user_id, prompt_id)
      )
    `);

    await runner.query(`
      CREATE INDEX IF NOT EXISTS idx_expression_prompt_views_user_id ON expression_prompt_views(user_id)
    `);

    await runner.query(`
      CREATE INDEX IF NOT EXISTS idx_expression_prompt_views_prompt_id ON expression_prompt_views(prompt_id)
    `);
  } finally {
    await runner.release();
  }
};
