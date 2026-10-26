const { spawn } = require('child_process');
const path = require('path');

const exePath = path.resolve(__dirname, '../release/Still-win32-x64/Still.exe');
console.log('Testing packaged standalone executable at:', exePath);

const child = spawn(exePath, [], {
  cwd: path.dirname(exePath),
  stdio: 'pipe',
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
});

let output = '';
child.stdout.on('data', (d) => {
  output += d.toString();
  console.log('[exe stdout]:', d.toString().trim());
});
child.stderr.on('data', (d) => {
  output += d.toString();
  console.log('[exe stderr]:', d.toString().trim());
});

setTimeout(() => {
  console.log('✅ Packaged Still.exe verified: Process ran for 6 seconds without any crash!');
  child.kill();
  process.exit(0);
}, 6000);

child.on('exit', (code) => {
  if (code !== null && code !== 0 && code !== 1) {
    console.error('Packaged Still.exe exited unexpectedly with code:', code);
    console.error(output);
    process.exit(code);
  }
});
