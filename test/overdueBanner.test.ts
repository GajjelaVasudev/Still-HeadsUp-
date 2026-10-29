import assert from 'assert';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';
import { OverdueController, getTaskOverdueSignature } from '../electron/overdueController';
import { Task, TaskPriority, TaskRecurrence } from '../src/types';
import { getTodayDateString } from '../src/utils/dateUtils';

async function runOverdueBannerTests() {
  console.log('--- Starting Still Persistent Overdue Reminder Banner Test Suite ---');

  const SQL = await initSqlJs({
    locateFile: (file) => path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
  });

  function createTestDb(initialBuffer?: Uint8Array): Database {
    const db = initialBuffer ? new SQL.Database(initialBuffer) : new SQL.Database();
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

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    return db;
  }

  let db = createTestDb();

  // Helper functions matching electron/database.ts behavior
  function getAllTasksFromDb(): Task[] {
    const res = db.exec(`SELECT id, title, description, due_date, due_time, priority, category, completed, completed_at, recurrence, created_at, updated_at FROM tasks ORDER BY due_date ASC, due_time ASC`);
    if (!res[0]) return [];
    return res[0].values.map((row: SqlValue[]): Task => ({
      id: String(row[0]),
      title: String(row[1]),
      description: String(row[2] || ''),
      due_date: String(row[3]),
      due_time: row[4] ? String(row[4]) : null,
      priority: String(row[5]) as TaskPriority,
      category: String(row[6] || ''),
      completed: Number(row[7]) === 1,
      completed_at: row[8] ? String(row[8]) : null,
      recurrence: String(row[9]) as TaskRecurrence,
      created_at: String(row[10]),
      updated_at: String(row[11]),
    }));
  }

  function getDismissedSignaturesFromDb(): string[] {
    const res = db.exec(`SELECT value FROM settings WHERE key = 'dismissed_overdue_signatures'`);
    if (res[0] && res[0].values[0]) {
      return JSON.parse(String(res[0].values[0][0]));
    }
    return [];
  }

  function saveDismissedSignaturesToDb(signatures: string[]): void {
    db.run(
      `INSERT INTO settings (key, value) VALUES ('dismissed_overdue_signatures', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [JSON.stringify(signatures)]
    );
  }

  function insertTask(task: {
    id: string;
    title: string;
    due_date: string;
    due_time?: string | null;
    completed?: boolean;
    priority?: TaskPriority;
  }) {
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO tasks (id, title, description, due_date, due_time, priority, category, completed, completed_at, recurrence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        '',
        task.due_date,
        task.due_time || null,
        task.priority || 'medium',
        'Work',
        task.completed ? 1 : 0,
        task.completed ? now : null,
        'none',
        now,
        now,
      ]
    );
  }

  // Track window adapter calls
  let bannerVisible = false;
  let showBannerCalls: Task[][] = [];
  let updateBannerCalls: Task[][] = [];
  let hideBannerCalls = 0;

  function createController(): OverdueController {
    return new OverdueController({
      getTasks: () => getAllTasksFromDb(),
      getDismissedSignatures: () => getDismissedSignaturesFromDb(),
      saveDismissedSignatures: (sigs) => saveDismissedSignaturesToDb(sigs),
      onShowBanner: (tasks) => {
        bannerVisible = true;
        showBannerCalls.push(tasks);
      },
      onUpdateBanner: (tasks) => {
        updateBannerCalls.push(tasks);
      },
      onHideBanner: () => {
        bannerVisible = false;
        hideBannerCalls++;
      },
      isBannerVisible: () => bannerVisible,
    });
  }

  let controller = createController();

  // Test 1: One overdue task creates one banner
  console.log('Test 1: One overdue task creates one banner...');
  insertTask({ id: 'task-1', title: 'Submit quarterly report', due_date: '2020-01-01', due_time: '12:00' });
  const res1 = controller.evaluate();
  assert.strictEqual(showBannerCalls.length, 1, 'Banner should be shown once');
  assert.strictEqual(showBannerCalls[0].length, 1, 'Banner should contain 1 task');
  assert.strictEqual(showBannerCalls[0][0].id, 'task-1');
  assert.strictEqual(res1.isVisible, true);
  assert.strictEqual(res1.hasNewOverdue, true);

  // Test 2: Multiple overdue tasks produce one grouped banner
  console.log('Test 2: Multiple overdue tasks produce one grouped banner...');
  insertTask({ id: 'task-2', title: 'Fix auth token bug', due_date: '2020-01-02', due_time: '14:00' });
  insertTask({ id: 'task-3', title: 'Review pull request', due_date: '2020-01-03', due_time: '16:00' });
  const res2 = controller.evaluate();
  assert.strictEqual(showBannerCalls.length, 1, 'Banner should not be recreated, single window preserved');
  assert.strictEqual(updateBannerCalls.length, 1, 'Banner should receive update with grouped tasks');
  assert.strictEqual(updateBannerCalls[0].length, 3, 'Grouped banner must contain all 3 overdue tasks');
  assert.strictEqual(res2.isVisible, true);

  // Test 3: Completed and non-overdue tasks are excluded
  console.log('Test 3: Completed and non-overdue tasks are excluded...');
  insertTask({ id: 'task-completed', title: 'Already done task', due_date: '2020-01-01', completed: true });
  insertTask({ id: 'task-future', title: 'Future task next year', due_date: '2099-12-31', due_time: '10:00', completed: false });
  const overdueTasks3 = controller.getOverdueTasks();
  assert.strictEqual(overdueTasks3.length, 3, 'Only the 3 uncompleted overdue tasks should be returned');
  assert(!overdueTasks3.some((t) => t.id === 'task-completed'), 'Completed tasks must be excluded');
  assert(!overdueTasks3.some((t) => t.id === 'task-future'), 'Future non-overdue tasks must be excluded');

  // Test 4: Completing the last overdue task closes the banner
  console.log('Test 4: Completing the last overdue task closes the banner...');
  db.run(`UPDATE tasks SET completed = 1 WHERE id IN ('task-1', 'task-2', 'task-3')`);
  const res4 = controller.evaluate();
  assert.strictEqual(hideBannerCalls, 1, 'onHideBanner must be called when no overdue tasks remain');
  assert.strictEqual(bannerVisible, false, 'Banner should no longer be visible');
  assert.strictEqual(res4.overdueTasks.length, 0);
  assert.deepStrictEqual(getDismissedSignaturesFromDb(), [], 'Dismissal state should be cleared when 0 overdue tasks remain');

  // Test 5: Dismissal hides the alert without changing task data
  console.log('Test 5: Dismissal hides the alert without changing task data...');
  insertTask({ id: 'task-dismiss-me', title: 'Preserve my data untouched', due_date: '2020-02-01', due_time: '10:00' });
  controller.evaluate();
  assert.strictEqual(bannerVisible, true, 'Banner should be shown for task-dismiss-me');

  // User dismisses
  controller.dismiss();
  assert.strictEqual(bannerVisible, false, 'Banner must be hidden upon dismissal');
  assert.strictEqual(hideBannerCalls, 2, 'onHideBanner should be called');

  // Verify task data in database was NOT completed, deleted, or altered
  const taskRow = db.exec(`SELECT title, due_date, completed FROM tasks WHERE id = 'task-dismiss-me'`);
  assert.strictEqual(taskRow[0].values[0][0], 'Preserve my data untouched', 'Title must remain unchanged');
  assert.strictEqual(taskRow[0].values[0][1], '2020-02-01', 'Due date must remain unchanged');
  assert.strictEqual(taskRow[0].values[0][2], 0, 'Task must NOT be marked completed');

  // Test 6: A dismissed alert does not reopen on every refresh
  console.log('Test 6: A dismissed alert does not reopen on every refresh...');
  const currentShowCount = showBannerCalls.length;
  for (let i = 0; i < 10; i++) {
    const refreshRes = controller.evaluate();
    assert.strictEqual(refreshRes.isVisible, false, `Refresh ${i} should keep banner dismissed`);
    assert.strictEqual(refreshRes.hasNewOverdue, false);
  }
  assert.strictEqual(showBannerCalls.length, currentShowCount, 'showBanner must never be called during refreshes of dismissed alert');

  // Test 7: A newly overdue task can trigger a new alert
  console.log('Test 7: A newly overdue task can trigger a new alert...');
  insertTask({ id: 'task-brand-new-overdue', title: 'Brand new overdue task', due_date: '2020-03-01', due_time: '11:00' });
  const res7 = controller.evaluate();
  assert.strictEqual(res7.isVisible, true, 'New alert must be triggered for genuinely new overdue task');
  assert.strictEqual(res7.hasNewOverdue, true);
  assert.strictEqual(bannerVisible, true, 'Banner must become visible again');
  // Check that showBanner was called with both tasks
  assert.strictEqual(showBannerCalls.length, currentShowCount + 1);

  // Test 8: Snoozing and rescheduling update the alert correctly
  console.log('Test 8: Snoozing and rescheduling update the alert correctly...');
  // Reschedule task-brand-new-overdue to 2099 (future date, so it is no longer overdue)
  db.run(`UPDATE tasks SET due_date = '2099-01-01', due_time = '10:00' WHERE id = 'task-brand-new-overdue'`);
  // Dismiss task-dismiss-me
  controller.dismiss();
  assert.strictEqual(bannerVisible, false);

  // Now snooze/reschedule task-dismiss-me to tomorrow: it leaves the overdue set
  db.run(`UPDATE tasks SET due_date = '2099-01-01', due_time = '12:00' WHERE id = 'task-dismiss-me'`);
  controller.evaluate();
  assert.deepStrictEqual(getDismissedSignaturesFromDb(), [], 'Obsolete signatures should be pruned');

  // Now set task-dismiss-me back to past: it becomes newly overdue with a new transition
  db.run(`UPDATE tasks SET due_date = '2020-05-01', due_time = '09:00' WHERE id = 'task-dismiss-me'`);
  const res8 = controller.evaluate();
  assert.strictEqual(res8.hasNewOverdue, true, 'Rescheduled past task triggers overdue alert');
  assert.strictEqual(bannerVisible, true, 'Banner appears for rescheduled task');

  // Test 9: App restart and database initialization preserve the intended behavior
  console.log('Test 9: App restart and database initialization preserve behavior...');
  controller.dismiss();
  assert.strictEqual(bannerVisible, false);
  const dismissedBeforeRestart = getDismissedSignaturesFromDb();
  assert(dismissedBeforeRestart.length > 0, 'Dismissed signatures must be in database');

  // Simulate app restart by exporting DB to buffer and reloading in fresh database instance
  const exported = db.export();
  const reloadedDb = createTestDb(new Uint8Array(exported));

  // Verify reloaded database has the exact same dismissed signatures
  const reloadedRes = reloadedDb.exec(`SELECT value FROM settings WHERE key = 'dismissed_overdue_signatures'`);
  assert(reloadedRes[0] && reloadedRes[0].values[0], 'Settings table must retain dismissed signatures');
  const reloadedSignatures = JSON.parse(String(reloadedRes[0].values[0][0]));
  assert.deepStrictEqual(reloadedSignatures, dismissedBeforeRestart, 'Dismissed signatures survive app restart');

  // Construct fresh controller for the reloaded database
  let reloadedBannerVisible = false;
  let reloadedShowBannerCalls = 0;
  const reloadedController = new OverdueController({
    getTasks: () => {
      const res = reloadedDb.exec(`SELECT id, title, description, due_date, due_time, priority, category, completed, completed_at, recurrence, created_at, updated_at FROM tasks`);
      if (!res[0]) return [];
      return res[0].values.map((row: SqlValue[]): Task => ({
        id: String(row[0]),
        title: String(row[1]),
        description: String(row[2] || ''),
        due_date: String(row[3]),
        due_time: row[4] ? String(row[4]) : null,
        priority: String(row[5]) as TaskPriority,
        category: String(row[6] || ''),
        completed: Number(row[7]) === 1,
        completed_at: row[8] ? String(row[8]) : null,
        recurrence: String(row[9]) as TaskRecurrence,
        created_at: String(row[10]),
        updated_at: String(row[11]),
      }));
    },
    getDismissedSignatures: () => {
      const res = reloadedDb.exec(`SELECT value FROM settings WHERE key = 'dismissed_overdue_signatures'`);
      if (res[0] && res[0].values[0]) return JSON.parse(String(res[0].values[0][0]));
      return [];
    },
    saveDismissedSignatures: (sigs) => {
      reloadedDb.run(`INSERT INTO settings (key, value) VALUES ('dismissed_overdue_signatures', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [JSON.stringify(sigs)]);
    },
    onShowBanner: () => {
      reloadedBannerVisible = true;
      reloadedShowBannerCalls++;
    },
    onUpdateBanner: () => {},
    onHideBanner: () => {
      reloadedBannerVisible = false;
    },
    isBannerVisible: () => reloadedBannerVisible,
  });

  // Evaluate on startup
  const startupRes = reloadedController.evaluate();
  assert.strictEqual(startupRes.isVisible, false, 'On restart, dismissed banner must NOT reappear');
  assert.strictEqual(reloadedShowBannerCalls, 0, 'No banner or notification should be shown on restart for dismissed tasks');

  // Test 10: Repeated events do not create duplicate windows or listeners
  console.log('Test 10: Repeated events do not create duplicate windows or listeners...');
  // Insert a new task to cause banner to show
  reloadedDb.run(
    `INSERT INTO tasks (id, title, description, due_date, due_time, priority, category, completed, recurrence, created_at, updated_at)
     VALUES ('rapid-task-1', 'Rapid event test', '', '2020-01-01', '10:00', 'urgent', 'Work', 0, 'none', '2020-01-01', '2020-01-01')`
  );

  // Trigger rapid repeated evaluations
  for (let i = 0; i < 20; i++) {
    reloadedController.evaluate();
  }
  assert.strictEqual(reloadedShowBannerCalls, 1, 'Rapid evaluations must only call showBanner once for the transition');
  assert.strictEqual(reloadedBannerVisible, true);

  // Test 11: Task signature stability
  console.log('Test 11: Task signature uniqueness and stability...');
  const sigA = getTaskOverdueSignature({ id: 'task-a', due_date: '2026-10-29', due_time: '10:00' });
  const sigA2 = getTaskOverdueSignature({ id: 'task-a', due_date: '2026-10-29', due_time: '10:00' });
  const sigB = getTaskOverdueSignature({ id: 'task-a', due_date: '2026-10-29', due_time: '11:00' });
  const sigC = getTaskOverdueSignature({ id: 'task-a', due_date: '2026-10-30', due_time: '10:00' });
  assert.strictEqual(sigA, sigA2, 'Identical task state must produce identical signature');
  assert.notStrictEqual(sigA, sigB, 'Snoozed time must produce different signature');
  assert.notStrictEqual(sigA, sigC, 'Rescheduled date must produce different signature');

  console.log('✅ ALL 11 OVERDUE BANNER SPECIFICATION TESTS PASSED SUCCESSFULLY!');
}

runOverdueBannerTests().catch((err) => {
  console.error('❌ Overdue banner test failed:', err);
  process.exit(1);
});
