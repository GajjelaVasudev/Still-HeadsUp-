import React, { useState, useEffect, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Task, FilterView, TaskPriority } from '../types';
import {
  formatHeaderDate,
  formatDueTime,
  getRelativeTimeRemaining,
  isTaskOverdue,
  getTodayDateString,
} from '../utils/dateUtils';
import { TaskModal } from '../components/TaskModal';
import { SettingsModal } from '../components/SettingsModal';

const PROJECTS = [
  { name: 'Engineering', color: 'bg-primary-container' },
  { name: 'Academics', color: 'bg-secondary' },
  { name: 'Work', color: 'bg-tertiary' },
  { name: 'Personal', color: 'bg-outline' },
  { name: 'Data Science', color: 'bg-primary' },
  { name: 'Algorithms', color: 'bg-secondary-container' },
];

export const ManagerApp: React.FC = () => {
  const {
    tasks,
    settings,
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
  } = useTasks();

  const [activeView, setActiveView] = useState<FilterView>('today');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'title'>('time');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(false);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global keyboard shortcuts within the window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const searchInput = document.getElementById('manager-search-input');
        searchInput?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
      } else if (!isInput && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setEditingTask(null);
        setIsTaskModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const headerDateInfo = formatHeaderDate();
  const todayStr = getTodayDateString();

  // Filter tasks based on active view, project, search, and priority
  const displayedTasks = useMemo(() => {
    let list: Task[] = [];

    if (selectedProject) {
      list = tasks.filter(
        (t) => t.category?.toLowerCase() === selectedProject.toLowerCase()
      );
    } else {
      switch (activeView) {
        case 'today':
          list = tasks.filter(
            (t) =>
              (!t.completed && (t.due_date === todayStr || isTaskOverdue(t.due_date, t.due_time))) ||
              (t.completed && t.completed_at?.startsWith(todayStr))
          );
          break;
        case 'upcoming':
          list = tasks.filter((t) => !t.completed && t.due_date > todayStr);
          break;
        case 'overdue':
          list = tasks.filter((t) => !t.completed && isTaskOverdue(t.due_date, t.due_time));
          break;
        case 'completed':
          list = tasks.filter((t) => t.completed);
          break;
        case 'all':
        default:
          list = [...tasks];
          break;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }

    if (filterPriority !== 'all') {
      list = list.filter((t) => t.priority === filterPriority);
    }

    // Sort
    return list.sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder: Record<TaskPriority, number> = {
          urgent: 4,
          high: 3,
          medium: 2,
          low: 1,
        };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      // Default: sort by due date & time
      const dateA = `${a.due_date} ${a.due_time || '23:59'}`;
      const dateB = `${b.due_date} ${b.due_time || '23:59'}`;
      return dateA.localeCompare(dateB);
    });
  }, [tasks, activeView, selectedProject, searchQuery, sortBy, filterPriority, todayStr]);

  // Breakdowns for the Today view
  const todayIncomplete = displayedTasks.filter((t) => !t.completed);
  const todayCompleted = displayedTasks.filter((t) => t.completed);
  const totalInTodayView = todayIncomplete.length + todayCompleted.length;
  const progressPercent =
    totalInTodayView > 0 ? Math.round((todayCompleted.length / totalInTodayView) * 100) : 0;

  const currentOverdueGroup = displayedTasks.filter(
    (t) => !t.completed && isTaskOverdue(t.due_date, t.due_time)
  );
  const currentTodayGroup = displayedTasks.filter(
    (t) => !t.completed && !isTaskOverdue(t.due_date, t.due_time)
  );

  const getPriorityBadgeColor = (p: TaskPriority) => {
    switch (p) {
      case 'urgent':
      case 'high':
        return 'bg-tertiary-container text-tertiary-container';
      case 'medium':
        return 'bg-secondary text-secondary';
      case 'low':
      default:
        return 'bg-outline text-outline';
    }
  };

  return (
    <div className="w-screen h-screen bg-surface-container-lowest flex flex-col select-none overflow-hidden text-on-surface">
      {/* 1. Custom Frameless Title Bar */}
      <header className="h-10 bg-surface-container-low px-space-md flex items-center justify-between z-20 border-b border-outline-variant/15 drag-region">
        {/* Left: Window Icon & Title */}
        <div className="flex items-center gap-space-sm min-w-0 no-drag">
          <div className="flex items-center gap-space-xs text-primary">
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
          </div>
          <span className="font-body-medium text-body-medium text-on-surface font-semibold tracking-tight truncate">
            Still — Focus &amp; Task Hub
          </span>
          <span className="px-space-2xs py-[1px] rounded bg-surface-container text-micro font-micro uppercase tracking-wider text-outline">
            v1.2.0
          </span>
        </div>

        {/* Center: Discreet Global Search */}
        <div className="relative w-80 max-w-sm hidden md:flex items-center no-drag">
          <span className="material-symbols-outlined absolute left-space-xs text-[15px] text-outline pointer-events-none">
            search
          </span>
          <input
            id="manager-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, tags, or dates... /"
            className="w-full h-7 pl-7 pr-14 bg-surface-container rounded-lg font-caption text-caption text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-high transition-colors border border-outline-variant/20"
          />
          <div className="absolute right-space-xs flex items-center gap-space-2xs pointer-events-none">
            <kbd className="font-label-kbd text-label-kbd text-outline px-space-2xs py-[1px] bg-surface-container-highest rounded">
              Ctrl
            </kbd>
            <kbd className="font-label-kbd text-label-kbd text-outline px-space-2xs py-[1px] bg-surface-container-highest rounded">
              K
            </kbd>
          </div>
        </div>

        {/* Right: Windows Native Control Cluster */}
        <div className="flex items-center -mr-space-md h-full no-drag">
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => window.electronAPI?.minimizeWindow()}
            className="w-11 h-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">minimize</span>
          </button>
          <button
            type="button"
            aria-label="Maximize"
            onClick={() => window.electronAPI?.maximizeWindow()}
            className="w-11 h-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">crop_square</span>
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={() => window.electronAPI?.closeWindow()}
            className="w-11 h-full flex items-center justify-center text-outline hover:text-on-error hover:bg-error-container transition-colors"
            title="Hide Manager (Widget keeps running)"
          >
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      </header>

      {/* 2. Main Two-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-surface-container-low/90 flex flex-col justify-between p-space-md flex-shrink-0 border-r border-outline-variant/15">
          <div className="flex flex-col gap-space-sm overflow-y-auto pr-1">
            {/* Brand Wordmark & Version */}
            <div className="flex items-center justify-between px-space-xs pt-space-xs pb-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="font-display text-headline-md tracking-tight text-on-surface lowercase font-bold">
                  still
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container shadow-[0_0_8px_#a5aeff]" />
              </div>
              <span className="font-label-kbd text-label-kbd text-outline px-space-2xs py-[1px] bg-surface-container rounded">
                Workspace
              </span>
            </div>

            {/* Quick Add Button CTA */}
            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="w-full bg-primary-container/10 hover:bg-primary-container/20 text-primary-container rounded-lg py-space-xs px-space-sm font-body-medium text-caption flex items-center justify-between transition-all group active:scale-[0.98] border border-primary-container/20"
            >
              <span className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:rotate-90">
                  add
                </span>
                <span>New Task</span>
              </span>
              <kbd className="font-label-kbd text-label-kbd text-primary-container/70 bg-surface-container px-space-2xs rounded">
                N
              </kbd>
            </button>

            {/* Primary Navigation Items */}
            <nav className="flex flex-col gap-[2px] mt-space-xs">
              {/* Today */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('today');
                  setSelectedProject(null);
                }}
                className={`flex items-center justify-between px-space-sm py-space-xs rounded-lg font-body-medium relative transition-colors ${
                  activeView === 'today' && !selectedProject
                    ? 'bg-surface-container text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {activeView === 'today' && !selectedProject && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r" />
                )}
                <div className="flex items-center gap-space-sm">
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      activeView === 'today' && !selectedProject ? 'text-primary fill' : 'text-outline'
                    }`}
                  >
                    calendar_today
                  </span>
                  <span className="text-body-default">Today</span>
                </div>
                <span className="font-label-kbd text-label-kbd px-space-xs py-[1px] rounded bg-primary-container/20 text-primary font-medium">
                  {todayTasks.length + overdueTasks.length}
                </span>
              </button>

              {/* Upcoming */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('upcoming');
                  setSelectedProject(null);
                }}
                className={`flex items-center justify-between px-space-sm py-space-xs rounded-lg font-body-medium relative transition-colors ${
                  activeView === 'upcoming' && !selectedProject
                    ? 'bg-surface-container text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {activeView === 'upcoming' && !selectedProject && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r" />
                )}
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[16px] text-outline">
                    upcoming
                  </span>
                  <span className="text-body-default">Upcoming</span>
                </div>
                <span className="font-label-kbd text-label-kbd text-outline">
                  {upcomingTasks.length}
                </span>
              </button>

              {/* Overdue */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('overdue');
                  setSelectedProject(null);
                }}
                className={`flex items-center justify-between px-space-sm py-space-xs rounded-lg font-body-medium relative transition-colors ${
                  activeView === 'overdue' && !selectedProject
                    ? 'bg-surface-container text-tertiary-container shadow-sm'
                    : 'text-tertiary-container hover:bg-surface-container-high'
                }`}
              >
                {activeView === 'overdue' && !selectedProject && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-tertiary-container rounded-r" />
                )}
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-container">
                    error_outline
                  </span>
                  <span className="text-body-default font-body-medium">Overdue</span>
                </div>
                <span className="font-label-kbd text-label-kbd px-space-xs py-[1px] rounded bg-tertiary-container/15 text-tertiary-container font-medium">
                  {overdueTasks.length}
                </span>
              </button>

              {/* All Tasks */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('all');
                  setSelectedProject(null);
                }}
                className={`flex items-center justify-between px-space-sm py-space-xs rounded-lg font-body-medium relative transition-colors ${
                  activeView === 'all' && !selectedProject
                    ? 'bg-surface-container text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {activeView === 'all' && !selectedProject && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r" />
                )}
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[16px] text-outline">
                    inbox
                  </span>
                  <span className="text-body-default">All Tasks</span>
                </div>
                <span className="font-label-kbd text-label-kbd text-outline">{tasks.length}</span>
              </button>

              {/* Completed */}
              <button
                type="button"
                onClick={() => {
                  setActiveView('completed');
                  setSelectedProject(null);
                }}
                className={`flex items-center justify-between px-space-sm py-space-xs rounded-lg font-body-medium relative transition-colors ${
                  activeView === 'completed' && !selectedProject
                    ? 'bg-surface-container text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                {activeView === 'completed' && !selectedProject && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-secondary rounded-r" />
                )}
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[16px] text-outline">
                    check_circle
                  </span>
                  <span className="text-body-default">Completed</span>
                </div>
                <span className="font-label-kbd text-label-kbd text-outline">
                  {completedTasks.length}
                </span>
              </button>
            </nav>

            {/* Projects & Focus Section */}
            <div className="pt-space-xs mt-space-xs flex flex-col gap-space-2xs">
              <div className="flex items-center justify-between px-space-xs py-space-2xs">
                <span className="text-micro font-micro uppercase tracking-wider text-outline font-semibold">
                  Projects &amp; Focus
                </span>
                <button
                  type="button"
                  aria-label="Add project"
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="text-outline hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                </button>
              </div>

              {PROJECTS.map((proj) => {
                const count = tasks.filter(
                  (t) => t.category?.toLowerCase() === proj.name.toLowerCase()
                ).length;
                return (
                  <button
                    key={proj.name}
                    type="button"
                    onClick={() => {
                      setSelectedProject(selectedProject === proj.name ? null : proj.name);
                    }}
                    className={`flex items-center justify-between px-space-sm py-space-2xs rounded-lg transition-colors group ${
                      selectedProject === proj.name
                        ? 'bg-surface-container text-on-surface font-medium'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <span className={`w-2 h-2 rounded-full ${proj.color}`} />
                      <span className="text-caption">{proj.name}</span>
                    </div>
                    <span className="font-label-kbd text-micro text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sidebar Bottom Footer */}
          <div className="flex flex-col gap-space-xs pt-space-sm border-t border-outline-variant/15">
            {/* Desktop Widget Status Card */}
            <div
              className="p-space-xs px-space-sm rounded-lg bg-surface-container flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors"
              onClick={() => window.electronAPI?.toggleWidget()}
              title="Click to toggle Widget on/off"
            >
              <div className="flex items-center gap-space-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
                <span className="font-caption text-caption text-on-surface">Widget Docked</span>
              </div>
              <span className="text-micro font-micro uppercase tracking-wider text-secondary font-bold">
                Active
              </span>
            </div>

            {/* Settings Shortcut */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center justify-between px-space-sm py-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[16px] text-outline">
                  settings
                </span>
                <span className="font-body-default text-body-default">Settings</span>
              </div>
              <div className="flex items-center gap-space-2xs">
                <kbd className="font-label-kbd text-label-kbd text-outline px-space-2xs py-[1px] bg-surface-container rounded">
                  Ctrl
                </kbd>
                <kbd className="font-label-kbd text-label-kbd text-outline px-space-2xs py-[1px] bg-surface-container rounded">
                  ,
                </kbd>
              </div>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 bg-surface-dim flex flex-col overflow-y-auto">
          {/* Header & Progress Overview */}
          <div className="p-space-xl pb-space-lg flex flex-col gap-space-md bg-surface-dim">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-space-xs text-outline font-caption text-caption mb-space-2xs">
                  <span>{headerDateInfo.dateText}</span>
                  <span>•</span>
                  <span className="text-secondary font-medium">{headerDateInfo.weekText}</span>
                </div>
                <h1 className="font-display text-display text-on-surface tracking-tight font-bold capitalize">
                  {selectedProject ? selectedProject : activeView}
                </h1>
              </div>

              {/* Header Quick Actions */}
              <div className="flex items-center gap-space-xs">
                {/* Priority Filter */}
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="px-space-sm py-space-xs rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-caption text-caption border border-outline-variant/20 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-space-sm py-space-xs rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-caption text-caption border border-outline-variant/20 focus:outline-none cursor-pointer"
                >
                  <option value="time">Sort: Time</option>
                  <option value="priority">Sort: Priority</option>
                  <option value="title">Sort: Title</option>
                </select>

                {/* Add Task Button */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="bg-primary text-on-primary font-body-medium text-caption px-space-md py-space-xs rounded-lg flex items-center gap-space-xs hover:bg-primary-fixed-dim transition-all active:scale-[0.98] shadow-sm font-semibold"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Task</span>
                </button>
              </div>
            </div>

            {/* Sleek Minimal Progress Meter */}
            <div className="p-space-md rounded-xl bg-surface-container-low/70 border border-outline-variant/15 flex flex-col gap-space-xs">
              <div className="flex items-center justify-between text-caption">
                <div className="flex items-center gap-space-sm">
                  <span className="font-body-medium text-on-surface">
                    {todayIncomplete.length} of {totalInTodayView} tasks remaining
                  </span>
                  <span className="text-outline">•</span>
                  <span className="text-outline font-medium">
                    {overdueTasks.length > 0
                      ? `${overdueTasks.length} requiring immediate attention`
                      : 'On track with daily goals'}
                  </span>
                </div>
                <span className="font-label-kbd text-label-kbd text-primary-container font-semibold">
                  {progressPercent}% completed
                </span>
              </div>
              {/* Progress Line Bar */}
              <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-container rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Continuous Task List */}
          <div className="px-space-xl flex flex-col gap-space-lg pb-space-2xl">
            {displayedTasks.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-outline gap-space-sm">
                <span className="material-symbols-outlined text-[36px] text-secondary">
                  task_alt
                </span>
                <span className="font-body-medium text-on-surface">No tasks found in this view</span>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="text-caption text-primary hover:underline"
                >
                  Create a new task
                </button>
              </div>
            )}

            {/* GROUP 1: Overdue Tasks */}
            {currentOverdueGroup.length > 0 && (
              <section className="flex flex-col gap-space-2xs">
                <div className="flex items-center gap-space-xs py-space-xs">
                  <span className="w-2 h-2 rounded-full bg-tertiary-container" />
                  <h2 className="font-title-sm text-title-sm text-tertiary-container tracking-tight font-semibold">
                    Overdue
                  </h2>
                  <span className="text-micro font-micro text-outline uppercase px-space-2xs py-[1px] bg-surface-container rounded font-mono">
                    {currentOverdueGroup.length} {currentOverdueGroup.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                <div className="flex flex-col gap-[2px]">
                  {currentOverdueGroup.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between px-space-md py-space-sm rounded-lg bg-surface-container-low/40 hover:bg-surface-container transition-all cursor-pointer border border-outline-variant/10"
                    >
                      <div className="flex items-center gap-space-md min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleComplete(task.id)}
                          aria-label="Mark task complete"
                          className="w-4 h-4 rounded bg-surface-container flex items-center justify-center hover:bg-primary-container/20 group/chk transition-colors flex-shrink-0"
                          style={{
                            boxShadow: 'inset 0 0 0 1px rgba(255, 180, 171, 0.6)',
                          }}
                        >
                          <span className="material-symbols-outlined text-[13px] opacity-0 group-hover/chk:opacity-100 text-primary">
                            check
                          </span>
                        </button>

                        <div className="flex flex-col min-w-0 pr-4">
                          <div className="flex items-center gap-space-sm">
                            <span className="font-body-medium text-body-medium text-on-surface truncate">
                              {task.title}
                            </span>
                            {task.category && (
                              <span className="px-space-xs py-[2px] rounded bg-secondary-container/30 text-secondary text-micro font-micro font-medium">
                                {task.category}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-outline text-caption truncate mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-space-md flex-shrink-0">
                        <div className="flex items-center gap-space-xs text-caption">
                          <span className="material-symbols-outlined text-[14px] text-tertiary-container">
                            schedule
                          </span>
                          <span className="text-tertiary-container font-medium">
                            {getRelativeTimeRemaining(task.due_date, task.due_time)}
                          </span>
                        </div>

                        <div className="flex items-center gap-space-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
                          <span className="font-caption text-caption text-outline capitalize">
                            {task.priority}
                          </span>
                        </div>

                        {/* Hover Quick Actions */}
                        <div className="flex items-center gap-space-2xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => snooze(task.id, 60)}
                            className="p-space-2xs text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                            title="Snooze 1h"
                          >
                            <span className="material-symbols-outlined text-[16px]">snooze</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            className="p-space-2xs text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            className="p-space-2xs text-outline hover:text-error hover:bg-surface-container-high rounded transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* GROUP 2: Today / Scheduled Incomplete Tasks */}
            {currentTodayGroup.length > 0 && (
              <section className="flex flex-col gap-space-2xs">
                <div className="flex items-center gap-space-xs py-space-xs">
                  <span className="material-symbols-outlined text-[15px] text-primary">
                    wb_twilight
                  </span>
                  <h2 className="font-title-sm text-title-sm text-on-surface tracking-tight font-semibold">
                    Scheduled Focus
                  </h2>
                  <span className="text-micro font-micro text-outline uppercase px-space-2xs py-[1px] bg-surface-container rounded font-mono">
                    {currentTodayGroup.length} {currentTodayGroup.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                <div className="flex flex-col gap-[2px]">
                  {currentTodayGroup.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-start justify-between px-space-md py-space-sm rounded-lg hover:bg-surface-container-low transition-all cursor-pointer border border-transparent hover:border-outline-variant/10"
                    >
                      <div className="flex items-start gap-space-md min-w-0 pt-[2px] flex-1">
                        <button
                          type="button"
                          onClick={() => toggleComplete(task.id)}
                          aria-label="Mark task complete"
                          className="w-4 h-4 rounded bg-surface-container flex items-center justify-center hover:bg-primary-container/20 group/chk transition-colors flex-shrink-0 mt-[2px]"
                          style={{
                            boxShadow: 'inset 0 0 0 1px rgba(144, 143, 156, 0.4)',
                          }}
                        >
                          <span className="material-symbols-outlined text-[13px] opacity-0 group-hover/chk:opacity-100 text-primary">
                            check
                          </span>
                        </button>

                        <div className="flex flex-col gap-space-2xs min-w-0 pr-4">
                          <div className="flex items-center gap-space-sm">
                            <span className="font-body-medium text-body-medium text-on-surface truncate">
                              {task.title}
                            </span>
                            {task.category && (
                              <span className="px-space-xs py-[2px] rounded bg-surface-container text-on-surface-variant text-micro font-micro">
                                {task.category}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <div className="flex items-center gap-space-xs text-outline font-caption text-caption">
                              <span className="material-symbols-outlined text-[13px]">notes</span>
                              <span className="truncate">{task.description}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-space-md flex-shrink-0 pt-[2px]">
                        <div className="flex items-center gap-space-xs text-caption text-outline font-mono">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          <span>
                            {task.due_time ? formatDueTime(task.due_time) : task.due_date}
                          </span>
                        </div>

                        <div className="flex items-center gap-space-2xs">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              task.priority === 'urgent'
                                ? 'bg-tertiary-container'
                                : task.priority === 'high'
                                ? 'bg-tertiary'
                                : task.priority === 'medium'
                                ? 'bg-secondary'
                                : 'bg-outline'
                            }`}
                          />
                          <span className="font-caption text-caption text-outline capitalize">
                            {task.priority}
                          </span>
                        </div>

                        {/* Hover Quick Actions */}
                        <div className="flex items-center gap-space-2xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => snooze(task.id, 60)}
                            className="p-space-2xs text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                            title="Snooze 1h"
                          >
                            <span className="material-symbols-outlined text-[16px]">snooze</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            className="p-space-2xs text-outline hover:text-on-surface hover:bg-surface-container-high rounded transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            className="p-space-2xs text-outline hover:text-error hover:bg-surface-container-high rounded transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* GROUP 3: Completed Tasks */}
            {todayCompleted.length > 0 && (
              <section className="flex flex-col gap-space-2xs pt-space-xs">
                <div className="flex items-center justify-between py-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[15px] text-secondary">
                      check_circle
                    </span>
                    <h2 className="font-title-sm text-title-sm text-outline tracking-tight">
                      Completed Today
                    </h2>
                    <span className="text-micro font-micro text-outline uppercase px-space-2xs py-[1px] bg-surface-container rounded font-mono">
                      {todayCompleted.length} {todayCompleted.length === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Collapse section"
                    onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
                    className="text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isCompletedCollapsed ? 'expand_more' : 'expand_less'}
                    </span>
                  </button>
                </div>

                {!isCompletedCollapsed && (
                  <div className="flex flex-col gap-[2px] opacity-60 hover:opacity-100 transition-opacity">
                    {todayCompleted.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between px-space-md py-space-xs rounded-lg hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex items-center gap-space-md min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleComplete(task.id)}
                            className="w-4 h-4 rounded bg-secondary-container/40 flex items-center justify-center flex-shrink-0 hover:bg-secondary-container transition-colors"
                            title="Re-open task"
                          >
                            <span className="material-symbols-outlined text-[12px] text-secondary">
                              check
                            </span>
                          </button>
                          <span className="font-body-default text-body-default text-outline line-through truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-space-xs text-micro font-micro text-outline font-mono">
                          <span className="material-symbols-outlined text-[12px]">done_all</span>
                          <span>
                            {task.completed_at
                              ? new Date(task.completed_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Done'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      {/* 3. Window Bottom Status Bar */}
      <footer className="h-7 bg-surface-container-low px-space-md flex items-center justify-between text-micro font-micro text-outline border-t border-outline-variant/15 drag-region">
        <div className="flex items-center gap-space-md no-drag">
          <div className="flex items-center gap-space-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>SQLite Sync Engine: Active</span>
          </div>
          <span>Storage: %APPDATA%/HeadsUp/still_tasks.db</span>
        </div>
        <div className="flex items-center gap-space-md no-drag font-mono">
          <span>Encoding: UTF-8</span>
          <span>Keyboard mode: Normal</span>
        </div>
      </footer>

      {/* Task Modal for Creating / Editing */}
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
