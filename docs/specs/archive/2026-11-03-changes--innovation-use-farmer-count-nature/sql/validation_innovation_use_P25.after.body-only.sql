-- IFC-T-5 body-only: inner statements only; no BEGIN/END/DROP/DELIMITER. For DBeaver's Function
-- Editor GUI (it wraps the body itself; a pasted BEGIN/END gives SQL Error 1064). For a SQL Editor
-- tab use validation_innovation_use_P25.after.sql with Alt+X. Starts at the first DECLARE.
      DECLARE general_validation BOOLEAN DEFAULT TRUE;
    DECLARE has_innovation_link BOOLEAN DEFAULT TRUE;
    DECLARE has_scaling_studies BOOLEAN DEFAULT TRUE;
    DECLARE scaling_study_url BOOLEAN DEFAULT TRUE;
    DECLARE innov_use_to_be_determined BOOLEAN DEFAULT TRUE;
    DECLARE innov_use_to_be_determined_2030 BOOLEAN DEFAULT TRUE;
    DECLARE innovation_use_level_id BIGINT DEFAULT NULL;
    DECLARE readiness_level BIGINT DEFAULT NULL;
    DECLARE readiness_level_explanation BOOLEAN DEFAULT NULL;
    DECLARE has_any_data BOOLEAN DEFAULT FALSE;

    -- P2-3494 (NEW) ----------------------------------------------------------
    DECLARE result_phase_year INT DEFAULT NULL;
    -- IFC-R-6 (NEW): the origin of THIS result (r.source = 'API' means bilateral / W3).
    DECLARE result_source VARCHAR(255) DEFAULT NULL;

    -- P2-3494 (NEW): the reporting phase of THIS result. Same lookup already live
    -- in validation_innovation_dev_P25 (added by P2-3465 / P2-3467). Kept as its
    -- own SELECT so the pre-existing query below is left byte-for-byte unchanged.
    SELECT v.phase_year
        INTO result_phase_year
    FROM `result` r
        INNER JOIN version v ON v.id = r.version_id
    WHERE r.id = resultId
        AND r.is_active = TRUE;
    -- ------------------------------------------------------------------------

    -- IFC-R-6 (NEW): read the origin next to the phase year, in its own SELECT so the
    -- P2-3494 query above stays byte-for-byte. NULL source is treated as W1/W2 below
    -- (COALESCE(result_source, '') <> 'API'), same as the application's source_name rule.
    SELECT r.`source`
        INTO result_source
    FROM `result` r
    WHERE r.id = resultId
        AND r.is_active = TRUE;
    -- ------------------------------------------------------------------------

    SELECT
        riu.has_innovation_link,
        riu.innovation_use_level_id,
        riu.has_scaling_studies,
        SUM(valid_text(rssu.id)) > 0,
        valid_text(riu.readiness_level_explanation),
        riu.innov_use_to_be_determined,
        riu.innov_use_2030_to_be_determined
        INTO
        has_innovation_link,
        innovation_use_level_id,
        has_scaling_studies,
        scaling_study_url,
        readiness_level_explanation,
        innov_use_to_be_determined,
        innov_use_to_be_determined_2030
    FROM results_innovations_use riu
        LEFT JOIN result_scaling_study_urls rssu ON rssu.result_innov_use_id = riu.result_innovation_use_id
                                                AND rssu.is_active = TRUE
    WHERE riu.is_active = TRUE
        AND riu.results_id = resultId
    GROUP BY riu.result_innovation_use_id;

--     IF (has_innovation_link IS NULL OR innovation_use_level_id IS NULL) THEN RETURN FALSE; END IF;

    SELECT
        ciul.`level`
        INTO
        readiness_level
    FROM clarisa_innovation_use_levels ciul
    WHERE ciul.id = innovation_use_level_id;

/*      IF (has_innovation_link = TRUE) THEN

        SELECT
            COUNT(*) > 0
            INTO
            general_validation
        FROM linked_result lr
        WHERE lr.origin_result_id = resultId
            AND lr.is_active = TRUE;

        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

    END IF;*/

    IF readiness_level >= 6 THEN

        -- Unchanged: the explanation textarea is visible for use levels 5-9, so
        -- this is always satisfiable by the reporter.
        IF readiness_level_explanation = 0 THEN
            RETURN FALSE;
        END IF;

        -- P2-3494 (GATED): phases <= 2025 keep the previous rule. From 2026 the
        -- question and its URL list are gone from the form, so a stored TRUE must
        -- not be able to hold the section red forever.
        IF (COALESCE(result_phase_year, 0) < 2026) THEN

            IF has_scaling_studies = 1 AND scaling_study_url = 0 THEN
                RETURN FALSE;
            END IF;

        END IF;

    END IF;

    IF ( innov_use_to_be_determined IS NULL
     OR innov_use_to_be_determined = 0 ) THEN

        SELECT
            (
                EXISTS (
                    SELECT 1
                    FROM result_actors ra
                    WHERE ra.result_id = resultId
                      AND ra.is_active = TRUE
                      AND ra.section_id = 1
                )
                OR
                EXISTS (
                    SELECT 1
                    FROM results_by_institution_type rbit
                    WHERE rbit.results_id = resultId
                      AND rbit.is_active = TRUE
                      AND rbit.institution_roles_id = 5
                      AND rbit.section_id = 1
                )
                OR
                EXISTS (
                    SELECT 1
                    FROM result_ip_measure rim
                    WHERE rim.result_id = resultId
                      AND rim.is_active = TRUE
                      AND rim.section_id = 1
                )
            )
        INTO has_any_data;

        IF (NOT has_any_data) THEN
            RETURN FALSE;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM result_actors ra
            WHERE ra.result_id = resultId
              AND ra.is_active = TRUE
              AND ra.section_id = 1
        ) THEN
        SELECT
            COUNT(*) > 0
            AND
            SUM(
                CASE
                    WHEN
                        (
                            (
                                ra.sex_and_age_disaggregation = 0 AND
                                (
                                    (
                                        ra.actor_type_id != 5 AND
                                        ra.women IS NOT NULL AND
                                        ra.men IS NOT NULL
                                    )
                                    OR
                                    (
                                        ra.actor_type_id = 5 AND
                                        valid_text(ra.other_actor_type)
                                    )
                                )
                            )
                            OR
                            (
                                ra.sex_and_age_disaggregation = 1 AND
                                (
                                    ra.how_many IS NOT NULL
                                    OR
                                    (
                                        ra.actor_type_id = 5 AND
                                        valid_text(ra.other_actor_type)
                                    )
                                )
                            )
                        )
                    THEN 0
                    ELSE 1
                END
            ) = 0
            INTO
            general_validation
        FROM result_actors ra
        WHERE ra.result_id = resultId
          AND ra.is_active = TRUE
          AND ra.section_id = 1;

        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        -- IFC-R-6 (NEW): from phase 2026, W1/W2 only (not bilateral), every active Farmers
        -- row (actor_type_id = 1) of this block needs a unit and a nature. NULL is caught
        -- explicitly: "col NOT IN (...)" alone is NULL, not TRUE, when col is NULL.
        IF (COALESCE(result_phase_year, 0) >= 2026 AND COALESCE(result_source, '') <> 'API') THEN
            IF EXISTS (
                SELECT 1
                FROM result_actors ra
                WHERE ra.result_id = resultId
                  AND ra.is_active = TRUE
                  AND ra.section_id = 1
                  AND ra.actor_type_id = 1
                  AND (
                        ra.count_unit IS NULL
                        OR ra.count_unit NOT IN ('households', 'individuals')
                        OR ra.use_nature IS NULL
                        OR ra.use_nature NOT IN ('information_received', 'innovation_applied')
                  )
            ) THEN
                RETURN FALSE;
            END IF;
        END IF;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM results_by_institution_type rbit
            WHERE rbit.results_id = resultId
              AND rbit.is_active = TRUE
              AND rbit.institution_roles_id = 5
              AND rbit.section_id = 1
        ) THEN
        SELECT
            COUNT(*) > 0
            AND
            SUM(
                CASE
                    WHEN
                        (
                            (
                                rbit.institution_types_id != 78
                                AND rbit.institution_roles_id IS NOT NULL
                                AND rbit.institution_types_id IS NOT NULL
                            )
                            OR
                            (
                                rbit.institution_types_id = 78
                                AND rbit.institution_roles_id IS NOT NULL
                                AND rbit.institution_types_id IS NOT NULL
                                AND valid_text(rbit.other_institution)
                            )
                        )
                    THEN 0
                    ELSE 1
                END
            ) = 0
            INTO
            general_validation
        FROM results_by_institution_type rbit
        WHERE rbit.results_id = resultId
          AND rbit.is_active = TRUE
          AND rbit.institution_roles_id = 5
          AND rbit.section_id = 1;

        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM result_ip_measure rim
            WHERE rim.result_id = resultId
              AND rim.is_active = TRUE
              AND rim.section_id = 1
        ) THEN
        SELECT
            COUNT(*) > 0
            AND
            SUM(
                CASE
                    WHEN
                        rim.unit_of_measure IS NOT NULL
                        AND rim.quantity IS NOT NULL
                    THEN 0
                    ELSE 1
                END
            ) = 0
            INTO
            general_validation
        FROM result_ip_measure rim
        WHERE rim.result_id = resultId
          AND rim.is_active = TRUE
          AND rim.section_id = 1;

        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        END IF;

    END IF;

    IF ( innov_use_to_be_determined_2030 IS NULL
    OR innov_use_to_be_determined_2030 = 0) THEN

        SELECT
            (
                EXISTS (
                    SELECT 1
                    FROM result_actors ra
                    WHERE ra.result_id = resultId
                      AND ra.is_active = TRUE
                      AND ra.section_id = 2
                )
                OR
                EXISTS (
                    SELECT 1
                    FROM results_by_institution_type rbit
                    WHERE rbit.results_id = resultId
                      AND rbit.is_active = TRUE
                      AND rbit.institution_roles_id = 5
                      AND rbit.section_id = 2
                )
                OR
                EXISTS (
                    SELECT 1
                    FROM result_ip_measure rim
                    WHERE rim.result_id = resultId
                      AND rim.is_active = TRUE
                      AND rim.section_id = 2
                )
            )
        INTO has_any_data;

        IF (NOT has_any_data) THEN
            RETURN FALSE;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM result_actors ra
            WHERE ra.result_id = resultId
              AND ra.is_active = TRUE
              AND ra.section_id = 2
        ) THEN
        SELECT
            COUNT(*) > 0
            AND
            SUM(
                CASE
                    WHEN
                        (
                            (
                                ra.sex_and_age_disaggregation = 0 AND
                                (
                                    (
                                        ra.actor_type_id != 5 AND
                                        ra.women IS NOT NULL AND
                                        ra.men IS NOT NULL
                                    )
                                    OR
                                    (
                                        ra.actor_type_id = 5 AND
                                        valid_text(ra.other_actor_type)
                                    )
                                )
                            )
                            OR
                            (
                                ra.sex_and_age_disaggregation = 1 AND
                                (
                                    ra.how_many IS NOT NULL
                                    OR
                                    (
                                        ra.actor_type_id = 5 AND
                                        valid_text(ra.other_actor_type)
                                    )
                                )
                            )
                        )
                    THEN 0
                    ELSE 1
                END
            ) = 0
            INTO
            general_validation
        FROM result_actors ra
        WHERE ra.result_id = resultId
          AND ra.is_active = TRUE
          AND ra.section_id = 2;

        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        -- IFC-R-6 (NEW): from phase 2026, W1/W2 only (not bilateral), every active Farmers
        -- row (actor_type_id = 1) of this block needs a unit and a nature. NULL is caught
        -- explicitly: "col NOT IN (...)" alone is NULL, not TRUE, when col is NULL.
        IF (COALESCE(result_phase_year, 0) >= 2026 AND COALESCE(result_source, '') <> 'API') THEN
            IF EXISTS (
                SELECT 1
                FROM result_actors ra
                WHERE ra.result_id = resultId
                  AND ra.is_active = TRUE
                  AND ra.section_id = 2
                  AND ra.actor_type_id = 1
                  AND (
                        ra.count_unit IS NULL
                        OR ra.count_unit NOT IN ('households', 'individuals')
                        OR ra.use_nature IS NULL
                        OR ra.use_nature NOT IN ('information_received', 'innovation_applied')
                  )
            ) THEN
                RETURN FALSE;
            END IF;
        END IF;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM results_by_institution_type rbit
            WHERE rbit.results_id = resultId
              AND rbit.is_active = TRUE
              AND rbit.institution_roles_id = 5
              AND rbit.section_id = 2
        ) THEN
        SELECT
            COUNT(*) > 0
            AND
            SUM(
                CASE
                    WHEN
                        (
                            (
                                rbit.institution_types_id != 78
                                AND rbit.institution_roles_id IS NOT NULL
                                AND rbit.institution_types_id IS NOT NULL
                            )
                            OR
                            (
                                rbit.institution_types_id = 78
                                AND rbit.institution_roles_id IS NOT NULL
                                AND rbit.institution_types_id IS NOT NULL
                                AND valid_text(rbit.other_institution)
                            )
                        )
                    THEN 0
                    ELSE 1
                END
            ) = 0
            INTO
            general_validation
        FROM results_by_institution_type rbit
        WHERE rbit.results_id = resultId
          AND rbit.is_active = TRUE
          AND rbit.institution_roles_id = 5
          AND rbit.section_id = 2;

        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        END IF;

        IF EXISTS (
            SELECT 1
            FROM result_ip_measure rim
            WHERE rim.result_id = resultId
              AND rim.is_active = TRUE
              AND rim.section_id = 2
        ) THEN
        SELECT
            COUNT(*) > 0
            AND
            SUM(
                CASE
                    WHEN
                        rim.unit_of_measure IS NOT NULL
                        AND rim.quantity IS NOT NULL
                    THEN 0
                    ELSE 1
                END
            ) = 0
            INTO
            general_validation
        FROM result_ip_measure rim
        WHERE rim.result_id = resultId
          AND rim.is_active = TRUE
          AND rim.section_id = 2;

        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        END IF;

    END IF;

    SELECT
        COUNT(*) = COALESCE(SUM(IF(
            rib.is_determined IS NULL OR rib.is_determined = 0,
            rib.kind_cash IS NOT NULL,
            TRUE
        )), FALSE)
        INTO
        general_validation
    FROM results_by_inititiative rbi
        LEFT JOIN result_initiative_budget rib ON rib.result_initiative_id = rbi.id
                                                AND rib.is_active = TRUE
    WHERE rbi.result_id = resultId
        AND rbi.is_active = TRUE
        AND rib.is_active = TRUE;

    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

    SELECT
        COUNT(*) = COALESCE(SUM(IF(
          nppb.is_determined IS NULL OR nppb.is_determined = 0,
          nppb.kind_cash IS NOT NULL,
          TRUE
        )), FALSE)
        INTO
        general_validation
    FROM results_by_projects rbp
        LEFT JOIN non_pooled_projetct_budget nppb ON nppb.result_project_id  = rbp.id
    WHERE rbp.result_id = resultId
        AND rbp.is_active = TRUE
        AND nppb.is_active = TRUE;

    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

    SELECT
        COUNT(*) = COALESCE(SUM(IF(
                    ribu.is_determined IS NULL OR ribu.is_determined = 0,
                    ribu.kind_cash IS NOT NULL,
                    TRUE
                    )), FALSE)
        INTO
        general_validation
    FROM
        results_by_institution rbi
    LEFT JOIN result_institutions_budget ribu
        ON ribu.result_institution_id = rbi.id
        AND ribu.is_active = TRUE
    WHERE rbi.result_id = resultId
        AND rbi.is_active = TRUE
        AND ribu.is_active = TRUE;

    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

    RETURN TRUE;
