import { Task } from '../src/types';
import { isTaskOverdue } from '../src/utils/dateUtils';

/**
 * Generates a stable signature for an overdue task based on its ID and due date/time.
 * If the task is rescheduled or snoozed, its signature changes automatically.
 */
export function getTaskOverdueSignature(task: Pick<Task, 'id' | 'due_date' | 'due_time'>): string {
  return `${task.id}:${task.due_date}:${task.due_time || ''}`;
}

export interface OverdueControllerOptions {
  getTasks: () => Task[];
  getDismissedSignatures: () => string[];
  saveDismissedSignatures: (signatures: string[]) => void;
  onShowBanner: (overdueTasks: Task[]) => void;
  onUpdateBanner: (overdueTasks: Task[]) => void;
  onHideBanner: () => void;
  isBannerVisible: () => boolean;
}

export interface EvaluationResult {
  overdueTasks: Task[];
  isVisible: boolean;
  hasNewOverdue: boolean;
}

/**
 * OverdueController manages overdue task detection, persistent dismissal state,
 * and banner presentation lifecycle.
 */
export class OverdueController {
  constructor(private options: OverdueControllerOptions) {}

  /**
   * Retrieves all currently overdue tasks from the database source of truth.
   * Excludes completed tasks and sorts by due date and time.
   */
  public getOverdueTasks(): Task[] {
    const allTasks = this.options.getTasks();
    return allTasks
      .filter((t) => !t.completed && isTaskOverdue(t.due_date, t.due_time))
      .sort((a, b) => {
        if (a.due_date !== b.due_date) {
          return a.due_date.localeCompare(b.due_date);
        }
        return (a.due_time || '').localeCompare(b.due_time || '');
      });
  }

  /**
   * Evaluates the current overdue task set against the persistent dismissal record.
   * - Shows or updates the banner if new overdue tasks exist.
   * - Hides the banner and clears obsolete state when 0 overdue tasks remain.
   * - Keeps the banner hidden if all current overdue tasks were already dismissed.
   */
  public evaluate(): EvaluationResult {
    const overdueTasks = this.getOverdueTasks();

    if (overdueTasks.length === 0) {
      if (this.options.isBannerVisible()) {
        this.options.onHideBanner();
      }
      // Clear obsolete dismissal state when no overdue tasks remain
      this.options.saveDismissedSignatures([]);
      return { overdueTasks: [], isVisible: false, hasNewOverdue: false };
    }

    const currentSignatures = overdueTasks.map(getTaskOverdueSignature);
    const currentSigSet = new Set(currentSignatures);
    const dismissed = this.options.getDismissedSignatures();

    // Prune signatures for tasks that are no longer overdue (completed, rescheduled, or deleted)
    const validDismissed = dismissed.filter((sig) => currentSigSet.has(sig));
    if (validDismissed.length !== dismissed.length) {
      this.options.saveDismissedSignatures(validDismissed);
    }

    const validDismissedSet = new Set(validDismissed);
    // Detect whether any currently overdue task is NOT in the dismissed set
    const hasNewOverdue = currentSignatures.some((sig) => !validDismissedSet.has(sig));

    if (hasNewOverdue) {
      if (this.options.isBannerVisible()) {
        this.options.onUpdateBanner(overdueTasks);
      } else {
        this.options.onShowBanner(overdueTasks);
      }
      return { overdueTasks, isVisible: true, hasNewOverdue: true };
    } else {
      // All currently overdue tasks have been previously dismissed
      if (this.options.isBannerVisible()) {
        // If the banner was already open before this evaluation (e.g. inline completion occurred),
        // update it to reflect the remaining tasks without reopening if dismissed.
        this.options.onUpdateBanner(overdueTasks);
        return { overdueTasks, isVisible: true, hasNewOverdue: false };
      }
      return { overdueTasks, isVisible: false, hasNewOverdue: false };
    }
  }

  /**
   * Explicitly dismisses the current alert.
   * Records the signatures of all currently overdue tasks and hides the banner.
   * Does NOT complete, delete, or modify any task in the database.
   */
  public dismiss(): void {
    const overdueTasks = this.getOverdueTasks();
    const currentSignatures = overdueTasks.map(getTaskOverdueSignature);
    this.options.saveDismissedSignatures(currentSignatures);

    if (this.options.isBannerVisible()) {
      this.options.onHideBanner();
    }
  }
}
