const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const electronDist = path.join(rootDir, 'node_modules/electron/dist');
const outDir = path.join(rootDir, 'release/Still-win32-x64');
const appDir = path.join(outDir, 'resources/app');

console.log('--- Packaging Still Windows Desktop Standalone Application ---');

if (!fs.existsSync(electronDist)) {
  console.error('Error: node_modules/electron/dist does not exist.');
  process.exit(1);
}

if (fs.existsSync(outDir)) {
  try {
    fs.rmSync(outDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('Could not clean outDir, continuing...');
  }
}
fs.mkdirSync(outDir, { recursive: true });

// 1. Copy Electron runtime binaries
console.log('Copying Electron runtime binaries...');
fs.cpSync(electronDist, outDir, { recursive: true });

// 2. Rename electron.exe -> Still.exe
const oldExe = path.join(outDir, 'electron.exe');
const newExe = path.join(outDir, 'Still.exe');
if (fs.existsSync(oldExe)) {
  fs.renameSync(oldExe, newExe);
  console.log('Created Still.exe');
}

// 3. Create resources/app
fs.mkdirSync(appDir, { recursive: true });

// 4. Copy production assets
console.log('Copying production bundles & assets...');
fs.cpSync(path.join(rootDir, 'dist'), path.join(appDir, 'dist'), { recursive: true });
fs.cpSync(path.join(rootDir, 'dist-electron'), path.join(appDir, 'dist-electron'), { recursive: true });
fs.cpSync(path.join(rootDir, 'assets'), path.join(appDir, 'assets'), { recursive: true });
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(appDir, 'package.json'));

// 5. Copy sql.js module into resources/app/node_modules/sql.js
console.log('Bundling local SQLite engine (sql.js)...');
const sqlJsDest = path.join(appDir, 'node_modules/sql.js');
fs.mkdirSync(path.dirname(sqlJsDest), { recursive: true });
fs.cpSync(path.join(rootDir, 'node_modules/sql.js'), sqlJsDest, { recursive: true });

console.log('---------------------------------------------------------');
console.log('✅ STILL STANDALONE WINDOWS APPLICATION PACKAGED SUCCESSFULLY!');
console.log(`📁 Executable Location: ${newExe}`);
console.log('---------------------------------------------------------');
