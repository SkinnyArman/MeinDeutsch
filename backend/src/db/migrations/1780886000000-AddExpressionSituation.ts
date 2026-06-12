import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpressionSituation1780886000000 implements MigrationInterface {
  name = "AddExpressionSituation1780886000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE expression_prompts
      ADD COLUMN IF NOT EXISTS situation_text text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE expression_prompts
      DROP COLUMN IF EXISTS situation_text
    `);
  }
}
