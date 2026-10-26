import React, { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Task } from '../types';
import { formatWidgetDate, formatDueTime, getRelativeTimeRemaining } from '../utils/dateUtils';
import { TaskModal } from '../components/TaskModal';
import { SettingsModal } from '../components/SettingsModal';

export const WidgetApp: React.FC = () => {
  const {
    tasks,
    settings,
    overdueTasks,
    todayTasks,
    completedTodayTasks,
    addTask,
    updateTaskItem,
    toggleComplete,
    removeTask,
    snooze,
    updateSettings,
  } = useTasks();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [snoozeMenuTaskId, setSnoozeMenuTaskId] = useState<string | null>(null);

  const totalFocusTasks = overdueTasks.length + todayTasks.length + completedTodayTasks.length;
  const completedCount = completedTodayTasks.length;
  const formattedCount = `${String(completedCount).padStart(2, '0')} / ${String(
    totalFocusTasks || 0
  ).padStart(2, '0')}`;

  // Keyboard shortcut for quick add (N) and pin toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);
      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingTask(null);
        setIsTaskModalOpen(true);
      } else if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setSnoozeMenuTaskId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTogglePin = async () => {
    const newAlwaysOnTop = !settings.always_on_top;
    if (window.electronAPI) {
      await window.electronAPI.setAlwaysOnTop(newAlwaysOnTop);
    } else {
      await updateSettings({ always_on_top: newAlwaysOnTop });
    }
  };

  const handleOpenManager = () => {
    if (window.electronAPI) {
      window.electronAPI.openManager();
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center p-2 bg-transparent">
      {/* Floating Widget Card Container */}
      <div
        id="floating-widget"
        className="w-full h-full rounded-2xl bg-surface-container-low/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden relative select-none border border-outline-variant/30 text-on-surface"
        style={{
          boxShadow: '0 24px 60px -8px rgba(0,0,0,0.85), inset 0 1px 1px 0 rgba(255,255,255,0.06)',
          opacity: settings.widget_opacity || 0.95,
        }}
      >
        {/* Internal Micro Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        {/* Header with Drag Handle */}
        <div className="flex flex-col">
          {/* Discreet Drag Handle Bar */}
          <div className="w-full pt-2 pb-1 flex justify-center items-center cursor-grab active:cursor-grabbing drag-region">
            <div className="w-9 h-1 rounded-full bg-surface-container-highest hover:bg-outline-variant transition-colors" />
          </div>

          {/* Header Controls Row */}
          <div className="px-space-md py-space-xs flex items-center justify-between no-drag">
            {/* Left Brand Mark */}
            <div
              className="flex items-center gap-space-xs cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleOpenManager}
              title="Click to open Full Task Manager"
            >
              <span className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface lowercase">
                still
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#c8ccff]" />
            </div>

            {/* Date Badge */}
            <div className="flex items-center gap-space-xs">
              <span className="font-label-kbd text-label-kbd tracking-wider uppercase text-outline font-medium">
                {formatWidgetDate()}
              </span>
            </div>

            {/* Metrics Pill & Controls */}
            <div className="flex items-center gap-space-xs">
              <span className="font-label-kbd text-label-kbd text-on-primary-container bg-primary-container/20 px-space-xs py-[2px] rounded-full font-mono font-medium">
                {formattedCount}
              </span>

              {/* Pin to Desktop Toggle */}
              <button
                type="button"
                aria-label="Toggle pin to top"
                onClick={handleTogglePin}
                className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                  settings.always_on_top
                    ? 'text-primary hover:bg-surface-container-high'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container-high'
                }`}
                title={settings.always_on_top ? 'Pinned: Always on top' : 'Unpinned: Normal window'}
              >
                <span
                  className={`material-symbols-outlined text-[15px] ${
                    settings.always_on_top ? 'fill' : ''
                  }`}
                >
                  push_pin
                </span>
              </button>

              {/* Overflow Menu Options */}
              <div className="relative">
                <button
                  type="button"
                  aria-label="Window options"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">more_horiz</span>
                </button>

                {isMenuOpen && (
                  <div
                    className="absolute right-0 top-7 w-48 bg-surface-container rounded-xl border border-outline-variant/30 shadow-2xl p-1 z-50 flex flex-col gap-0.5 text-caption font-body-default"
                    style={{
                      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
                    }}
                  >
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleOpenManager();
                      }}
                      className="w-full px-space-sm py-1.5 rounded-lg text-left text-on-surface hover:bg-surface-container-high flex items-center gap-space-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">
                        open_in_new
                      </span>
                      <span>Task Manager</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className="w-full px-space-sm py-1.5 rounded-lg text-left text-on-surface hover:bg-surface-container-high flex items-center gap-space-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px] text-outline">
                        settings
                      </span>
                      <span>Preferences...</span>
                    </button>
                    <div className="h-[1px] bg-outline-variant/20 my-1" />
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (window.electronAPI) window.electronAPI.closeWindow();
                      }}
                      className="w-full px-space-sm py-1.5 rounded-lg text-left text-outline hover:text-error hover:bg-error-container/20 flex items-center gap-space-xs transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">visibility_off</span>
                      <span>Hide Widget</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Subtitle */}
          <div className="px-space-md pt-space-xs pb-space-2xs flex items-center justify-between no-drag">
            <span className="font-micro text-micro font-semibold uppercase tracking-wider text-outline">
              Your Focus
            </span>
            <span className="font-micro text-micro text-outline font-mono">
              {overdueTasks.length} Overdue · {todayTasks.length} Today
            </span>
          </div>
        </div>

        {/* Task List Body */}
        <div className="flex-1 overflow-y-auto px-space-xs py-space-2xs flex flex-col gap-space-2xs no-drag">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="px-space-sm pt-space-2xs flex items-center gap-space-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-error" />
                <span className="font-micro text-micro font-bold uppercase tracking-wider text-error">
                  Overdue
                </span>
              </div>

              {overdueTasks.map((task) => (
                <div
                  key={task.id}
                  className="group/row relative flex items-center justify-between px-space-sm py-space-xs rounded-lg hover:bg-surface-container transition-colors duration-150"
                >
                  <div className="flex items-center gap-space-sm min-w-0 flex-1">
                    {/* Overdue Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleComplete(task.id)}
                      className="w-4 h-4 rounded-[4px] bg-transparent flex items-center justify-center transition-colors group-hover/row:bg-surface-container-high flex-shrink-0"
                      style={{
                        boxShadow: 'inset 0 0 0 1px rgba(255, 180, 171, 0.6)',
                      }}
                      title="Mark as completed"
                    >
                      <span className="material-symbols-outlined text-[12px] text-surface-container-lowest opacity-0 group-hover/row:opacity-40">
                        check
                      </span>
                    </button>

                    {/* Task Title & Meta */}
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-body-medium text-body-medium text-on-surface truncate">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-space-xs">
                        <span className="font-caption text-caption text-error font-medium">
                          {getRelativeTimeRemaining(task.due_date, task.due_time)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-outline-variant" />
                        <span className="font-micro text-micro px-1 py-[1px] rounded bg-error-container/30 text-error font-medium">
                          {task.priority === 'urgent'
                            ? 'P1'
                            : task.priority.toUpperCase()}
                        </span>
                        {task.category && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-outline-variant" />
                            <span className="font-micro text-micro text-on-surface-variant">
                              {task.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Hover Shortcuts */}
                  <div className="flex items-center gap-space-2xs opacity-0 group-hover/row:opacity-100 transition-opacity relative">
                    <button
                      type="button"
                      onClick={() =>
                        setSnoozeMenuTaskId(snoozeMenuTaskId === task.id ? null : task.id)
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                      title="Snooze"
                    >
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(task);
                        setIsTaskModalOpen(true);
                      }}
                      className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>

                    {/* Snooze Popover */}
                    {snoozeMenuTaskId === task.id && (
                      <div className="absolute right-0 top-7 w-28 bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 text-micro font-micro">
                        <button
                          onClick={() => {
                            snooze(task.id, 60);
                            setSnoozeMenuTaskId(null);
                          }}
                          className="px-2 py-1 rounded text-left text-on-surface hover:bg-surface-container-highest transition-colors"
                        >
                          +1 Hour
                        </button>
                        <button
                          onClick={() => {
                            snooze(task.id, 180);
                            setSnoozeMenuTaskId(null);
                          }}
                          className="px-2 py-1 rounded text-left text-on-surface hover:bg-surface-container-highest transition-colors"
                        >
                          +3 Hours
                        </button>
                        <button
                          onClick={() => {
                            snooze(task.id, 1440);
                            setSnoozeMenuTaskId(null);
                          }}
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
          )}

          {/* Today Group */}
          <div className="flex flex-col gap-1">
            <div className="px-space-sm pt-space-xs flex items-center justify-between">
              <span className="font-micro text-micro font-bold uppercase tracking-wider text-outline">
                Today
              </span>
              <span className="font-label-kbd text-label-kbd text-outline font-mono">
                Until 23:59
              </span>
            </div>

            {todayTasks.length === 0 && overdueTasks.length === 0 && (
              <div className="px-space-md py-6 text-center text-caption text-outline flex flex-col items-center gap-space-xs">
                <span className="material-symbols-outlined text-[24px] text-secondary">
                  check_circle
                </span>
                <span>All focus tasks completed!</span>
              </div>
            )}

            {todayTasks.map((task) => (
              <div
                key={task.id}
                className="group/row relative flex items-center justify-between px-space-sm py-space-xs rounded-lg hover:bg-surface-container transition-colors duration-150"
              >
                <div className="flex items-center gap-space-sm min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleComplete(task.id)}
                    className="w-4 h-4 rounded-[4px] bg-transparent flex items-center justify-center transition-colors group-hover/row:bg-surface-container-high flex-shrink-0"
                    style={{
                      boxShadow: 'inset 0 0 0 1px rgba(144, 143, 156, 0.4)',
                    }}
                    title="Mark as completed"
                  >
                    <span className="material-symbols-outlined text-[12px] text-surface-container-lowest opacity-0 group-hover/row:opacity-40">
                      check
                    </span>
                  </button>

                  <div className="flex flex-col min-w-0">
                    <span className="font-body-medium text-body-medium text-on-surface truncate">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-space-xs">
                      {task.due_time && (
                        <span className="font-caption text-caption text-outline font-mono">
                          {formatDueTime(task.due_time)}
                        </span>
                      )}
                      {task.category && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-outline-variant" />
                          <span className="font-micro text-micro px-1 py-[0.5px] rounded bg-secondary-container/30 text-secondary font-medium">
                            {task.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Due Tag & Hover Actions */}
                <div className="flex items-center gap-space-2xs relative">
                  <span className="font-label-kbd text-label-kbd text-outline font-mono group-hover/row:hidden">
                    {getRelativeTimeRemaining(task.due_date, task.due_time)}
                  </span>
                  <div className="hidden group-hover/row:flex items-center gap-space-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSnoozeMenuTaskId(snoozeMenuTaskId === task.id ? null : task.id)
                      }
                      className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                      title="Snooze"
                    >
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(task);
                        setIsTaskModalOpen(true);
                      }}
                      className="w-6 h-6 rounded flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                  </div>

                  {/* Snooze Popover */}
                  {snoozeMenuTaskId === task.id && (
                    <div className="absolute right-0 top-7 w-28 bg-surface-container-high border border-outline-variant/30 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 text-micro font-micro">
                      <button
                        onClick={() => {
                          snooze(task.id, 60);
                          setSnoozeMenuTaskId(null);
                        }}
                        className="px-2 py-1 rounded text-left text-on-surface hover:bg-surface-container-highest transition-colors"
                      >
                        +1 Hour
                      </button>
                      <button
                        onClick={() => {
                          snooze(task.id, 180);
                          setSnoozeMenuTaskId(null);
                        }}
                        className="px-2 py-1 rounded text-left text-on-surface hover:bg-surface-container-highest transition-colors"
                      >
                        +3 Hours
                      </button>
                      <button
                        onClick={() => {
                          snooze(task.id, 1440);
                          setSnoozeMenuTaskId(null);
                        }}
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

          {/* Recently Completed items in widget */}
          {completedTodayTasks.length > 0 && (
            <div className="flex flex-col gap-1 pt-space-xs opacity-50 hover:opacity-80 transition-opacity">
              <span className="px-space-sm font-micro text-micro font-medium uppercase tracking-wider text-outline">
                Completed ({completedTodayTasks.length})
              </span>
              {completedTodayTasks.slice(0, 2).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-space-sm py-1 rounded-lg"
                >
                  <div className="flex items-center gap-space-sm min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleComplete(task.id)}
                      className="w-4 h-4 rounded-[4px] bg-primary flex items-center justify-center flex-shrink-0"
                      title="Undo completion"
                    >
                      <span className="material-symbols-outlined text-[12px] text-on-primary font-bold">
                        check
                      </span>
                    </button>
                    <span className="font-body-default text-body-default text-outline line-through truncate">
                      {task.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Widget Interactive Footer */}
        <div className="p-space-xs bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-between rounded-b-2xl no-drag border-t border-outline-variant/15">
          {/* Left Button: + Add task */}
          <button
            type="button"
            id="add-task-trigger"
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg text-primary hover:text-primary-fixed hover:bg-surface-container transition-colors group/btn active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px] transition-transform group-hover/btn:scale-110">
              add
            </span>
            <span className="font-title-sm text-title-sm font-medium">Add task</span>
            <kbd className="font-label-kbd text-label-kbd text-outline px-1.5 py-[1px] rounded bg-surface-container group-hover/btn:bg-surface-container-high group-hover/btn:text-on-surface transition-colors font-mono">
              N
            </kbd>
          </button>

          {/* Right Button: View all tasks */}
          <button
            type="button"
            id="view-all-trigger"
            onClick={handleOpenManager}
            className="flex items-center gap-space-2xs px-space-sm py-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors active:scale-95"
            title="Open Full Task Hub"
          >
            <span className="font-title-sm text-title-sm font-medium">View all</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Task Modal for Add/Edit */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        initialTask={editingTask}
        onSave={async (taskData) => {
          if (editingTask) {
            await updateTaskItem(editingTask.id, taskData);
          } else {
            await addTask(taskData);
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />
    </div>
  );
};
