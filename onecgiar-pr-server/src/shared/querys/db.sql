 -- ALL RESULTS
SELECT 
    r.id,
    r.title,
    r.version_id,
    rbi.inititiative_id AS submitter,
    r.created_date
FROM
    result r
    INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id;

--SEARCH BY TITLE
SELECT 
    r.id,
    r.title,
    r.version_id,
    rbi.inititiative_id AS submitter,
    r.created_date
FROM
    result r
    INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
WHERE 
    r.title LIKE '%title%';

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