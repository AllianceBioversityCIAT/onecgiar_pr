import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Batch wrapper around resultFullDataByResultCode: one round-trip for the full export list.
 * Uses a per-row EXIT HANDLER for errno 1172 (scalar subquery returned more than one row)
 * so one bad pair does not abort the whole batch.
 */
export class ResultFullMetadataBatchProcedure1775001000000
  implements MigrationInterface
{
  name = 'ResultFullMetadataBatchProcedure1775001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`sp_result_full_metadata_batch\``,
    );
    await queryRunner.query(`
CREATE PROCEDURE \`sp_result_full_metadata_batch\`(
  IN p_pairs_json JSON,
  IN p_pdf_url TEXT,
  OUT p_out_json JSON
)
BEGIN
  DECLARE i INT DEFAULT 0;
  DECLARE n INT;
  DECLARE v_rc BIGINT;
  DECLARE v_vid BIGINT;
  DECLARE v_payload JSON;

  SET n = COALESCE(JSON_LENGTH(p_pairs_json), 0);
  SET p_out_json = JSON_ARRAY();

  WHILE i < n DO
    SET v_rc = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_pairs_json, CONCAT('$[', i, '].result_code'))) AS SIGNED);
    SET v_vid = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_pairs_json, CONCAT('$[', i, '].version_id'))) AS SIGNED);

    BEGIN
      DECLARE EXIT HANDLER FOR 1172
      BEGIN
        SET p_out_json = JSON_ARRAY_APPEND(
          p_out_json,
          '$',
          JSON_OBJECT(
            'result_code', v_rc,
            'version_id', v_vid,
            'error', 'ER_TOO_MANY_ROWS'
          )
        );
      END;

      SET v_payload = resultFullDataByResultCode(v_rc, v_vid, p_pdf_url);
      SET p_out_json = JSON_ARRAY_APPEND(
        p_out_json,
        '$',
        JSON_OBJECT(
          'result_code', v_rc,
          'version_id', v_vid,
          'payload', v_payload
        )
      );
    END;

    SET i = i + 1;
  END WHILE;
END
`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP PROCEDURE IF EXISTS \`sp_result_full_metadata_batch\``,
    );
  }
}
