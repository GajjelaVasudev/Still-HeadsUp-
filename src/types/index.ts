export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  due_time: string | null; // HH:MM or null
  priority: TaskPriority;
  category: string;
  completed: boolean;
  completed_at: string | null;
  recurrence: TaskRecurrence;
  created_at: string;
  updated_at: string;
}

export interface ProjectCategory {
  id: string;
  name: string;
  color: string;
}

export type WidgetVisibilityMode = 'desktop' | 'always-on-top' | 'hidden';

export interface AppSettings {
  launch_at_startup: boolean;
  always_on_top: boolean;
  widget_opacity: number; // 0.5 to 1.0
  widget_visibility_mode: WidgetVisibilityMode;
  widget_position: { x: number; y: number } | null;
  widget_size: { width: number; height: number };
  close_to_tray: boolean;
  sound_enabled: boolean;
  theme: 'dark' | 'light';
}

export type FilterView = 'today' | 'upcoming' | 'overdue' | 'all' | 'completed';

export interface ElectronAPI {
  getTasks: () => Promise<Task[]>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  toggleTaskComplete: (id: string) => Promise<Task>;
  deleteTask: (id: string) => Promise<boolean>;
  snoozeTask: (id: string, minutes: number) => Promise<Task>;
  
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  
  openManager: () => Promise<void>;
  toggleWidget: () => Promise<void>;
  setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
  setWidgetOpacity: (opacity: number) => Promise<void>;
  
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  getOverdueTasks: () => Promise<Task[]>;
  dismissOverdueBanner: () => Promise<void>;
  
  onTasksChanged: (callback: () => void) => () => void;
  onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void;
  onOverdueTasksUpdated: (callback: (tasks: Task[]) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
