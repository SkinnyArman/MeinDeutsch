import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddVocabularyDueIndex1780882000000 implements MigrationInterface {
  name = "AddVocabularyDueIndex1780882000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_vocabulary_items_user_due
      ON vocabulary_items(user_id, srs_due_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_vocabulary_items_user_due
    `);
  }
}
