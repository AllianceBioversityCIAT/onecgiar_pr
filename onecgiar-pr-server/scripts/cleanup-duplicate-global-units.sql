-- Script para eliminar duplicados físicos de clarisa_global_units
-- 
-- IMPORTANTE: Ejecutar en un ambiente de desarrollo/staging PRIMERO para verificar
-- IMPORTANTE: Hacer backup de la tabla antes de ejecutar
-- 
-- Este script identifica y elimina duplicados reales (mismo compose_code + mismo year + mismo entity_type_id)
-- Mantiene el registro más reciente (mayor id) de cada grupo de duplicados
--
-- Para entity_type_id 22, 23, 24: el año se ignora en la lógica del código,
-- pero físicamente en la BD tienen años diferentes, así que NO se consideran duplicados aquí

-- PASO 1: Verificar duplicados (ejecutar primero para revisar qué se eliminará)
SELECT 
    compose_code,
    year,
    entity_type_id,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(id ORDER BY id DESC) as ids,
    MAX(id) as keep_id,
    GROUP_CONCAT(id ORDER BY id DESC SEPARATOR ', ') as delete_ids
FROM clarisa_global_units
WHERE year IS NOT NULL  -- Solo considerar registros con año (excluir los que tienen year NULL por ahora)
GROUP BY compose_code, year, entity_type_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, compose_code, year;

-- PASO 2: Ver duplicados con year NULL (si los hay)
SELECT 
    compose_code,
    year,
    entity_type_id,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(id ORDER BY id DESC) as ids,
    MAX(id) as keep_id
FROM clarisa_global_units
WHERE year IS NULL
GROUP BY compose_code, entity_type_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, compose_code;

-- PASO 3: ELIMINAR duplicados (descomentar para ejecutar)
-- IMPORTANTE: Ejecutar en transacción para poder hacer rollback si es necesario
-- START TRANSACTION;

-- Eliminar duplicados donde year IS NOT NULL
-- Mantiene el registro con mayor id de cada grupo
/*
DELETE cgu1 FROM clarisa_global_units cgu1
INNER JOIN (
    SELECT 
        compose_code,
        year,
        entity_type_id,
        MAX(id) as max_id
    FROM clarisa_global_units
    WHERE year IS NOT NULL
    GROUP BY compose_code, year, entity_type_id
    HAVING COUNT(*) > 1
) duplicates ON 
    cgu1.compose_code = duplicates.compose_code
    AND cgu1.year = duplicates.year
    AND (cgu1.entity_type_id = duplicates.entity_type_id OR (cgu1.entity_type_id IS NULL AND duplicates.entity_type_id IS NULL))
    AND cgu1.id < duplicates.max_id;
*/

-- Eliminar duplicados donde year IS NULL
-- Mantiene el registro con mayor id de cada grupo
/*
DELETE cgu1 FROM clarisa_global_units cgu1
INNER JOIN (
    SELECT 
        compose_code,
        entity_type_id,
        MAX(id) as max_id
    FROM clarisa_global_units
    WHERE year IS NULL
    GROUP BY compose_code, entity_type_id
    HAVING COUNT(*) > 1
) duplicates ON 
    cgu1.compose_code = duplicates.compose_code
    AND cgu1.year IS NULL
    AND (cgu1.entity_type_id = duplicates.entity_type_id OR (cgu1.entity_type_id IS NULL AND duplicates.entity_type_id IS NULL))
    AND cgu1.id < duplicates.max_id;
*/

-- PASO 4: Verificar que no queden duplicados
/*
SELECT 
    compose_code,
    year,
    entity_type_id,
    COUNT(*) as count
FROM clarisa_global_units
GROUP BY compose_code, year, entity_type_id
HAVING COUNT(*) > 1;
*/

-- PASO 5: Si todo está bien, hacer COMMIT, si no, hacer ROLLBACK
-- COMMIT;
-- ROLLBACK;

