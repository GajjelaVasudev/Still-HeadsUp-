import assert from 'assert';
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import {
  isTaskOverdue,
  getRelativeTimeRemaining,
  calculateNextOccurrence,
  getTodayDateString,
  formatWidgetDate,
  formatHeaderDate,
} from '../src/utils/dateUtils';
import { TaskPriority, TaskRecurrence } from '../src/types';

async function runTests() {
  console.log('--- Starting HeadsUp / Still Automated Logic & Persistence Tests ---');

  // Test 1: Date & Time calculations
  console.log('Test 1: Testing Date & Time calculations...');
  const today = getTodayDateString();
  assert(today.match(/^\d{4}-\d{2}-\d{2}$/), 'Today string should match YYYY-MM-DD');

  const widgetDate = formatWidgetDate();
  assert(typeof widgetDate === 'string' && widgetDate.length > 5, 'Widget date should be formatted');

  const headerInfo = formatHeaderDate();
  assert(headerInfo.dateText && headerInfo.weekText, 'Header date and week should be present');

  // Test 2: Overdue detection
  console.log('Test 2: Testing Overdue logic...');
  const pastDate = '2020-01-01';
  assert(isTaskOverdue(pastDate, '12:00') === true, 'Past date must be overdue');
  assert(isTaskOverdue(pastDate, null) === true, 'Past date without time must be overdue');

  const futureDate = '2099-12-31';
  assert(isTaskOverdue(futureDate, '12:00') === false, 'Future date must not be overdue');

  // Test 3: Relative time formatting
  console.log('Test 3: Testing Relative time formatting...');
  const overdueDiff = getRelativeTimeRemaining('2020-01-01', '12:00');
  assert(overdueDiff.includes('Overdue by'), `Overdue text should say "Overdue by", got: ${overdueDiff}`);

  // Test 4: Recurrence rule calculation
  console.log('Test 4: Testing Recurrence calculation...');
  const baseDate = '2026-10-26';
  const dailyNext = calculateNextOccurrence(baseDate, 'daily');
  assert.strictEqual(dailyNext, '2026-10-27', `Daily next should be 2026-10-27, got ${dailyNext}`);

  const weeklyNext = calculateNextOccurrence(baseDate, 'weekly');
  assert.strictEqual(weeklyNext, '2026-11-02', `Weekly next should be 2026-11-02, got ${weeklyNext}`);

  const monthlyNext = calculateNextOccurrence(baseDate, 'monthly');
  assert.strictEqual(monthlyNext, '2026-11-26', `Monthly next should be 2026-11-26, got ${monthlyNext}`);

  // Test 5: SQLite Database Persistence & Schema
  console.log('Test 5: Testing SQLite Database engine...');
  const SQL = await initSqlJs({
    locateFile: (file) => path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
  });

  const db = new SQL.Database();
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      due_time TEXT,
      priority TEXT NOT NULL,
      category TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      recurrence TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Insert a task
  const taskId = 'test-uuid-123';
  db.run(
    `INSERT INTO tasks (id, title, description, due_date, due_time, priority, category, completed, completed_at, recurrence, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      'Test persistent reminder',
      'Make sure this survives restart',
      today,
      '20:00',
      'urgent',
      'Engineering',
      0,
      null,
      'daily',
      new Date().toISOString(),
      new Date().toISOString(),
    ]
  );

  // Query the task
  const queryRes = db.exec(`SELECT * FROM tasks WHERE id = '${taskId}'`);
  assert(queryRes.length > 0 && queryRes[0].values.length === 1, 'Task should be inserted and queryable');
  assert.strictEqual(queryRes[0].values[0][1], 'Test persistent reminder');

  // Export database to binary buffer (simulating disk persistence)
  const exportedBinary = db.export();
  const testDbPath = path.join(__dirname, 'test_output.db');
  fs.writeFileSync(testDbPath, Buffer.from(exportedBinary));
  assert(fs.existsSync(testDbPath), 'Database file must be written to disk');

  // Reload database from binary buffer
  const reloadedBuffer = fs.readFileSync(testDbPath);
  const reloadedDb = new SQL.Database(reloadedBuffer);
  const reloadedRes = reloadedDb.exec(`SELECT title, priority FROM tasks WHERE id = '${taskId}'`);
  assert(reloadedRes[0].values[0][0] === 'Test persistent reminder', 'Task must survive reload');
  assert(reloadedRes[0].values[0][1] === 'urgent', 'Task priority must survive reload');

  // Clean up test file
  fs.unlinkSync(testDbPath);

  console.log('✅ ALL 5 AUTOMATED TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
