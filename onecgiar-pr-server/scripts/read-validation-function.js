/**
 * READ-ONLY. Dumps the LIVE body of a green-check validation function.
 *
 * Why this exists: the copies committed under `src/migrations/` are NOT what runs.
 * `1762528725798-createValidtionP25.ts` reads `riu.innovation_readiness_level_id`, a column
 * renamed to `innovation_use_level_id` by an EARLIER migration — that body would crash at
 * runtime, and yet the Innovation Use green check works in prtest (measured 3 Sep 2026: green on
 * 8 of 12 results). So the live body differs from the repo, and no fix can be written from the
 * repo copy without overwriting the working one with a broken one.
 *
 * Requires the CIAT VPN. Never prints credentials.
 *
 *   node scripts/read-validation-function.js                       # list every validation_* function
 *   node scripts/read-validation-function.js validation_innovation_dev_P25
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const wanted = process.argv[2];

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER_NAME,
    password: env.DB_USER_PASS,
    database: env.DB_NAME,
    connectTimeout: 15000,
  });

  try {
    if (!wanted) {
      const [rows] = await connection.query(
        `SELECT ROUTINE_NAME, ROUTINE_TYPE, LAST_ALTERED
           FROM information_schema.ROUTINES
          WHERE ROUTINE_SCHEMA = DATABASE()
            AND (ROUTINE_NAME LIKE 'validation%' OR ROUTINE_NAME LIKE 'validate%')
          ORDER BY ROUTINE_NAME`,
      );
      console.log(`${rows.length} routines:\n`);
      for (const r of rows) {
        console.log(`  ${r.ROUTINE_TYPE.padEnd(9)} ${r.ROUTINE_NAME}   (last altered ${r.LAST_ALTERED})`);
      }
      console.log('\nRe-run with a name to dump its body.');
      return;
    }

    const [rows] = await connection.query(
      `SELECT ROUTINE_DEFINITION, LAST_ALTERED
         FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = ?`,
      [wanted],
    );

    if (!rows.length) {
      console.log(`Not found: ${wanted}`);
      console.log('🛑 A missing function is not neutral: validate_sections_mapped_batch returns FALSE');
      console.log('   when it cannot resolve one, so the section never turns green.');
      return;
    }

    console.log(`-- ${wanted}  (last altered ${rows[0].LAST_ALTERED})\n`);
    console.log(rows[0].ROUTINE_DEFINITION);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Failed:', error.code || error.message);
  if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    console.error('→ Looks like the CIAT VPN is not connected.');
  }
  process.exitCode = 1;
});
