import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import initSqlJs, { Database, SqlValue } from 'sql.js';
import { Task, AppSettings, TaskPriority, TaskRecurrence } from '../src/types';
import { getTodayDateString, getCurrentTimeString, calculateNextOccurrence } from '../src/utils/dateUtils';

let db: Database | null = null;
let dbFilePath: string = '';

const DEFAULT_SETTINGS: AppSettings = {
  launch_at_startup: true,
  always_on_top: true,
  widget_opacity: 0.95,
  widget_visibility_mode: 'always-on-top',
  widget_position: null,
  widget_size: { width: 380, height: 480 },
  close_to_tray: true,
  sound_enabled: true,
  theme: 'dark',
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  dbFilePath = path.join(userDataPath, 'still_tasks.db');

  const SQL = await initSqlJs({
    locateFile: (file) => {
      const candidates = [
        path.join(__dirname, '../node_modules/sql.js/dist', file),
        path.join(app.getAppPath(), 'node_modules/sql.js/dist', file),
        path.resolve(process.cwd(), 'node_modules/sql.js/dist', file),
        path.join(process.resourcesPath || '', 'node_modules/sql.js/dist', file),
        path.join(__dirname, file),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) return c;
      }
      return file;
    },
  });

  if (fs.existsSync(dbFilePath)) {
    try {
      const fileBuffer = fs.readFileSync(dbFilePath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Failed to load existing database file, creating fresh one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  createSchema();
  seedInitialData();
  persistDatabase();

  return db;
}

function persistDatabase(): void {
  if (!db || !dbFilePath) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbFilePath, buffer);
  } catch (err) {
    console.error('Error persisting database to disk:', err);
  }
}

function createSchema(): void {
  if (!db) return;

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

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );
  `);
}

function seedInitialData(): void {
  if (!db) return;

  const check = db.exec('SELECT COUNT(*) as count FROM tasks');
  const count = check[0]?.values[0]?.[0] as number;

  if (count === 0) {
    const today = getTodayDateString();
    
    // Calculate yesterday for overdue demo
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
    
    // Calculate tomorrow
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getDate()).padStart(2, '0')}`;

    const now = new Date().toISOString();

    const sampleTasks: Array<Omit<Task, 'id' | 'created_at' | 'updated_at'> & { created_at?: string }> = [
      {
        title: 'Submit the assignment',
        description: 'Complete research writeup and attach bibliography',
        due_date: yesterday,
        due_time: '23:59',
        priority: 'high',
        category: 'Academics',
        completed: false,
        completed_at: null,
        recurrence: 'none',
      },
      {
        title: 'Finish Data Science lab',
        description: 'Need to run final cross-validation metrics and export ROC curves',
        due_date: today,
        due_time: '19:00',
        priority: 'medium',
        category: 'Data Science',
        completed: false,
        completed_at: null,
        recurrence: 'none',
      },
      {
        title: 'Practice linked lists & recursion',
        description: 'Solve 3 medium LeetCode problems on pointer manipulation',
        due_date: today,
        due_time: '20:30',
        priority: 'low',
        category: 'Algorithms',
        completed: false,
        completed_at: null,
        recurrence: 'daily',
      },
      {
        title: 'Review Spring Boot architecture notes',
        description: 'Prepare for Friday system architecture evaluation',
        due_date: today,
        due_time: '21:00',
        priority: 'medium',
        category: 'Engineering',
        completed: false,
        completed_at: null,
        recurrence: 'none',
      },
      {
        title: 'Morning standup sync with team',
        description: 'Presented progress on auth middleware and sprint goals',
        due_date: today,
        due_time: '09:30',
        priority: 'medium',
        category: 'Engineering',
        completed: true,
        completed_at: `${today}T09:30:00Z`,
        recurrence: 'daily',
      },
      {
        title: 'Review pull request #142 (Auth middleware)',
        description: 'Checked token validation logic and unit test coverage',
        due_date: today,
        due_time: '11:15',
        priority: 'high',
        category: 'Engineering',
        completed: true,
        completed_at: `${today}T11:15:00Z`,
        recurrence: 'none',
      },
      {
        title: 'Prepare system design doc',
        description: 'Outline data models and caching layer for real-time sync',
        due_date: tomorrow,
        due_time: '14:00',
        priority: 'urgent',
        category: 'Work',
        completed: false,
        completed_at: null,
        recurrence: 'none',
      },
    ];

    for (const t of sampleTasks) {
      const id = generateUUID();
      db.run(
        `INSERT INTO tasks (id, title, description, due_date, due_time, priority, category, completed, completed_at, recurrence, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          t.title,
          t.description || '',
          t.due_date,
          t.due_time,
          t.priority,
          t.category || '',
          t.completed ? 1 : 0,
          t.completed_at,
          t.recurrence,
          now,
          now,
        ]
      );
    }
  }

  // Ensure default settings exist
  for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = db.exec(`SELECT value FROM settings WHERE key = '${key}'`);
    if (!existing[0] || existing[0].values.length === 0) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(val)]);
    }
  }
}

export function getAllTasks(): Task[] {
  if (!db) return [];
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

export function createTask(taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task {
  if (!db) throw new Error('Database not initialized');
  const id = generateUUID();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO tasks (id, title, description, due_date, due_time, priority, category, completed, completed_at, recurrence, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      taskData.title,
      taskData.description || '',
      taskData.due_date,
      taskData.due_time || null,
      taskData.priority,
      taskData.category || '',
      taskData.completed ? 1 : 0,
      taskData.completed_at || null,
      taskData.recurrence || 'none',
      now,
      now,
    ]
  );

  persistDatabase();

  return {
    ...taskData,
    id,
    created_at: now,
    updated_at: now,
  };
}

export function updateTask(id: string, updates: Partial<Task>): Task {
  if (!db) throw new Error('Database not initialized');
  const existing = getTaskById(id);
  if (!existing) throw new Error(`Task with id ${id} not found`);

  const updated: Task = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  db.run(
    `UPDATE tasks SET
      title = ?,
      description = ?,
      due_date = ?,
      due_time = ?,
      priority = ?,
      category = ?,
      completed = ?,
      completed_at = ?,
      recurrence = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      updated.title,
      updated.description,
      updated.due_date,
      updated.due_time,
      updated.priority,
      updated.category,
      updated.completed ? 1 : 0,
      updated.completed_at,
      updated.recurrence,
      updated.updated_at,
      id,
    ]
  );

  persistDatabase();
  return updated;
}

export function getTaskById(id: string): Task | null {
  if (!db) return null;
  const res = db.exec(`SELECT id, title, description, due_date, due_time, priority, category, completed, completed_at, recurrence, created_at, updated_at FROM tasks WHERE id = '${id}'`);
  if (!res[0] || !res[0].values[0]) return null;

  const row = res[0].values[0];
  return {
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
  };
}

export function toggleTaskComplete(id: string): Task {
  if (!db) throw new Error('Database not initialized');
  const task = getTaskById(id);
  if (!task) throw new Error(`Task not found: ${id}`);

  const willBeCompleted = !task.completed;
  const completed_at = willBeCompleted ? new Date().toISOString() : null;

  const updated = updateTask(id, {
    completed: willBeCompleted,
    completed_at,
  });

  // If completing a recurring task, schedule the next occurrence
  if (willBeCompleted && task.recurrence && task.recurrence !== 'none') {
    const nextDate = calculateNextOccurrence(task.due_date, task.recurrence);
    createTask({
      title: task.title,
      description: task.description,
      due_date: nextDate,
      due_time: task.due_time,
      priority: task.priority,
      category: task.category,
      completed: false,
      completed_at: null,
      recurrence: task.recurrence,
    });
  }

  return updated;
}

export function deleteTask(id: string): boolean {
  if (!db) return false;
  db.run(`DELETE FROM tasks WHERE id = ?`, [id]);
  persistDatabase();
  return true;
}

export function snoozeTask(id: string, minutes: number): Task {
  const task = getTaskById(id);
  if (!task) throw new Error(`Task not found: ${id}`);

  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');

  const newDate = `${year}-${month}-${day}`;
  const newTime = `${hours}:${mins}`;

  return updateTask(id, {
    due_date: newDate,
    due_time: newTime,
  });
}

export function getSettings(): AppSettings {
  if (!db) return { ...DEFAULT_SETTINGS };
  const res = db.exec(`SELECT key, value FROM settings`);
  const settings: any = { ...DEFAULT_SETTINGS };

  if (res[0]) {
    for (const row of res[0].values) {
      const key = String(row[0]);
      const val = String(row[1]);
      try {
        settings[key] = JSON.parse(val);
      } catch {
        settings[key] = val;
      }
    }
  }

  return settings as AppSettings;
}

export function saveSettings(updates: Partial<AppSettings>): AppSettings {
  if (!db) throw new Error('Database not initialized');

  for (const [key, val] of Object.entries(updates)) {
    db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(val)]
    );
  }

  persistDatabase();
  return getSettings();
}
