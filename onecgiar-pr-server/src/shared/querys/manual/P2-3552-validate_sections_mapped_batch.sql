-- =====================================================================================================
-- P2-3552 — validate_sections_mapped_batch, corrected
--
-- APPLY BY HAND. Do NOT wrap this in a TypeORM migration.
--
-- Why not a migration: the `validation_*` bodies committed under src/migrations/ are already out of date
-- with respect to the live databases, so a new migration would run on the next deploy and overwrite
-- whatever the environment actually has — blind, and in the wrong direction. Procedures and functions in
-- this project are applied per environment by hand, from the body read out of that environment.
--
-- Baseline: the LIVE body of `prdb`.`validate_sections_mapped_batch` on TEST, read 2026-09-02. If the
-- environment you are about to apply this to is not that one, diff its own SHOW CREATE PROCEDURE against
-- this file first — do not assume the bodies match.
--
-- TWO changes, both marked ▼ below. Everything else is byte-for-byte the live body.
--
--   1. The temp table dropped its PRIMARY KEY (display_name).
--      A repeated section name in p_sections_json made the second INSERT fail with a duplicate key, which
--      aborted the whole procedure. The caller (`ResultsValidationModuleRepository.validateResultById`)
--      cannot produce a duplicate today, so this is latent — but the failure mode was disproportionate:
--      the API turned it into "Result not found" and the sections rail went blank. Ordering is preserved
--      by `execution_order`, which is what the final SELECT sorts on; the key was never needed for that.
--
--   2. The early-exit branch now returns the column as `validation`, not `is_valid`.
--      Every other exit of this procedure returns `section_name, validation`. That one branch broke the
--      contract on the column NAME, so the API mapped `item.validation` to `undefined` and the client got
--      a green check with no value in it — and on the legacy rail (`panel-menu.pipe.ts`) a `section_name`
--      of 'No data available' matches no route path, which threw inside a pipe and froze the rail on its
--      initial all-gray render. Renaming the column does not change WHEN this branch fires, only that its
--      answer is readable: a hard FALSE.
--
-- Both changes are read-path only. No table is written by this procedure.
-- =====================================================================================================

DROP PROCEDURE IF EXISTS `validate_sections_mapped_batch`;

DELIMITER $$

CREATE PROCEDURE `validate_sections_mapped_batch`(
  IN p_result_id BIGINT,
  IN p_sections_json JSON
)
BEGIN
  DECLARE v_portfolio_code VARCHAR(25);
  DECLARE v_json_length INT;
  DECLARE v_counter INT DEFAULT 0;
  DECLARE v_display_name VARCHAR(255);
  DECLARE v_function_name VARCHAR(255);
  DECLARE v_full_function VARCHAR(500);
  DECLARE v_function_exists INT DEFAULT 0;
  DECLARE v_continue_processing BOOLEAN DEFAULT TRUE;
  DECLARE v_validation_result TINYINT DEFAULT 0;

  -- Obtener datos críticos
  SELECT
    cp.acronym
    INTO
    v_portfolio_code
  FROM `result` r
    INNER JOIN version v ON v.id = r.version_id
    INNER JOIN clarisa_portfolios cp ON cp.id = v.portfolio_id
  WHERE r.id = p_result_id
    AND r.is_active = TRUE;

  SET v_json_length = JSON_LENGTH(p_sections_json);

  -- Validación inicial
  IF v_json_length = 0 OR v_portfolio_code IS NULL THEN
    -- ▼ P2-3552 (2): was `FALSE as is_valid`. Every other exit returns the column as `validation`;
    -- this one broke the contract on the column name, so the API read `undefined` instead of a FALSE.
    SELECT 'No data available' as section_name, FALSE as validation;
    SET v_continue_processing = FALSE;
  END IF;

  -- Solo procesar si la validación inicial pasó
  IF v_continue_processing THEN
    -- Tabla temporal para resultados
    DROP TEMPORARY TABLE IF EXISTS temp_validation_results;
    -- ▼ P2-3552 (1): the PRIMARY KEY (display_name) is gone. A repeated section name in the incoming JSON
    -- made the second INSERT fail on a duplicate key and aborted the entire procedure. `execution_order`
    -- is what the final SELECT orders by, so nothing depended on the key.
    CREATE TEMPORARY TABLE temp_validation_results (
      display_name VARCHAR(255),
      validation BOOLEAN,
      execution_order INT
    ) ENGINE = MEMORY;

    -- Procesar cada sección
    WHILE v_counter < v_json_length DO
      SET v_display_name = JSON_UNQUOTE(JSON_EXTRACT(p_sections_json, CONCAT('$[', v_counter, ']')));
      SET v_function_name = NULL; -- Reset para cada iteración

      -- Buscar mapeo de función
      SELECT
        vm.function_name
        INTO
        v_function_name
      FROM validation_maps vm
      WHERE vm.display_name = v_display_name
        AND vm.is_active = TRUE;

      IF v_function_name IS NOT NULL THEN
        -- Construir nombre completo de función
        SET v_full_function = CONCAT('validation_', v_function_name, '_', v_portfolio_code);

        -- Verificar si la función existe
        SELECT COUNT(*) INTO v_function_exists
        FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = DATABASE()
          AND ROUTINE_NAME = v_full_function
          AND ROUTINE_TYPE = 'FUNCTION';

        IF v_function_exists > 0 THEN
          -- Ejecutar función existente usando SQL dinámico CORREGIDO
          SET @validation_sql = CONCAT(
            'SELECT ', v_full_function, '(', p_result_id, ') INTO @validation_result'
          );
          PREPARE validation_stmt FROM @validation_sql;
          EXECUTE validation_stmt;
          DEALLOCATE PREPARE validation_stmt;

          -- Insertar el resultado obtenido
          INSERT INTO temp_validation_results VALUES (v_display_name, @validation_result, v_counter);
        ELSE
          -- Función no existe, insertar FALSE
          INSERT INTO temp_validation_results VALUES (v_display_name, FALSE, v_counter);
        END IF;
      ELSE
        -- Mapeo no encontrado, insertar FALSE
        INSERT INTO temp_validation_results VALUES (v_display_name, FALSE, v_counter);
      END IF;

      SET v_counter = v_counter + 1;
    END WHILE;

    -- Retornar resultados ordenados
    SELECT display_name as section_name, validation
    FROM temp_validation_results
    ORDER BY execution_order;

    -- Cleanup
    DROP TEMPORARY TABLE IF EXISTS temp_validation_results;
  END IF;
END$$

DELIMITER ;

-- =====================================================================================================
-- After applying, the two checks worth running in the same session:
--
--   -- 1. A normal P25 result still answers one row per section, with `validation` as the column name.
--   CALL validate_sections_mapped_batch(<result_id>, '["general-information","contributor-partners","geographic-location","evidences"]');
--
--   -- 2. A duplicated section name no longer aborts the procedure (this used to fail on a duplicate key).
--   CALL validate_sections_mapped_batch(<result_id>, '["general-information","general-information"]');
--
-- And the inventory that is still UNMEASURED and does not belong to this file — a missing function is
-- reported as a silent FALSE, i.e. a section nobody can ever complete:
--
--   SELECT ROUTINE_NAME FROM information_schema.ROUTINES
--   WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION'
--     AND ROUTINE_NAME LIKE 'validation_%' ORDER BY ROUTINE_NAME;
--
--   SELECT display_name, function_name, is_active FROM validation_maps ORDER BY display_name;
--
-- Cross the two: every active `display_name` must have a `validation_<function_name>_<portfolio>` that
-- exists for each portfolio in use. `validation_innovation_dev_P25` was confirmed present on TEST on
-- 2026-09-02; the rest of the matrix has not been checked.
-- =====================================================================================================
