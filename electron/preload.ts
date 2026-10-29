import { contextBridge, ipcRenderer } from 'electron';
import { Task, AppSettings } from '../src/types';

contextBridge.exposeInMainWorld('electronAPI', {
  getTasks: (): Promise<Task[]> => ipcRenderer.invoke('get-tasks'),
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> =>
    ipcRenderer.invoke('create-task', task),
  updateTask: (id: string, updates: Partial<Task>): Promise<Task> =>
    ipcRenderer.invoke('update-task', id, updates),
  toggleTaskComplete: (id: string): Promise<Task> =>
    ipcRenderer.invoke('toggle-task-complete', id),
  deleteTask: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-task', id),
  snoozeTask: (id: string, minutes: number): Promise<Task> =>
    ipcRenderer.invoke('snooze-task', id, minutes),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('save-settings', settings),

  openManager: (): Promise<void> => ipcRenderer.invoke('open-manager'),
  toggleWidget: (): Promise<void> => ipcRenderer.invoke('toggle-widget'),
  setAlwaysOnTop: (alwaysOnTop: boolean): Promise<void> =>
    ipcRenderer.invoke('set-always-on-top', alwaysOnTop),
  setWidgetOpacity: (opacity: number): Promise<void> =>
    ipcRenderer.invoke('set-widget-opacity', opacity),

  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('maximize-window'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('close-window'),

  getOverdueTasks: (): Promise<Task[]> => ipcRenderer.invoke('get-overdue-tasks'),
  dismissOverdueBanner: (): Promise<void> => ipcRenderer.invoke('dismiss-overdue-banner'),

  onTasksChanged: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tasks-changed', handler);
    return () => {
      ipcRenderer.removeListener('tasks-changed', handler);
    };
  },

  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const handler = (_event: any, newSettings: AppSettings) => callback(newSettings);
    ipcRenderer.on('settings-changed', handler);
    return () => {
      ipcRenderer.removeListener('settings-changed', handler);
    };
  },

  onOverdueTasksUpdated: (callback: (tasks: Task[]) => void) => {
    const handler = (_event: any, tasks: Task[]) => callback(tasks);
    ipcRenderer.on('overdue-tasks-updated', handler);
    return () => {
      ipcRenderer.removeListener('overdue-tasks-updated', handler);
    };
  },
});

