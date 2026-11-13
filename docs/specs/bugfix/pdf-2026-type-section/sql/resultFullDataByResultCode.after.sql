-- resultFullDataByResultCode — AFTER (bugfix/pdf-2026-type-section, PTS-T-2)
-- Base: before.sql (live TEST body). This file is the PROD script (definer prmsadmin, "Follow P2-4049").
-- Change 1 (DD-1): the P25 branch gate `p_version_id = 34` becomes
--   (select v.phase_year from version v where v.id = p_version_id) >= 2025
--   so 2026 and later phases use reportSectionSevenByResultCode_P25. A missing version row gives a
--   NULL year, the test is NULL, and the call goes to the legacy branch (DD-2).
-- Change 2 (DD-3): `set char_lim = (SELECT @@group_concat_max_len);` at the top of the P25 branch,
--   the same line the legacy branch uses, so the `char_lim < 150000` test no longer compares NULL (PTS-R-3).
-- Nothing else changes, apart from the definer line (DD-4).
-- Spec: docs/specs/bugfix/pdf-2026-type-section/ (requirements PTS-R-1..R-4, design DD-1..DD-5).
-- How to apply: SQL Editor tab, whole file (DROP + CREATE + COMMIT). The DBeaver routine editor takes
--   .after.body-only.sql. TEST applies the body-only file, so it keeps its definer prdbusertst.
-- After applying: open a FRESH DBeaver tab, run the SHOW CREATE FUNCTION at the bottom and the T-2/T-3
--   check queries recorded in the spec's execution.md.
-- Roll-back: TEST -> before.sql; PROD -> before.prod.sql (saved in PTS-T-3).

DROP FUNCTION IF EXISTS resultFullDataByResultCode;

DELIMITER $$

CREATE DEFINER=`prmsadmin`@`%` FUNCTION `resultFullDataByResultCode`(
  p_result_code bigint,
  p_version_id bigint,
  p_pdf_url text
) RETURNS json
begin
  declare full_data json;
  declare basic_data json;
  declare section_seven_data json;
  declare toc_data json;

  declare char_lim bigint;
  declare generation_date datetime;

  if (select count(r.id)
      from result r
      where r.result_code = p_result_code
        and r.version_id = p_version_id
        and r.is_active > 0) = 0 then

    set full_data = json_object('error', concat('The result with code ', p_result_code, ' does not exist'));

  elseif (select count(r.id)
          from result r
          where r.result_code = p_result_code
            and r.version_id = p_version_id
            and r.result_type_id in (10, 11)
            and r.is_active > 0) = 1 then

    set full_data = json_object('error', concat('The result with code ', p_result_code, ' has a type not supported by this report'));

  elseif (select trim(coalesce(p_pdf_url, ''))) = '' then

    set full_data = json_object('internal_error', concat('The provided PDF URL cannot be empty'));

  else
    begin
      -- ✅ NUEVO: si es P_25 (version_id = 25), devolver JSON true y NO ejecutar el flujo normal
      if (select v.phase_year from version v where v.id = p_version_id) >= 2025 then
        set char_lim = (SELECT @@group_concat_max_len);
      
        if (char_lim < 150000) then
          set @@group_concat_max_len = 150000;
        end if;
  
        set generation_date = now();
        set basic_data = reportBasicInfoByResultCode(p_result_code, p_version_id, p_pdf_url);
        set section_seven_data = reportSectionSevenByResultCode_P25(p_result_code, p_version_id);
        set toc_data = tocInfoByResultCode(p_result_code, p_version_id);
        
        set full_data = json_merge_patch(
          ifnull(basic_data, '{}'),
          ifnull(section_seven_data, '{}'),
          ifnull(toc_data, '{}'),
          json_object('generation_date_footer', DATE_FORMAT(CONVERT_TZ(generation_date, '+00:00', '+02:00'), '%W, %M %D, %Y at %k:%i CET')),
          json_object('generation_date_filename', DATE_FORMAT(CONVERT_TZ(generation_date, '+00:00', '+02:00'), '%Y%m%d_%H%i'))
        );
        
      else
        set char_lim = (SELECT @@group_concat_max_len);

        if (char_lim < 150000) then
          set @@group_concat_max_len = 150000;
        end if;

        set generation_date = now();
        set basic_data = reportBasicInfoByResultCode(p_result_code, p_version_id, p_pdf_url);
        set section_seven_data = reportSectionSevenByResultCode(p_result_code, p_version_id);
        set toc_data = tocInfoByResultCode(p_result_code, p_version_id);

        set full_data = json_merge_patch(
          ifnull(basic_data, '{}'),
          ifnull(section_seven_data, '{}'),
          ifnull(toc_data, '{}'),
          json_object('generation_date_footer', DATE_FORMAT(CONVERT_TZ(generation_date, '+00:00', '+02:00'), '%W, %M %D, %Y at %k:%i CET')),
          json_object('generation_date_filename', DATE_FORMAT(CONVERT_TZ(generation_date, '+00:00', '+02:00'), '%Y%m%d_%H%i'))
        );
      end if;
    end;
  end if;

  return full_data;
end
$$

DELIMITER ;

COMMIT;

-- CHECK (run from a fresh DBeaver tab; read-only). Compare with the CREATE ... end block above.
-- Then run the T-2/T-3 check queries recorded in the spec's execution.md.
SHOW CREATE FUNCTION resultFullDataByResultCode;
