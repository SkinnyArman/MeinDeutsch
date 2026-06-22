import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddConversations1780889000000 implements MigrationInterface {
  name = "AddConversations1780889000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id bigserial PRIMARY KEY,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scenario_id text NOT NULL,
        scenario_label text NOT NULL,
        status text NOT NULL DEFAULT 'active',
        cefr_level text NULL,
        debrief jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        ended_at timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id bigserial PRIMARY KEY,
        conversation_id bigint NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL,
        content text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation
      ON conversation_messages(conversation_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_role
      ON conversation_messages(user_id, role, created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS conversation_messages`);
    await queryRunner.query(`DROP TABLE IF EXISTS conversations`);
  }
}
