import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserCefrLevel1780888000000 implements MigrationInterface {
  name = "AddUserCefrLevel1780888000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cefr_level text NULL`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cefr_rationale text NULL`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cefr_assessed_at timestamptz NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS cefr_assessed_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS cefr_rationale`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS cefr_level`);
  }
}
