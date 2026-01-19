import 'dotenv/config';
import * as mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

async function checkPendingMigrations() {
  let connection: mysql.Connection | null = null;

  // Check for quiet mode (for CI/CD)
  const isQuiet = process.argv.includes('--quiet') || process.env.CI === 'true';

  try {
    if (!isQuiet) {
      console.log('🔍 Checking for pending migrations...');
    }

    // Create a simple database connection (faster than initializing full TypeORM)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER_NAME,
      password: process.env.DB_USER_PASS,
      database: process.env.DB_NAME,
    });

    // Get all migration files from the migrations directory
    // Use process.cwd() to get the project root when running with ts-node
    const projectRoot = process.cwd();
    const migrationsDir = path.join(projectRoot, 'src/migrations');
    const migrationFiles: string[] = [];

    // Read all migration files and extract the class name (which is what TypeORM stores)
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract the class name from the migration file
      // Pattern: export class ClassName1234567890 implements MigrationInterface
      const classMatch = content.match(/export\s+class\s+(\w+)\s+implements\s+MigrationInterface/);
      if (classMatch) {
        const className = classMatch[1];

        // Check if there's an explicit 'name' property in the class (within first 5 lines after class declaration)
        const lines = content.split('\n');
        const classLineIndex = lines.findIndex(line =>
          line.includes(`export class ${className}`) && line.includes('MigrationInterface')
        );

        if (classLineIndex >= 0) {
          // Look for 'name' property in the next few lines (usually right after class declaration)
          const classBodyStart = classLineIndex + 1;
          const classBodyLines = lines.slice(classBodyStart, classBodyStart + 5);
          const namePropertyMatch = classBodyLines.join('\n').match(/^\s*name\s*=\s*['"]([^'"]+)['"]/m);

          if (namePropertyMatch) {
            migrationFiles.push(namePropertyMatch[1]);
          } else {
            // Use class name (TypeORM uses class name by default)
            migrationFiles.push(className);
          }
        } else {
          // Use class name as fallback
          migrationFiles.push(className);
        }
      } else {
        // If we can't find the class, try to extract from filename as last resort
        if (!isQuiet) {
          console.warn(`⚠️  Could not extract migration name from ${file}, using filename`);
        }
        migrationFiles.push(file.replace(/\.(ts|js)$/, ''));
      }
    }

    migrationFiles.sort();

    // Get executed migrations from the database
    const migrationsTableName = 'migrations';
    let executedMigrationNames: string[] = [];

    try {
      const [rows] = await connection.execute(
        `SELECT name FROM \`${migrationsTableName}\` ORDER BY timestamp DESC`,
      );
      executedMigrationNames = (rows as any[]).map((row: any) => row.name);
    } catch (error: any) {
      // If migrations table doesn't exist, all migrations are pending
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === '42S02') {
        if (!isQuiet) {
          console.warn(
            '⚠️  Migrations table not found. All migrations are considered pending.',
          );
        }
      } else {
        throw error;
      }
    }

    // Filter pending migrations
    const pendingMigrations = migrationFiles.filter(
      (migration) => !executedMigrationNames.includes(migration),
    );

    const totalMigrations = migrationFiles.length;
    const executedCount = executedMigrationNames.length;
    const pendingCount = pendingMigrations.length;

    if (pendingMigrations.length > 0) {
      if (isQuiet) {
        // CI mode: minimal output
        console.error(`PENDING_MIGRATIONS=${pendingCount}`);
        console.error(`TOTAL_MIGRATIONS=${totalMigrations}`);
        console.error(`EXECUTED_MIGRATIONS=${executedCount}`);
        pendingMigrations.forEach((migration) => {
          console.error(`PENDING: ${migration}`);
        });
      } else {
        // Verbose mode: detailed output
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
        // CI mode: minimal output
        console.log(`PENDING_MIGRATIONS=0`);
        console.log(`TOTAL_MIGRATIONS=${totalMigrations}`);
        console.log(`EXECUTED_MIGRATIONS=${executedCount}`);
      } else {
        // Verbose mode: detailed output
        console.log('\n📊 Migration Status:');
        console.log(`   Total migrations: ${totalMigrations}`);
        console.log(`   Executed: ${executedCount}`);
        console.log(`   Pending: ${pendingCount}`);
        console.log('\n✅ No pending migrations found. Database is up to date.');
      }
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error checking pending migrations:', error);
    process.exit(1);
  } finally {
    // Close the connection
    if (connection) {
      await connection.end();
    }
  }
}

checkPendingMigrations();
