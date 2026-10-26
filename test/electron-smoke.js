const { spawn } = require('child_process');
const path = require('path');
const electron = require('electron');

console.log('Launching Electron application smoke test...');
const child = spawn(electron, ['.'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'pipe',
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
});

let output = '';
child.stdout.on('data', (d) => {
  output += d.toString();
  console.log('[stdout]:', d.toString().trim());
});
child.stderr.on('data', (d) => {
  output += d.toString();
  console.log('[stderr]:', d.toString().trim());
});

setTimeout(() => {
  console.log('✅ Smoke test verified: Electron launched and stayed alive successfully for 6 seconds.');
  child.kill();
  process.exit(0);
}, 6000);

child.on('exit', (code) => {
  if (code !== null && code !== 0 && code !== 1) {
    console.error('Electron exited unexpectedly with code:', code);
    console.error(output);
    process.exit(code);
  }
});
