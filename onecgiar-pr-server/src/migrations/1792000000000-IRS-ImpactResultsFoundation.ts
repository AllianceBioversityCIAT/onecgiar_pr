import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3901 / IRS-T-2 — Impact Results Reporting, server foundation (spec
 * docs/specs/results/impact-results-reporting/server-foundation).
 *
 * up:
 *   - 3 tables: `impact_study_type` (seeded 1 Learning study, 2 Accountability study, IRS-R-3),
 *     `results_impact_level` (1:1 with result) and `results_impact_previous_result` (IRS-R-4/5).
 *   - ensures `result_by_level (1, 9)` and `result_type 9` active (no-ops when present, IRS-P-1/P-2).
 *   - `validation_maps` row `impact-level-info` -> `impact_level_info` and the new function
 *     `validation_impact_level_info_P25` (IRS-R-6).
 *   - `validation_contributor_partner_P25` (IRS-DD-5 / IRS-R-8) and `validation_geo_location_P25`
 *     (IRS-DD-6 / IRS-R-9) are re-created from the LIVE bodies captured in execution.md Appendices A/B
 *     (IRS-T-1) plus the type-9 gates only; every non-impact branch returns what it returns today.
 *
 * down: restores the two live bodies verbatim, drops the new function, the map row and the 3 tables.
 * It does not undo the (1, 9) / type 9 ensure: those rows pre-existed in the seed.
 *
 * Idempotent: CREATE TABLE IF NOT EXISTS, guarded INSERTs, DROP FUNCTION IF EXISTS + CREATE.
 */

// Live body, execution.md Appendix A (DEFINER removed). Restored by `down`.
const CONTRIBUTOR_PARTNER_LIVE = `CREATE FUNCTION \`validation_contributor_partner_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    
       DECLARE general_validation BOOLEAN DEFAULT TRUE;
      DECLARE lead_by_partner BOOLEAN DEFAULT NULL;
      DECLARE has_innovation_link BOOLEAN DEFAULT NULL;
      DECLARE no_applicable_partner BOOLEAN DEFAULT NULL;
      DECLARE planned_result BOOLEAN DEFAULT NULL;
      DECLARE result_id BIGINT DEFAULT NULL;
      DECLARE result_type_id BIGINT DEFAULT NULL;
      DECLARE count_institutions BIGINT DEFAULT 0;
      DECLARE institutions_ids TEXT DEFAULT NULL;
      DECLARE institutions_count_leading BIGINT DEFAULT 0;

      SELECT
        rtr.planned_result,
        valid_text(rtr.toc_progressive_narrative)
        INTO
        planned_result,
        general_validation
    FROM results_toc_result rtr
    WHERE rtr.is_active = TRUE
        AND rtr.results_id = resultId
    LIMIT 1;

      IF planned_result = FALSE THEN

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      ELSE

    SELECT
      COUNT(temp.valid) = SUM(temp.valid)
    INTO
      general_validation
    FROM
    (
      SELECT
        CAST(
          (
            (
              rtr.toc_progressive_narrative IS NULL
              OR TRIM(rtr.toc_progressive_narrative) = ''
              OR valid_text(rtr.toc_progressive_narrative)
            )
            AND rtr.toc_result_id IS NOT NULL
            AND COUNT(rtri.result_toc_result_indicator_id) > 0
            AND COALESCE(MAX(rit.contributing_indicator > 0), 0) = 1
          ) AS UNSIGNED
        ) AS valid
      FROM results_toc_result rtr
        LEFT JOIN results_toc_result_indicators rtri
          ON rtri.results_toc_results_id = rtr.result_toc_result_id
         AND rtri.is_active = TRUE
         AND rtri.is_not_aplicable = FALSE
        LEFT JOIN result_indicators_targets rit
          ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
         AND rit.is_active = TRUE
        LEFT JOIN \`result\` r ON r.id = rtr.results_id
      WHERE rtr.results_id = resultId
        AND rtr.is_active = TRUE
        AND r.is_active = TRUE
      GROUP BY rtr.result_toc_result_id
    ) temp;


          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      SELECT
          r.is_lead_by_partner,
          r.no_applicable_partner,
          r.id,
          r.result_type_id
          INTO
          lead_by_partner,
          no_applicable_partner,
          result_id,
          result_type_id
      FROM \`result\` r
      WHERE r.is_active = TRUE
          AND r.id = resultId;

      IF (result_id IS NULL) THEN RETURN FALSE; END IF;
      IF (no_applicable_partner IS NULL) THEN RETURN FALSE; END IF;

      SELECT
         COUNT(rbi.id),
         GROUP_CONCAT(rbi.id)
         INTO
         count_institutions,
         institutions_ids
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
         AND rbi.institution_roles_id = IF(result_type_id = 6, 8, 2)
         AND rbi.is_active = TRUE;

      SELECT
        COUNT(rbi.id)
        INTO
        institutions_count_leading
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
        AND rbi.is_leading_result = TRUE
        AND rbi.is_active = TRUE;

      SELECT
          rid.has_innovation_link IS NOT NULL AND
          rid.has_innovation_link = TRUE
        INTO
        has_innovation_link
      FROM results_innovations_dev rid
      WHERE rid.results_id = resultId
          AND rid.is_active = TRUE;

      SELECT
          riu.has_innovation_link IS NOT NULL AND
          riu.has_innovation_link = TRUE OR has_innovation_link
        INTO
        has_innovation_link
      FROM results_innovations_use riu
      WHERE riu.results_id = resultId
          AND riu.is_active = TRUE;

      IF (has_innovation_link = TRUE) THEN

          SELECT
              COUNT(*) > 0
              INTO
              general_validation
          FROM linked_result lr
          WHERE lr.origin_result_id = resultId
              AND lr.is_active = TRUE;

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      RETURN CASE
          WHEN no_applicable_partner = TRUE THEN TRUE
          WHEN lead_by_partner IS NULL THEN FALSE
          WHEN no_applicable_partner = FALSE AND count_institutions = 0 THEN FALSE
          WHEN (count_institutions > 0 AND count_institutions <> (
               SELECT COUNT(DISTINCT rbibdt.result_by_institution_id)
               FROM result_by_institutions_by_deliveries_type rbibdt
               WHERE rbibdt.is_active = TRUE
                   AND FIND_IN_SET(rbibdt.result_by_institution_id, institutions_ids)
           )) THEN FALSE
           WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE
           ELSE TRUE
           END;

END`;

// Live body + IRS-DD-5 gates (ToC block wrapped for type 9, innovation-link check skipped for type 9).
const CONTRIBUTOR_PARTNER_WITH_IMPACT = `CREATE FUNCTION \`validation_contributor_partner_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    
       DECLARE general_validation BOOLEAN DEFAULT TRUE;
      DECLARE lead_by_partner BOOLEAN DEFAULT NULL;
      DECLARE has_innovation_link BOOLEAN DEFAULT NULL;
      DECLARE no_applicable_partner BOOLEAN DEFAULT NULL;
      DECLARE planned_result BOOLEAN DEFAULT NULL;
      DECLARE result_id BIGINT DEFAULT NULL;
      DECLARE result_type_id BIGINT DEFAULT NULL;
      DECLARE count_institutions BIGINT DEFAULT 0;
      DECLARE institutions_ids TEXT DEFAULT NULL;
      DECLARE institutions_count_leading BIGINT DEFAULT 0;

      -- IRS-DD-5: load the result type BEFORE the ToC block so type 9 can bypass it.
      SELECT r.result_type_id INTO result_type_id FROM \`result\` r WHERE r.id = resultId AND r.is_active = TRUE;

      IF COALESCE(result_type_id, 0) <> 9 THEN

      SELECT
        rtr.planned_result,
        valid_text(rtr.toc_progressive_narrative)
        INTO
        planned_result,
        general_validation
    FROM results_toc_result rtr
    WHERE rtr.is_active = TRUE
        AND rtr.results_id = resultId
    LIMIT 1;

      IF planned_result = FALSE THEN

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      ELSE

    SELECT
      COUNT(temp.valid) = SUM(temp.valid)
    INTO
      general_validation
    FROM
    (
      SELECT
        CAST(
          (
            (
              rtr.toc_progressive_narrative IS NULL
              OR TRIM(rtr.toc_progressive_narrative) = ''
              OR valid_text(rtr.toc_progressive_narrative)
            )
            AND rtr.toc_result_id IS NOT NULL
            AND COUNT(rtri.result_toc_result_indicator_id) > 0
            AND COALESCE(MAX(rit.contributing_indicator > 0), 0) = 1
          ) AS UNSIGNED
        ) AS valid
      FROM results_toc_result rtr
        LEFT JOIN results_toc_result_indicators rtri
          ON rtri.results_toc_results_id = rtr.result_toc_result_id
         AND rtri.is_active = TRUE
         AND rtri.is_not_aplicable = FALSE
        LEFT JOIN result_indicators_targets rit
          ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
         AND rit.is_active = TRUE
        LEFT JOIN \`result\` r ON r.id = rtr.results_id
      WHERE rtr.results_id = resultId
        AND rtr.is_active = TRUE
        AND r.is_active = TRUE
      GROUP BY rtr.result_toc_result_id
    ) temp;


          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      END IF;

      SELECT
          r.is_lead_by_partner,
          r.no_applicable_partner,
          r.id,
          r.result_type_id
          INTO
          lead_by_partner,
          no_applicable_partner,
          result_id,
          result_type_id
      FROM \`result\` r
      WHERE r.is_active = TRUE
          AND r.id = resultId;

      IF (result_id IS NULL) THEN RETURN FALSE; END IF;
      IF (no_applicable_partner IS NULL) THEN RETURN FALSE; END IF;

      SELECT
         COUNT(rbi.id),
         GROUP_CONCAT(rbi.id)
         INTO
         count_institutions,
         institutions_ids
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
         AND rbi.institution_roles_id = IF(result_type_id = 6, 8, 2)
         AND rbi.is_active = TRUE;

      SELECT
        COUNT(rbi.id)
        INTO
        institutions_count_leading
    FROM results_by_institution rbi
    WHERE rbi.result_id = resultId
        AND rbi.is_leading_result = TRUE
        AND rbi.is_active = TRUE;

      SELECT
          rid.has_innovation_link IS NOT NULL AND
          rid.has_innovation_link = TRUE
        INTO
        has_innovation_link
      FROM results_innovations_dev rid
      WHERE rid.results_id = resultId
          AND rid.is_active = TRUE;

      SELECT
          riu.has_innovation_link IS NOT NULL AND
          riu.has_innovation_link = TRUE OR has_innovation_link
        INTO
        has_innovation_link
      FROM results_innovations_use riu
      WHERE riu.results_id = resultId
          AND riu.is_active = TRUE;

      IF (has_innovation_link = TRUE AND COALESCE(result_type_id, 0) <> 9) THEN

          SELECT
              COUNT(*) > 0
              INTO
              general_validation
          FROM linked_result lr
          WHERE lr.origin_result_id = resultId
              AND lr.is_active = TRUE;

          IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

      END IF;

      RETURN CASE
          WHEN no_applicable_partner = TRUE THEN TRUE
          WHEN lead_by_partner IS NULL THEN FALSE
          WHEN no_applicable_partner = FALSE AND count_institutions = 0 THEN FALSE
          WHEN (count_institutions > 0 AND count_institutions <> (
               SELECT COUNT(DISTINCT rbibdt.result_by_institution_id)
               FROM result_by_institutions_by_deliveries_type rbibdt
               WHERE rbibdt.is_active = TRUE
                   AND FIND_IN_SET(rbibdt.result_by_institution_id, institutions_ids)
           )) THEN FALSE
           WHEN institutions_count_leading <> 1 AND lead_by_partner = 1 THEN FALSE
           ELSE TRUE
           END;

END`;

// Live body, execution.md Appendix B (DEFINER removed). Restored by `down`.
const GEO_LOCATION_LIVE = `CREATE FUNCTION \`validation_geo_location_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    
DECLARE general_validation BOOLEAN DEFAULT TRUE;
      DECLARE geo_scope BIGINT DEFAULT NULL;
      DECLARE has_countries BOOLEAN DEFAULT NULL;
      DECLARE has_regions BOOLEAN DEFAULT NULL;
      DECLARE has_extra_countries BOOLEAN DEFAULT NULL;
      DECLARE has_extra_regions BOOLEAN DEFAULT NULL;
      DECLARE has_extra_geo_scope BOOLEAN DEFAULT NULL;
      DECLARE result_type BIGINT DEFAULT NULL;
      
      SELECT 
          r.geographic_scope_id,
          r.has_countries,
          r.has_regions,
          r.result_type_id,
          r.has_extra_geo_scope,
          r.has_extra_countries,
          r.has_extra_regions 
          INTO
          geo_scope,
          has_countries,
          has_regions,
          result_type,
          has_extra_geo_scope,
          has_extra_countries,
          has_extra_regions
      FROM \`result\` r 
      WHERE r.id = resultId
          AND r.is_active = TRUE;
      
      IF (geo_scope IS NULL) THEN 
      
          RETURN FALSE; 
          
      ELSEIF(geo_scope = 50) THEN
      
          RETURN TRUE;
      
      END IF;  
      
      
      
      -- SCOPE 1,2
      
    IF ( geo_scope IN (1, 2) ) THEN 
    
        IF ( has_regions = TRUE OR geo_scope = 2 ) THEN 
        
            SELECT
                COUNT(rr.result_region_id) > 0
                INTO
                general_validation
            FROM result_region rr
            WHERE rr.result_id = resultId
                AND rr.is_active = TRUE
                AND rr.geo_scope_role_id = 1;
            
            IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        ELSEIF ( has_regions IS NULL ) THEN
        
            RETURN FALSE;
        
        END IF;
        
        IF (  has_countries = TRUE ) THEN 
        
            SELECT
                COUNT(rc.result_country_id) > 0
                INTO
                general_validation
            FROM result_country rc
            WHERE rc.result_id = resultId
                AND rc.is_active = TRUE
                AND rc.geo_scope_role_id = 1;
            
            IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        ELSEIF ( has_countries IS NULL ) THEN
        
            RETURN FALSE;
        
        END IF;

    
    END IF;
    
    -- SCOPE 3,4
    
    IF ( geo_scope IN (3, 4) ) THEN
    
        SELECT
            COUNT(rc.result_country_id) > 0
            INTO
            general_validation
        FROM result_country rc
        WHERE rc.result_id = resultId
            AND rc.is_active = TRUE
            AND rc.geo_scope_role_id = 1;
            
        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
    
    END IF;
    
    -- SCOPE 5
    
    IF ( geo_scope = 5 ) THEN
    
        SELECT 
            IF(COUNT(*) - COALESCE(SUM(temp.sub_counter),0) = 0, TRUE, FALSE)
            INTO
            general_validation
        FROM (SELECT IF((SELECT COUNT(css.code)
                            FROM clarisa_subnational_scopes css
                            WHERE css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, COUNT(rcs.result_country_subnational_id) > 0, TRUE) AS sub_counter
                FROM result_country rc
                LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
                LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc.result_country_id
                                                        AND rcs.is_active = TRUE
                                                        AND rcs.geo_scope_role_id = 1
        WHERE rc.result_id = resultId
            AND rc.is_active = TRUE
            AND rc.geo_scope_role_id = 1
        GROUP by  rc.country_id, cc.name) temp;
        
        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
    
    END IF;
    
    IF ( result_type IN (2, 7) AND geo_scope NOT IN (1, 50) ) THEN
    
        IF ( has_extra_geo_scope IS NULL ) THEN RETURN FALSE; END IF;
        IF ( has_extra_geo_scope = FALSE ) THEN RETURN TRUE; END IF;

        IF (has_extra_geo_scope = TRUE) THEN
        
            -- SCOPE 1,2
      
            IF ( has_extra_geo_scope IN (1, 2) ) THEN 
            
                IF ( has_extra_regions = TRUE OR has_extra_geo_scope = 2 ) THEN 
                
                    SELECT
                        COUNT(rr.result_region_id) > 0
                        INTO
                        general_validation
                    FROM result_region rr
                    WHERE rr.result_id = resultId
                        AND rr.is_active = TRUE
                        AND rr.geo_scope_role_id = 2;
                    
                    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        
                ELSEIF ( has_extra_regions IS NULL ) THEN
                
                    RETURN FALSE;
                
                END IF;
                
                IF (  has_extra_countries = TRUE ) THEN 
                
                    SELECT
                        COUNT(rc.result_country_id) > 0
                        INTO
                        general_validation
                    FROM result_country rc
                    WHERE rc.result_id = resultId
                        AND rc.is_active = TRUE
                        AND rc.geo_scope_role_id = 2;
                    
                    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        
                ELSEIF ( has_extra_countries IS NULL ) THEN
                
                    RETURN FALSE;
                
                END IF;
        
            
            END IF;
            
            -- SCOPE 3,4
            
            IF ( has_extra_geo_scope IN (3, 4) ) THEN
            
                SELECT
                    COUNT(rc.result_country_id) > 0
                    INTO
                    general_validation
                FROM result_country rc
                WHERE rc.result_id = resultId
                    AND rc.is_active = TRUE
                    AND rc.geo_scope_role_id = 2;
                    
                IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
            
            END IF;
            
            -- SCOPE 5
            
            IF ( has_extra_geo_scope = 5 ) THEN
            
                SELECT 
                    IF(COUNT(*) - COALESCE(SUM(temp.sub_counter),0) = 0, TRUE, FALSE)
                    INTO
                    general_validation
                FROM (SELECT IF((SELECT COUNT(css.code)
                                    FROM clarisa_subnational_scopes css
                                    WHERE css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, COUNT(rcs.result_country_subnational_id) > 0, TRUE) AS sub_counter
                        FROM result_country rc
                        LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
                        LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc.result_country_id
                                                                AND rcs.is_active = TRUE
                                                                AND rcs.geo_scope_role_id = 2
                WHERE rc.result_id = resultId
                    AND rc.is_active = TRUE
                    AND rc.geo_scope_role_id = 2
                GROUP by  rc.country_id, cc.name) temp;
                
                IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
            
            END IF;
        
        END IF;
    
    END IF;

     RETURN TRUE;
END`;

// Live body + IRS-DD-6 gate (type 9, source <> 'API', scope not 2/3 => FALSE) before the scope-50 shortcut.
const GEO_LOCATION_WITH_IMPACT = `CREATE FUNCTION \`validation_geo_location_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    
DECLARE general_validation BOOLEAN DEFAULT TRUE;
      DECLARE geo_scope BIGINT DEFAULT NULL;
      DECLARE has_countries BOOLEAN DEFAULT NULL;
      DECLARE has_regions BOOLEAN DEFAULT NULL;
      DECLARE has_extra_countries BOOLEAN DEFAULT NULL;
      DECLARE has_extra_regions BOOLEAN DEFAULT NULL;
      DECLARE has_extra_geo_scope BOOLEAN DEFAULT NULL;
      DECLARE result_type BIGINT DEFAULT NULL;
      DECLARE result_source VARCHAR(25) DEFAULT NULL;
      
      SELECT 
          r.geographic_scope_id,
          r.has_countries,
          r.has_regions,
          r.result_type_id,
          r.has_extra_geo_scope,
          r.has_extra_countries,
          r.has_extra_regions,
          r.source
          INTO
          geo_scope,
          has_countries,
          has_regions,
          result_type,
          has_extra_geo_scope,
          has_extra_countries,
          has_extra_regions,
          result_source
      FROM \`result\` r 
      WHERE r.id = resultId
          AND r.is_active = TRUE;
      
      IF (geo_scope IS NULL) THEN 
      
          RETURN FALSE;

      -- IRS-DD-6: PRMS-created (non-API) impact results accept only Regional (2) / Country (3).
      ELSEIF (result_type = 9 AND COALESCE(result_source, '') <> 'API' AND geo_scope NOT IN (2, 3)) THEN

          RETURN FALSE;

      ELSEIF(geo_scope = 50) THEN
      
          RETURN TRUE;
      
      END IF;  
      
      
      
      -- SCOPE 1,2
      
    IF ( geo_scope IN (1, 2) ) THEN 
    
        IF ( has_regions = TRUE OR geo_scope = 2 ) THEN 
        
            SELECT
                COUNT(rr.result_region_id) > 0
                INTO
                general_validation
            FROM result_region rr
            WHERE rr.result_id = resultId
                AND rr.is_active = TRUE
                AND rr.geo_scope_role_id = 1;
            
            IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        ELSEIF ( has_regions IS NULL ) THEN
        
            RETURN FALSE;
        
        END IF;
        
        IF (  has_countries = TRUE ) THEN 
        
            SELECT
                COUNT(rc.result_country_id) > 0
                INTO
                general_validation
            FROM result_country rc
            WHERE rc.result_id = resultId
                AND rc.is_active = TRUE
                AND rc.geo_scope_role_id = 1;
            
            IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;

        ELSEIF ( has_countries IS NULL ) THEN
        
            RETURN FALSE;
        
        END IF;

    
    END IF;
    
    -- SCOPE 3,4
    
    IF ( geo_scope IN (3, 4) ) THEN
    
        SELECT
            COUNT(rc.result_country_id) > 0
            INTO
            general_validation
        FROM result_country rc
        WHERE rc.result_id = resultId
            AND rc.is_active = TRUE
            AND rc.geo_scope_role_id = 1;
            
        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
    
    END IF;
    
    -- SCOPE 5
    
    IF ( geo_scope = 5 ) THEN
    
        SELECT 
            IF(COUNT(*) - COALESCE(SUM(temp.sub_counter),0) = 0, TRUE, FALSE)
            INTO
            general_validation
        FROM (SELECT IF((SELECT COUNT(css.code)
                            FROM clarisa_subnational_scopes css
                            WHERE css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, COUNT(rcs.result_country_subnational_id) > 0, TRUE) AS sub_counter
                FROM result_country rc
                LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
                LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc.result_country_id
                                                        AND rcs.is_active = TRUE
                                                        AND rcs.geo_scope_role_id = 1
        WHERE rc.result_id = resultId
            AND rc.is_active = TRUE
            AND rc.geo_scope_role_id = 1
        GROUP by  rc.country_id, cc.name) temp;
        
        IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
    
    END IF;
    
    IF ( result_type IN (2, 7) AND geo_scope NOT IN (1, 50) ) THEN
    
        IF ( has_extra_geo_scope IS NULL ) THEN RETURN FALSE; END IF;
        IF ( has_extra_geo_scope = FALSE ) THEN RETURN TRUE; END IF;

        IF (has_extra_geo_scope = TRUE) THEN
        
            -- SCOPE 1,2
      
            IF ( has_extra_geo_scope IN (1, 2) ) THEN 
            
                IF ( has_extra_regions = TRUE OR has_extra_geo_scope = 2 ) THEN 
                
                    SELECT
                        COUNT(rr.result_region_id) > 0
                        INTO
                        general_validation
                    FROM result_region rr
                    WHERE rr.result_id = resultId
                        AND rr.is_active = TRUE
                        AND rr.geo_scope_role_id = 2;
                    
                    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        
                ELSEIF ( has_extra_regions IS NULL ) THEN
                
                    RETURN FALSE;
                
                END IF;
                
                IF (  has_extra_countries = TRUE ) THEN 
                
                    SELECT
                        COUNT(rc.result_country_id) > 0
                        INTO
                        general_validation
                    FROM result_country rc
                    WHERE rc.result_id = resultId
                        AND rc.is_active = TRUE
                        AND rc.geo_scope_role_id = 2;
                    
                    IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
        
                ELSEIF ( has_extra_countries IS NULL ) THEN
                
                    RETURN FALSE;
                
                END IF;
        
            
            END IF;
            
            -- SCOPE 3,4
            
            IF ( has_extra_geo_scope IN (3, 4) ) THEN
            
                SELECT
                    COUNT(rc.result_country_id) > 0
                    INTO
                    general_validation
                FROM result_country rc
                WHERE rc.result_id = resultId
                    AND rc.is_active = TRUE
                    AND rc.geo_scope_role_id = 2;
                    
                IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
            
            END IF;
            
            -- SCOPE 5
            
            IF ( has_extra_geo_scope = 5 ) THEN
            
                SELECT 
                    IF(COUNT(*) - COALESCE(SUM(temp.sub_counter),0) = 0, TRUE, FALSE)
                    INTO
                    general_validation
                FROM (SELECT IF((SELECT COUNT(css.code)
                                    FROM clarisa_subnational_scopes css
                                    WHERE css.country_iso_alpha_2 = cc.iso_alpha_2) > 0, COUNT(rcs.result_country_subnational_id) > 0, TRUE) AS sub_counter
                        FROM result_country rc
                        LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
                        LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc.result_country_id
                                                                AND rcs.is_active = TRUE
                                                                AND rcs.geo_scope_role_id = 2
                WHERE rc.result_id = resultId
                    AND rc.is_active = TRUE
                    AND rc.geo_scope_role_id = 2
                GROUP by  rc.country_id, cc.name) temp;
                
                IF (NOT COALESCE(general_validation, FALSE)) THEN RETURN FALSE; END IF;
            
            END IF;
        
        END IF;
    
    END IF;

     RETURN TRUE;
END`;

// IRS-R-6 (design section 5).
const IMPACT_LEVEL_INFO = `CREATE FUNCTION \`validation_impact_level_info_P25\`(resultId BIGINT) RETURNS tinyint
    DETERMINISTIC
BEGIN
    -- IRS-R-6: complete only when a study type is set, the contribution statement has 1-100 words,
    -- the "already reported" answer is set and, if Yes, at least one active previous result is linked.
    DECLARE v_row_id BIGINT DEFAULT NULL;
    DECLARE v_study_type BIGINT DEFAULT NULL;
    DECLARE v_contribution TEXT DEFAULT NULL;
    DECLARE v_previously_reported BOOLEAN DEFAULT NULL;
    DECLARE v_normalized TEXT DEFAULT NULL;
    DECLARE v_words BIGINT DEFAULT 0;
    DECLARE v_links BIGINT DEFAULT 0;

    SELECT
        ril.id,
        ril.impact_study_type_id,
        ril.cgiar_contribution,
        ril.previously_reported
        INTO
        v_row_id,
        v_study_type,
        v_contribution,
        v_previously_reported
    FROM results_impact_level ril
    WHERE ril.result_id = resultId
        AND ril.is_active = TRUE
    LIMIT 1;

    IF (v_row_id IS NULL) THEN RETURN FALSE; END IF;
    IF (v_study_type IS NULL) THEN RETURN FALSE; END IF;
    IF (v_contribution IS NULL) THEN RETURN FALSE; END IF;
    IF (v_previously_reported IS NULL) THEN RETURN FALSE; END IF;

    -- Word = maximal run of non-whitespace after trimming: collapse whitespace runs to one space,
    -- trim, then separators + 1 (empty => 0). Mirrors the shared TS countWords.
    SET v_normalized = TRIM(REGEXP_REPLACE(v_contribution, '[[:space:]]+', ' '));
    IF (v_normalized = '') THEN
        SET v_words = 0;
    ELSE
        SET v_words = CHAR_LENGTH(v_normalized) - CHAR_LENGTH(REPLACE(v_normalized, ' ', '')) + 1;
    END IF;

    IF (v_words < 1 OR v_words > 100) THEN RETURN FALSE; END IF;

    IF (v_previously_reported = TRUE) THEN
        SELECT COUNT(*)
            INTO
            v_links
        FROM results_impact_previous_result rip
        WHERE rip.result_id = resultId
            AND rip.is_active = TRUE;

        IF (v_links < 1) THEN RETURN FALSE; END IF;
    END IF;

    RETURN TRUE;
END`;

export class IRSImpactResultsFoundation1792000000000
  implements MigrationInterface
{
  name = 'IRSImpactResultsFoundation1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`impact_study_type\` (
        \`id\` int NOT NULL,
        \`name\` varchar(100) NOT NULL,
        \`definition\` text NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`results_impact_level\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`impact_study_type_id\` int NULL,
        \`cgiar_contribution\` text NULL,
        \`previously_reported\` tinyint NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` int NULL,
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`last_updated_by\` int NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_results_impact_level_result\` (\`result_id\`),
        CONSTRAINT \`FK_results_impact_level_result\` FOREIGN KEY (\`result_id\`)
          REFERENCES \`result\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_results_impact_level_study_type\` FOREIGN KEY (\`impact_study_type_id\`)
          REFERENCES \`impact_study_type\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_results_impact_level_created_by\` FOREIGN KEY (\`created_by\`)
          REFERENCES \`users\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_results_impact_level_updated_by\` FOREIGN KEY (\`last_updated_by\`)
          REFERENCES \`users\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`results_impact_previous_result\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`previous_result_id\` bigint NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`created_by\` int NULL,
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`last_updated_by\` int NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`UQ_results_impact_previous_result_pair\` (\`result_id\`, \`previous_result_id\`),
        INDEX \`IDX_results_impact_previous_result_previous\` (\`previous_result_id\`),
        CONSTRAINT \`FK_results_impact_previous_result_result\` FOREIGN KEY (\`result_id\`)
          REFERENCES \`result\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_results_impact_previous_result_previous\` FOREIGN KEY (\`previous_result_id\`)
          REFERENCES \`result\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_results_impact_previous_result_created_by\` FOREIGN KEY (\`created_by\`)
          REFERENCES \`users\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT \`FK_results_impact_previous_result_updated_by\` FOREIGN KEY (\`last_updated_by\`)
          REFERENCES \`users\` (\`id\`)
          ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    // IRS-R-3 seed: definitions from requirements section 3 (James Hammond, 2026-10-27).
    await queryRunner.query(`
      INSERT INTO \`impact_study_type\` (\`id\`, \`name\`, \`definition\`)
      SELECT 1, 'Learning study', 'Evaluates the effectiveness of an intervention in a localized context'
      WHERE NOT EXISTS (SELECT 1 FROM \`impact_study_type\` WHERE \`id\` = 1)
    `);
    await queryRunner.query(`
      INSERT INTO \`impact_study_type\` (\`id\`, \`name\`, \`definition\`)
      SELECT 2, 'Accountability study', 'Evaluates the total effect of an intervention that has gone to scale'
      WHERE NOT EXISTS (SELECT 1 FROM \`impact_study_type\` WHERE \`id\` = 2)
    `);

    // IRS-P-1 / IRS-P-2: no-ops when level 1 / type 9 already exist and are active.
    await queryRunner.query(`
      INSERT INTO \`result_by_level\` (\`result_level_id\`, \`result_type_id\`)
      SELECT 1, 9
      WHERE NOT EXISTS (
        SELECT 1 FROM \`result_by_level\` WHERE \`result_level_id\` = 1 AND \`result_type_id\` = 9
      )
    `);
    await queryRunner.query(`
      UPDATE \`result_type\` SET \`is_active\` = 1
      WHERE \`id\` = 9 AND (\`is_active\` IS NULL OR \`is_active\` <> 1)
    `);

    // IRS-R-6: section name -> function suffix (resolved as validation_<function_name>_<portfolio>).
    await queryRunner.query(
      `DELETE FROM validation_maps WHERE display_name = 'impact-level-info'`,
    );
    await queryRunner.query(
      `INSERT INTO validation_maps (display_name, function_name) VALUES ('impact-level-info', 'impact_level_info')`,
    );

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_impact_level_info_P25`',
    );
    await queryRunner.query(IMPACT_LEVEL_INFO);

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_contributor_partner_P25`',
    );
    await queryRunner.query(CONTRIBUTOR_PARTNER_WITH_IMPACT);

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_geo_location_P25`',
    );
    await queryRunner.query(GEO_LOCATION_WITH_IMPACT);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_geo_location_P25`',
    );
    await queryRunner.query(GEO_LOCATION_LIVE);

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_contributor_partner_P25`',
    );
    await queryRunner.query(CONTRIBUTOR_PARTNER_LIVE);

    await queryRunner.query(
      'DROP FUNCTION IF EXISTS `validation_impact_level_info_P25`',
    );
    await queryRunner.query(
      `DELETE FROM validation_maps WHERE display_name = 'impact-level-info'`,
    );

    await queryRunner.query(
      'DROP TABLE IF EXISTS `results_impact_previous_result`',
    );
    await queryRunner.query('DROP TABLE IF EXISTS `results_impact_level`');
    await queryRunner.query('DROP TABLE IF EXISTS `impact_study_type`');
  }
}
