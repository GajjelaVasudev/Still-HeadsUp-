import { useState, useEffect, useCallback } from 'react';
import { Task, AppSettings } from '../types';
import { isTaskOverdue, getTodayDateString } from '../utils/dateUtils';

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

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.getTasks();
        setTasks(loaded);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const loaded = await window.electronAPI.getSettings();
        setSettings(loaded);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchSettings();

    if (window.electronAPI) {
      const unsubTasks = window.electronAPI.onTasksChanged(() => {
        fetchTasks();
      });
      const unsubSettings = window.electronAPI.onSettingsChanged((newSettings) => {
        setSettings(newSettings);
      });
      return () => {
        unsubTasks();
        unsubSettings();
      };
    }
  }, [fetchTasks, fetchSettings]);

  // Periodic refresh to update overdue status every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTasks();
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  const addTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (window.electronAPI) {
      const created = await window.electronAPI.createTask(taskData);
      await fetchTasks();
      return created;
    }
    return null;
  };

  const updateTaskItem = async (id: string, updates: Partial<Task>) => {
    if (window.electronAPI) {
      const updated = await window.electronAPI.updateTask(id, updates);
      await fetchTasks();
      return updated;
    }
    return null;
  };

  const toggleComplete = async (id: string) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.toggleTaskComplete(id);
      await fetchTasks();
      return res;
    }
    return null;
  };

  const removeTask = async (id: string) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.deleteTask(id);
      await fetchTasks();
      return res;
    }
    return false;
  };

  const snooze = async (id: string, minutes: number) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.snoozeTask(id, minutes);
      await fetchTasks();
      return res;
    }
    return null;
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (window.electronAPI) {
      const res = await window.electronAPI.saveSettings(updates);
      setSettings(res);
      return res;
    }
    return null;
  };

  // Grouped task selectors
  const todayStr = getTodayDateString();

  const overdueTasks = tasks.filter((t) => !t.completed && isTaskOverdue(t.due_date, t.due_time));
  
  const todayTasks = tasks.filter(
    (t) => !t.completed && t.due_date === todayStr && !isTaskOverdue(t.due_date, t.due_time)
  );

  const upcomingTasks = tasks.filter(
    (t) => !t.completed && t.due_date > todayStr
  );

  const completedTasks = tasks.filter((t) => t.completed);

  const completedTodayTasks = tasks.filter(
    (t) => t.completed && t.completed_at && t.completed_at.startsWith(todayStr)
  );

  return {
    tasks,
    settings,
    isLoading,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    completedTasks,
    completedTodayTasks,
    addTask,
    updateTaskItem,
    toggleComplete,
    removeTask,
    snooze,
    updateSettings,
    refresh: fetchTasks,
  };
}
