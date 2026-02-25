import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSelectionSelectionUserNoteAttachmentNoteVersion1772014851454 implements MigrationInterface {
    name = 'AddSelectionSelectionUserNoteAttachmentNoteVersion1772014851454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "selection_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "selection_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'viewer', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c4dbf629511f7671902223680ad" UNIQUE ("selection_id", "user_id"), CONSTRAINT "PK_7c0f73bdc8924b291ec13bec461" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "note_versions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "note_id" uuid NOT NULL, "edited_by" uuid NOT NULL, "title" character varying(500) NOT NULL, "content" text, "versionNumber" integer NOT NULL, "changeSummary" character varying(500), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e8f8bdb9b26fa5486cf6aeeaf02" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "note_id" uuid NOT NULL, "uploaded_by" uuid NOT NULL, "originalName" character varying(255) NOT NULL, "mimeType" character varying(255) NOT NULL, "s3Key" text NOT NULL, "s3Url" text NOT NULL, "sizeBytes" bigint NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'file', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(500) NOT NULL, "content" text, "selection_id" uuid NOT NULL, "created_by" uuid NOT NULL, "last_edited_by" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "selections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" character varying(1000), "created_by" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_ca8c40db57a61d47e4f5fbbf04e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "selection_members" ADD CONSTRAINT "FK_d991a72ada1cd41903786f968d1" FOREIGN KEY ("selection_id") REFERENCES "selections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "selection_members" ADD CONSTRAINT "FK_58c00b1f6748984d1fba3d986dd" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "note_versions" ADD CONSTRAINT "FK_71f17f1c33f2a4e36cc7cd80005" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "note_versions" ADD CONSTRAINT "FK_c02a8f98958dee5010186ab8060" FOREIGN KEY ("edited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attachments" ADD CONSTRAINT "FK_ed5d063daa36e150057dcc7f318" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attachments" ADD CONSTRAINT "FK_e25812e3fd9b3f3edf11b2c5d58" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_9c612baf6561ab7fde8837ce246" FOREIGN KEY ("selection_id") REFERENCES "selections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_b86c5f2b5de1e7a3d2a428cfb55" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_8e88b74ac282cc68604e776007f" FOREIGN KEY ("last_edited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "selections" ADD CONSTRAINT "FK_b9a35cdd3c5bf6f6f39186821c2" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "selections" DROP CONSTRAINT "FK_b9a35cdd3c5bf6f6f39186821c2"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_8e88b74ac282cc68604e776007f"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_b86c5f2b5de1e7a3d2a428cfb55"`);
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_9c612baf6561ab7fde8837ce246"`);
        await queryRunner.query(`ALTER TABLE "attachments" DROP CONSTRAINT "FK_e25812e3fd9b3f3edf11b2c5d58"`);
        await queryRunner.query(`ALTER TABLE "attachments" DROP CONSTRAINT "FK_ed5d063daa36e150057dcc7f318"`);
        await queryRunner.query(`ALTER TABLE "note_versions" DROP CONSTRAINT "FK_c02a8f98958dee5010186ab8060"`);
        await queryRunner.query(`ALTER TABLE "note_versions" DROP CONSTRAINT "FK_71f17f1c33f2a4e36cc7cd80005"`);
        await queryRunner.query(`ALTER TABLE "selection_members" DROP CONSTRAINT "FK_58c00b1f6748984d1fba3d986dd"`);
        await queryRunner.query(`ALTER TABLE "selection_members" DROP CONSTRAINT "FK_d991a72ada1cd41903786f968d1"`);
        await queryRunner.query(`DROP TABLE "selections"`);
        await queryRunner.query(`DROP TABLE "notes"`);
        await queryRunner.query(`DROP TABLE "attachments"`);
        await queryRunner.query(`DROP TABLE "note_versions"`);
        await queryRunner.query(`DROP TABLE "selection_members"`);
    }

}
