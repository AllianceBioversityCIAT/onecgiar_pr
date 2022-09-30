-- ALL RESULTS (FIGMA TABLE)
SELECT
    r.id,
    r.title,
    v.version_name AS reported_year,
    rt.name AS result_type,
    r.status,
    r.created_date
FROM
    result r
    INNER JOIN version v ON v.id = r.version_id
    INNER JOIN result_type rt ON rt.id = r.result_type_id
WHERE
    r.is_active > 0;

-- SEARCH BY TITLE (FIGMA TABLE)
SELECT
    r.id,
    r.title,
    v.version_name AS reported_year,
    rt.name AS result_type,
    r.status,
    r.created_date
FROM
    result r
    INNER JOIN version v ON v.id = r.version_id
    INNER JOIN result_type rt ON rt.id = r.result_type_id
WHERE
    r.title LIKE '%TITLE%'
    AND r.is_active > 0;

--SEARCH BY TITLE
SELECT
    r.id,
    r.title,
    r.description,
    r.is_active,
    r.last_updated_date,
    gtl.title AS gender_tag_name,
    v.version_name AS version_name,
    rt.name AS result_type_name,
    r.status,
    r.created_date,
    u1.first_name AS owner,
    u2.first_name AS updated_by
FROM
    result r
    INNER JOIN gender_tag_level gtl ON gtl.id = r.gender_tag_level_id
    INNER JOIN version v ON v.id = r.version_id
    INNER JOIN result_type rt ON rt.id = r.result_type_id
    INNER JOIN users u1 ON u1.id = r.created_by
    INNER JOIN users u2 ON u2.id = r.last_updated_by
WHERE
    r.title LIKE '%TITLE%'
    AND r.is_active > 0;

-- ALL RESULTS
SELECT
    r.id,
    r.title,
    r.description,
    r.is_active,
    r.last_updated_date,
    gtl.title AS gender_tag_name,
    v.version_name AS version_name,
    rt.name AS result_type_name,
    r.status,
    r.created_date,
    u1.first_name AS owner,
    u2.first_name AS updated_by
FROM
    result r
    INNER JOIN gender_tag_level gtl ON gtl.id = r.gender_tag_level_id
    INNER JOIN version v ON v.id = r.version_id
    INNER JOIN result_type rt ON rt.id = r.result_type_id
    INNER JOIN users u1 ON u1.id = r.created_by
    INNER JOIN users u2 ON u2.id = r.last_updated_by
WHERE
    r.is_active > 0;

-- RESULT LEVELS
SELECT
    rt.id AS result_types_id,
    rt.name AS result_types_name,
    rl.id AS result_level_id,
    rl.name AS result_level_name
FROM
    result_type rt
    INNER JOIN result_level rl ON rl.id = rt.result_level_id;

-- INSERT NEW RESULT