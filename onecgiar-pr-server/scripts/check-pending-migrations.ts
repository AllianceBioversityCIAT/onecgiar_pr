import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import * as fs from 'node:fs';
import * as path from 'node:path';

function extractMigrationNameFromContent(content: string, file: string, isQuiet: boolean): string {
  // Extract the class name from the migration file
  // Pattern: export class ClassName1234567890 implements MigrationInterface
  const classRegex = /export\s+class\s+(\w+)\s+implements\s+MigrationInterface/;
  const classMatch = classRegex.exec(content);

  if (!classMatch) {
    if (!isQuiet) {
      console.warn(`⚠️  Could not extract migration name from ${file}, using filename`);
    }
    return file.replace(/\.(ts|js)$/, '');
  }

  const className = classMatch[1];
  const lines = content.split('\n');
  const classLineIndex = lines.findIndex(line =>
    line.includes(`export class ${className}`) && line.includes('MigrationInterface')
  );

  if (classLineIndex < 0) {
    return className;
  }

  const classBodyStart = classLineIndex + 1;
  const classBodyLines = lines.slice(classBodyStart, classBodyStart + 5);
  const classBodyText = classBodyLines.join('\n');

  // Limit input size to prevent ReDoS (max 1000 chars for 5 lines)
  if (classBodyText.length > 1000) {
    return className;
  }

  // Use backreference to ensure opening and closing quotes match (prevents ReDoS)
  // Limit whitespace to prevent excessive backtracking: \s{0,20} instead of \s*
  // Limit string content to max 500 chars to prevent ReDoS
  const namePropertyRegex = /^\s{0,20}name\s{0,20}=\s{0,20}(['"])([^'"]{1,500})\1/m;
  const namePropertyMatch = namePropertyRegex.exec(classBodyText);

  return namePropertyMatch ? namePropertyMatch[2] : className;
}

function getMigrationFiles(migrationsDir: string, isQuiet: boolean): string[] {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

  const migrationFiles: string[] = [];

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const migrationName = extractMigrationNameFromContent(content, file, isQuiet);
    migrationFiles.push(migrationName);
  }

  migrationFiles.sort((a, b) => a.localeCompare(b));
  return migrationFiles;
}

async function getExecutedMigrations(
  connection: mysql.Connection,
  migrationsTableName: string,
  isQuiet: boolean,
): Promise<string[]> {
  try {
    const [rows] = await connection.execute(
      `SELECT name FROM \`${migrationsTableName}\` ORDER BY timestamp DESC`,
    );
    return (rows as any[]).map((row: any) => row.name);
  } catch (error: any) {
    // If migrations table doesn't exist, all migrations are pending
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
      if (!isQuiet) {
        console.warn(
          '⚠️  Migrations table not found. All migrations are considered pending.',
        );
      }
      return [];
    }
    throw error;
  }
}

function outputResults(
  pendingMigrations: string[],
  totalMigrations: number,
  executedCount: number,
  isQuiet: boolean,
  hasPending: boolean,
): void {
  const pendingCount = pendingMigrations.length;

  if (hasPending) {
    if (isQuiet) {
      console.error(`PENDING_MIGRATIONS=${pendingCount}`);
      console.error(`TOTAL_MIGRATIONS=${totalMigrations}`);
      console.error(`EXECUTED_MIGRATIONS=${executedCount}`);
      pendingMigrations.forEach((migration) => {
        console.error(`PENDING: ${migration}`);
      });
    } else {
      console.error('\n📊 Migration Status:');
      console.error(`   Total migrations: ${totalMigrations}`);
      console.error(`   Executed: ${executedCount}`);
      console.error(`   Pending: ${pendingCount}`);
      console.error(`\n❌ Found ${pendingCount} pending migration(s):`);
      pendingMigrations.forEach((migration) => {
        console.error(`   - ${migration}`);
      });
      console.error(
        '\n💡 Run "npm run migration:run" to apply pending migrations.',
      );
    }
    process.exit(1);
  } else {
    if (isQuiet) {
      console.log(`PENDING_MIGRATIONS=0`);
      console.log(`TOTAL_MIGRATIONS=${totalMigrations}`);
      console.log(`EXECUTED_MIGRATIONS=${executedCount}`);
    } else {
      console.log('\n📊 Migration Status:');
      console.log(`   Total migrations: ${totalMigrations}`);
      console.log(`   Executed: ${executedCount}`);
      console.log(`   Pending: ${pendingCount}`);
      console.log('\n✅ No pending migrations found. Database is up to date.');
    }
    process.exit(0);
  }
}

async function checkPendingMigrations() {
  let connection: mysql.Connection | null = null;
  const isQuiet = process.argv.includes('--quiet') || process.env.CI === 'true';

  try {
    if (!isQuiet) {
      console.log('🔍 Checking for pending migrations...');
    }

    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER_NAME,
      password: process.env.DB_USER_PASS,
      database: process.env.DB_NAME,
    });

    const projectRoot = process.cwd();
    const migrationsDir = path.join(projectRoot, 'src/migrations');
    const migrationFiles = getMigrationFiles(migrationsDir, isQuiet);

    const migrationsTableName = 'migrations';
    const executedMigrationNames = await getExecutedMigrations(
      connection,
      migrationsTableName,
      isQuiet,
    );

    const pendingMigrations = migrationFiles.filter(
      (migration) => !executedMigrationNames.includes(migration),
    );

    const totalMigrations = migrationFiles.length;
    const executedCount = executedMigrationNames.length;

    outputResults(
      pendingMigrations,
      totalMigrations,
      executedCount,
      isQuiet,
      pendingMigrations.length > 0,
    );
  } catch (error) {
    console.error('❌ Error checking pending migrations:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkPendingMigrations();
