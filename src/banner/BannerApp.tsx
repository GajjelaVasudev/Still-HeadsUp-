import React, { useState, useEffect, useCallback } from 'react';
import { Task, AppSettings } from '../types';
import { isTaskOverdue, formatDueTime, getRelativeTimeRemaining } from '../utils/dateUtils';

export const BannerApp: React.FC = () => {
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [snoozeMenuTaskId, setSnoozeMenuTaskId] = useState<string | null>(null);

  const fetchOverdue = useCallback(async () => {
    if (window.electronAPI?.getOverdueTasks) {
      try {
        const tasks = await window.electronAPI.getOverdueTasks();
        setOverdueTasks(tasks);
      } catch (err) {
        console.error('Failed to get overdue tasks in banner:', err);
      }
    } else if (window.electronAPI?.getTasks) {
      try {
        const all = await window.electronAPI.getTasks();
        const overdue = all.filter((t) => !t.completed && isTaskOverdue(t.due_date, t.due_time));
        setOverdueTasks(overdue);
      } catch (err) {
        console.error('Failed to load tasks in banner:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchOverdue();

    // Listen for push updates from main process overdue controller
    let unsubOverdue: (() => void) | undefined;
    if (window.electronAPI?.onOverdueTasksUpdated) {
      unsubOverdue = window.electronAPI.onOverdueTasksUpdated((updatedTasks) => {
        setOverdueTasks(updatedTasks);
      });
    }

    // Also listen for general tasks-changed broadcast
    let unsubTasks: (() => void) | undefined;
    if (window.electronAPI?.onTasksChanged) {
      unsubTasks = window.electronAPI.onTasksChanged(() => {
        fetchOverdue();
      });
    }

    // Apply theme preference
    if (window.electronAPI?.getSettings) {
      window.electronAPI.getSettings().then((s: AppSettings) => {
        if (s.theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      });
    }

    let unsubSettings: (() => void) | undefined;
    if (window.electronAPI?.onSettingsChanged) {
      unsubSettings = window.electronAPI.onSettingsChanged((s: AppSettings) => {
        if (s.theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
        }
      });
    }

    return () => {
      unsubOverdue?.();
      unsubTasks?.();
      unsubSettings?.();
    };
  }, [fetchOverdue]);

  const handleDismiss = async () => {
    if (window.electronAPI?.dismissOverdueBanner) {
      await window.electronAPI.dismissOverdueBanner();
    }
  };

  const handleOpenManager = async () => {
    if (window.electronAPI?.openManager) {
      await window.electronAPI.openManager();
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    if (window.electronAPI?.toggleTaskComplete) {
      await window.electronAPI.toggleTaskComplete(taskId);
      // Main process will broadcast tasks-changed & overdue-tasks-updated
    }
  };

  const handleSnooze = async (taskId: string, minutes: number) => {
    if (window.electronAPI?.snoozeTask) {
      await window.electronAPI.snoozeTask(taskId, minutes);
      setSnoozeMenuTaskId(null);
    }
  };

  const displayedTasks = overdueTasks.slice(0, 3);
  const remainingCount = Math.max(0, overdueTasks.length - 3);

  return (
    <div className="w-screen h-screen flex items-center justify-center p-1 bg-transparent select-none">
      {/* Banner Floating Card */}
      <div
        id="overdue-banner-card"
        className="w-full h-full rounded-2xl bg-surface-container-low/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden relative border border-outline-variant/30 text-on-surface shadow-2xl transition-all duration-150 p-space-sm"
        style={{
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.75), inset 0 1px 1px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Subtle Ambient Micro Glows */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-error/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-1 border-b border-outline-variant/15">
          {/* Left Brand & Overdue Tag */}
          <div className="flex items-center gap-space-xs">
            {/* App Mark */}
            <div
              className="flex items-center gap-1 cursor-pointer hover:opacity-85 transition-opacity"
              onClick={handleOpenManager}
              title="Open Task Manager"
            >
              <span className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface lowercase">
                still
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#c8ccff]" />
            </div>

            <div className="w-px h-3 bg-outline-variant/30 mx-1" />

            {/* Overdue Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-error-container/20 border border-error/30 text-error">
              <span className="w-1.5 h-1.5 rounded-full bg-error" />
              <span className="font-mono text-micro font-semibold tracking-wide uppercase">
                {overdueTasks.length} {overdueTasks.length === 1 ? 'Overdue Task' : 'Overdue Tasks'}
              </span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              id="banner-view-tasks"
              onClick={handleOpenManager}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-primary hover:text-primary-fixed hover:bg-surface-container text-xs font-medium transition-colors"
              title="Open Full Task Hub"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span>View tasks</span>
            </button>

            <button
              type="button"
              id="banner-dismiss-btn"
              onClick={handleDismiss}
              aria-label="Dismiss overdue reminder"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Dismiss overdue reminder"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* Overdue Tasks List */}
        <div className="flex-1 flex flex-col justify-center gap-1 py-1 overflow-visible">
          {displayedTasks.map((task) => (
            <div
              key={task.id}
              className="group/row relative flex items-center justify-between px-2 py-1 rounded-lg hover:bg-surface-container transition-colors duration-150"
            >
              {/* Left Checkbox & Title & Meta */}
              <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                {/* Inline Complete Action */}
                <button
                  type="button"
                  onClick={() => handleToggleComplete(task.id)}
                  className="w-4 h-4 rounded-[4px] bg-transparent flex items-center justify-center transition-colors group-hover/row:bg-surface-container-high flex-shrink-0"
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(255, 180, 171, 0.6)',
                  }}
                  title="Mark as completed"
                  aria-label={`Mark "${task.title}" as completed`}
                >
                  <span className="material-symbols-outlined text-[12px] text-surface-container-lowest opacity-0 group-hover/row:opacity-40">
                    check
                  </span>
                </button>

                {/* Title */}
                <span className="font-body-medium text-body-medium text-on-surface truncate font-medium">
                  {task.title}
                </span>

                {/* Priority */}
                <span className="font-micro text-micro px-1 py-[0.5px] rounded bg-error-container/30 text-error font-medium flex-shrink-0">
                  {task.priority === 'urgent' ? 'P1' : task.priority.toUpperCase()}
                </span>

                {/* Category if any */}
                {task.category && (
                  <span className="font-micro text-micro px-1.5 py-[0.5px] rounded bg-surface-container-high text-on-surface-variant truncate max-w-[120px] flex-shrink-0">
                    {task.category}
                  </span>
                )}
              </div>

              {/* Right Due & Relative Duration & Snooze */}
              <div className="flex items-center gap-2 relative flex-shrink-0">
                <span className="text-error font-caption text-caption font-medium flex items-center gap-1 font-mono">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  <span>{getRelativeTimeRemaining(task.due_date, task.due_time)}</span>
                  {task.due_time && (
                    <span className="text-outline font-sans text-micro">
                      ({formatDueTime(task.due_time)})
                    </span>
                  )}
                </span>

                {/* Snooze Trigger */}
                <button
                  type="button"
                  onClick={() =>
                    setSnoozeMenuTaskId(snoozeMenuTaskId === task.id ? null : task.id)
                  }
                  className="w-5 h-5 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  title="Snooze reminder"
                  aria-label="Snooze reminder"
                >
                  <span className="material-symbols-outlined text-[13px]">snooze</span>
                </button>

                {/* Snooze Popover */}
                {snoozeMenuTaskId === task.id && (
                  <div className="absolute right-0 top-6 w-28 bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 text-micro font-micro">
                    <button
                      onClick={() => handleSnooze(task.id, 60)}
                      className="px-2 py-1 rounded text-left text-on-surface hover:bg-surface-container-highest transition-colors"
                    >
                      +1 Hour
                    </button>
                    <button
                      onClick={() => handleSnooze(task.id, 180)}
                      className="px-2 py-1 rounded text-left text-on-surface hover:bg-surface-container-highest transition-colors"
                    >
                      +3 Hours
                    </button>
                    <button
                      onClick={() => handleSnooze(task.id, 1440)}
                      className="px-2 py-1 rounded text-left text-on-surface hover:bg-surface-container-highest transition-colors"
                    >
                      Tomorrow
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Bar for +N more tasks */}
        {remainingCount > 0 && (
          <div className="pt-1 border-t border-outline-variant/15 flex items-center justify-between text-caption font-caption text-outline">
            <span className="text-on-surface-variant font-medium">
              + {remainingCount} more overdue {remainingCount === 1 ? 'task' : 'tasks'}
            </span>
            <button
              type="button"
              onClick={handleOpenManager}
              className="text-primary hover:text-primary-fixed hover:underline flex items-center gap-1 font-medium text-xs transition-colors"
            >
              <span>Open Task Manager</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
