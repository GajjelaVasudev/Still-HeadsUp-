import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskPriority, TaskRecurrence } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  initialTask?: Task | null;
}

const CATEGORIES = ['Engineering', 'Academics', 'Work', 'Personal', 'Data Science', 'Algorithms'];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(getTodayDateString());
  const [dueTime, setDueTime] = useState('18:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('Engineering');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setDescription(initialTask.description || '');
        setDueDate(initialTask.due_date);
        setDueTime(initialTask.due_time || '18:00');
        setPriority(initialTask.priority);
        setCategory(initialTask.category || 'Engineering');
        setRecurrence(initialTask.recurrence || 'none');
      } else {
        setTitle('');
        setDescription('');
        setDueDate(getTodayDateString());
        setDueTime('18:00');
        setPriority('medium');
        setCategory('Engineering');
        setRecurrence('none');
      }
      setError('');
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialTask]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        due_time: dueTime.trim() || null,
        priority,
        category: category.trim(),
        completed: initialTask ? initialTask.completed : false,
        completed_at: initialTask ? initialTask.completed_at : null,
        recurrence,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-lg bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-2xl p-space-lg flex flex-col gap-space-md relative overflow-hidden"
        style={{
          boxShadow: '0 24px 60px -8px rgba(0,0,0,0.85), inset 0 1px 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">
              {initialTask ? 'edit_note' : 'add_task'}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {initialTask ? 'Edit Task' : 'New Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {error && (
          <div className="px-space-sm py-1.5 rounded-lg bg-error-container/20 border border-error/30 text-error text-caption">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
          {/* Title Field */}
          <div className="flex flex-col gap-space-2xs">
            <label className="text-micro font-micro uppercase tracking-wider text-outline font-medium">
              Task Title *
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Finish Data Science lab"
              className="w-full h-9 px-space-sm bg-surface-container rounded-lg font-body-default text-body-default text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          {/* Description / Notes Field */}
          <div className="flex flex-col gap-space-2xs">
            <label className="text-micro font-micro uppercase tracking-wider text-outline font-medium">
              Notes & Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Add details, links, or sub-notes..."
              className="w-full p-space-sm bg-surface-container rounded-lg font-caption text-caption text-on-surface placeholder:text-outline border border-outline-variant/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-space-2xs">
              <label className="text-micro font-micro uppercase tracking-wider text-outline font-medium">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-8 px-space-sm bg-surface-container rounded-lg font-caption text-caption text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-space-2xs">
              <label className="text-micro font-micro uppercase tracking-wider text-outline font-medium">
                Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full h-8 px-space-sm bg-surface-container rounded-lg font-caption text-caption text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Priority & Category Row */}
          <div className="grid grid-cols-2 gap-space-sm">
            <div className="flex flex-col gap-space-2xs">
              <label className="text-micro font-micro uppercase tracking-wider text-outline font-medium">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-8 px-space-sm bg-surface-container rounded-lg font-caption text-caption text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary transition-all"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent (P1)</option>
              </select>
            </div>
            <div className="flex flex-col gap-space-2xs">
              <label className="text-micro font-micro uppercase tracking-wider text-outline font-medium">
                Project / Category
              </label>
              <input
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Engineering, Academics..."
                className="w-full h-8 px-space-sm bg-surface-container rounded-lg font-caption text-caption text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary transition-all"
              />
              <datalist id="category-suggestions">
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Recurrence Setting */}
          <div className="flex flex-col gap-space-2xs">
            <label className="text-micro font-micro uppercase tracking-wider text-outline font-medium">
              Recurrence
            </label>
            <div className="flex items-center gap-space-xs">
              {(['none', 'daily', 'weekly', 'monthly'] as TaskRecurrence[]).map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => setRecurrence(rec)}
                  className={`flex-1 py-1 rounded-lg text-micro font-micro uppercase tracking-wider transition-all ${
                    recurrence === rec
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'bg-surface-container text-outline hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {rec}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/20 mt-space-xs">
            <div className="flex items-center gap-space-xs text-micro font-micro text-outline">
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container">Enter</kbd>
              <span>to save</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <button
                type="button"
                onClick={onClose}
                className="px-space-md py-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors text-caption font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-space-md py-1.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-medium text-caption shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : initialTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
