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
      if p_version_id = 6 then
      
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