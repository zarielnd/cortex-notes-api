import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignWithSystemDesign1772719560433 implements MigrationInterface {
    name = 'AlignWithSystemDesign1772719560433'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "isRevoked" TO "revokedAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "revokedAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "revokedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP COLUMN "revokedAt"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD "revokedAt" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" RENAME COLUMN "revokedAt" TO "isRevoked"`);
    }

}
