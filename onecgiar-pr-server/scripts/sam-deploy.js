/**
 * Script to deploy with SAM CLI
 * Generates template.yaml automatically from .env
 * Creates optimized build with production dependencies only
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { saveTemplate, getEnvVarsCount } = require('./sam-env-inject');

const serverDir = path.join(__dirname, '..');
const buildDir = path.join(serverDir, '.sam-build');

/**
 * Executes a command and handles errors
 */
function runCommand(command, description, options = {}) {
  if (description) {
    console.log(`\n${description}`);
  }
  try {
    execSync(command, { stdio: 'inherit', cwd: options.cwd || serverDir });
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Copies a directory recursively
 */
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Removes a directory recursively
 */
function removeDirSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Checks if Docker is available
 */
function isDockerAvailable() {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if SAM CLI is installed
 */
function isSamAvailable() {
  try {
    execSync('sam --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cleans unnecessary files from node_modules to reduce size
 */
function cleanNodeModules(nodeModulesPath) {
  console.log('   Cleaning unnecessary files from node_modules...');
  
  // Patterns of files/folders to delete
  const deletePatterns = [
    // Documentation and metadata
    'README.md', 'README', 'readme.md', 'readme',
    'CHANGELOG.md', 'CHANGELOG', 'changelog.md', 'HISTORY.md',
    'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license',
    'LICENCE', 'LICENCE.md', 'LICENCE.txt',
    'AUTHORS', 'AUTHORS.md', 'CONTRIBUTORS', 'CONTRIBUTORS.md',
    '.npmignore', '.gitignore', '.eslintrc', '.eslintrc.js', '.eslintrc.json',
    '.prettierrc', '.prettierrc.js', '.prettierrc.json',
    '.editorconfig', '.travis.yml', '.github',
    'tsconfig.json', 'tslint.json', '.babelrc',
    'Makefile', 'Gulpfile.js', 'Gruntfile.js',
    'bower.json', 'composer.json',
    '.DS_Store', 'thumbs.db',
    // Folders
    'test', 'tests', '__tests__', 'spec', 'specs',
    'doc', 'docs', 'documentation',
    'example', 'examples',
    'coverage', '.nyc_output',
    '.idea', '.vscode',
    // TypeScript source maps and declaration maps
    '*.map',
  ];
  
  // File extensions to delete
  const deleteExtensions = ['.md', '.markdown', '.ts', '.map'];
  
  // Keep these .ts files (NestJS needs some)
  const keepTsPatterns = ['.d.ts'];
  
  let deletedCount = 0;
  let savedBytes = 0;
  
  function cleanDir(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      try {
        const stat = fs.statSync(fullPath);
        
        // Check if should delete by name
        const shouldDeleteByName = deletePatterns.some(pattern => {
          if (pattern.startsWith('*.')) {
            return item.endsWith(pattern.slice(1));
          }
          return item.toLowerCase() === pattern.toLowerCase();
        });
        
        // Check if should delete by extension
        const ext = path.extname(item).toLowerCase();
        const shouldDeleteByExt = deleteExtensions.includes(ext) && 
          !keepTsPatterns.some(keep => item.endsWith(keep));
        
        if (shouldDeleteByName || shouldDeleteByExt) {
          const size = stat.isDirectory() ? getFolderSize(fullPath) : stat.size;
          savedBytes += size;
          deletedCount++;
          
          if (stat.isDirectory()) {
            removeDirSync(fullPath);
          } else {
            fs.unlinkSync(fullPath);
          }
        } else if (stat.isDirectory()) {
          cleanDir(fullPath);
        }
      } catch (e) {
        // Ignore errors (permission issues, etc.)
      }
    }
  }
  
  cleanDir(nodeModulesPath);
  console.log(`   Removed ${deletedCount} unnecessary files (saved ${formatBytes(savedBytes)})`);
}

/**
 * Creates optimized build directory with production dependencies only
 */
function createOptimizedBuild() {
  console.log('\n📦 Creating optimized build directory...');
  
  // Remove old build directory
  removeDirSync(buildDir);
  
  // Create new build directory
  fs.mkdirSync(buildDir, { recursive: true });
  
  // Copy dist folder
  const distSrc = path.join(serverDir, 'dist');
  const distDest = path.join(buildDir, 'dist');
  
  if (!fs.existsSync(distSrc)) {
    console.error('❌ dist folder not found. Run npm run build first.');
    return false;
  }
  
  console.log('   Copying dist folder...');
  copyDirSync(distSrc, distDest);
  
  // Copy package.json and package-lock.json
  console.log('   Copying package files...');
  fs.copyFileSync(
    path.join(serverDir, 'package.json'),
    path.join(buildDir, 'package.json')
  );
  
  if (fs.existsSync(path.join(serverDir, 'package-lock.json'))) {
    fs.copyFileSync(
      path.join(serverDir, 'package-lock.json'),
      path.join(buildDir, 'package-lock.json')
    );
  }
  
  // Install production dependencies only
  console.log('   Installing production dependencies only...');
  try {
    execSync('npm ci --omit=dev', { 
      stdio: 'inherit', 
      cwd: buildDir 
    });
  } catch {
    // Fallback to npm install if npm ci fails
    execSync('npm install --omit=dev', { 
      stdio: 'inherit', 
      cwd: buildDir 
    });
  }
  
  // Clean unnecessary files from node_modules
  cleanNodeModules(path.join(buildDir, 'node_modules'));
  
  // Get size of build directory
  const buildSize = getFolderSize(buildDir);
  console.log(`   Build size: ${formatBytes(buildSize)}`);
  
  if (buildSize > 250 * 1024 * 1024) {
    console.warn('⚠️  Warning: Build size exceeds 250MB Lambda limit!');
    console.warn('   Consider using Lambda Layers or Docker image deployment.');
    return false;
  }
  
  console.log('✅ Optimized build created successfully');
  return true;
}

/**
 * Gets folder size recursively
 */
function getFolderSize(folderPath) {
  let size = 0;
  
  if (!fs.existsSync(folderPath)) return size;
  
  const files = fs.readdirSync(folderPath);
  
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      size += getFolderSize(filePath);
    } else {
      size += stat.size;
    }
  }
  
  return size;
}

/**
 * Formats bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main deployment process
 */
async function deploy() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('--prepare-only');
  
  console.log('🚀 Starting SAM deployment...\n');
  if (dryRun) {
    console.log('📋 MODE: Prepare only (no execution)');
  }
  console.log('='.repeat(50));

  // Verify dependencies
  if (!isSamAvailable()) {
    console.error('❌ SAM CLI is not installed. Please install it first:');
    console.error('   https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html');
    process.exit(1);
  }

  // Verify .env file exists
  const envPath = path.join(serverDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    console.error('   Create a .env file with the required environment variables.');
    process.exit(1);
  }

  const envCount = getEnvVarsCount();
  console.log(`📋 Variables found in .env: ${envCount}`);

  // Step 1: Generate template.yaml dynamically from .env
  console.log('\n📝 Generating template.yaml from .env...');
  saveTemplate();

  // Step 2: Build the project
  if (!runCommand('npm run build', '📦 Building NestJS project...')) {
    process.exit(1);
  }

  // Step 3: Create optimized build directory
  if (!createOptimizedBuild()) {
    process.exit(1);
  }

  // Step 4: SAM build
  const useDocker = args.includes('--use-docker');
  let buildCommand = 'sam build';
  
  if (useDocker && isDockerAvailable()) {
    console.log('\n🐳 Using Docker container for build...');
    buildCommand = 'sam build --use-container';
  } else {
    console.log('\n📦 Using local build (no Docker)...');
  }

  if (!runCommand(buildCommand, '🔧 Building with SAM...')) {
    process.exit(1);
  }

  // Step 5: Deploy or prepare changeset
  if (dryRun) {
    console.log('\n📋 Creating changeset (no execution)...');
    console.log('   You can review and execute from AWS Console\n');
    
    if (!runCommand('sam deploy --no-execute-changeset', '')) {
      process.exit(1);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Changeset created successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Go to AWS CloudFormation Console');
    console.log('  2. Find stack: prstaging-dev');
    console.log('  3. Review the changeset');
    console.log('  4. Execute the changeset from the console');
    console.log('='.repeat(50));
  } else {
    console.log('\n🚀 Deploying to AWS...');
    console.log('   (This may take several minutes)\n');
    
    if (!runCommand('sam deploy', '')) {
      process.exit(1);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Deployment completed successfully!');
    console.log('='.repeat(50));
  }
}

// Run
deploy().catch((error) => {
  console.error('❌ Error during deployment:', error.message);
  process.exit(1);
});
