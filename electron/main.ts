import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  screen,
  globalShortcut,
} from 'electron';
import path from 'path';
import fs from 'fs';
import {
  initDatabase,
  getAllTasks,
  createTask,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  snoozeTask,
  getSettings,
  saveSettings,
  getDismissedOverdueSignatures,
  saveDismissedOverdueSignatures,
} from './database';
import { OverdueController } from './overdueController';
import { AppSettings, Task } from '../src/types';

let widgetWindow: BrowserWindow | null = null;
let managerWindow: BrowserWindow | null = null;
let bannerWindow: BrowserWindow | null = null;
let overdueController: OverdueController | null = null;
let overdueCheckInterval: NodeJS.Timeout | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Ensure single instance
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (widgetWindow) {
      if (widgetWindow.isMinimized()) widgetWindow.restore();
      widgetWindow.show();
      widgetWindow.focus();
    }
  });
}

function broadcastToAllWindows(channel: string, data?: any) {
  if (widgetWindow && !widgetWindow.isDestroyed()) {
    widgetWindow.webContents.send(channel, data);
  }
  if (managerWindow && !managerWindow.isDestroyed()) {
    managerWindow.webContents.send(channel, data);
  }
  if (bannerWindow && !bannerWindow.isDestroyed()) {
    bannerWindow.webContents.send(channel, data);
  }
}

function getIconPath(filename: string): string {
  const candidates = [
    path.join(__dirname, '../../assets', filename),
    path.join(app.getAppPath(), 'assets', filename),
    path.resolve(process.cwd(), 'assets', filename),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function createTrayIcon(): Electron.NativeImage {
  const iconPath = getIconPath('tray-icon.png');
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createEmpty();
}

function setupTray(): void {
  try {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Still — HeadsUp Persistent Task Reminder');

  const updateTrayMenu = () => {
    const settings = getSettings();
    const isWidgetVisible = widgetWindow && widgetWindow.isVisible();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isWidgetVisible ? 'Hide Desktop Widget' : 'Show Desktop Widget',
        click: () => {
          if (widgetWindow) {
            if (widgetWindow.isVisible()) {
              widgetWindow.hide();
            } else {
              widgetWindow.show();
              widgetWindow.focus();
            }
            updateTrayMenu();
          }
        },
      },
      {
        label: 'Open Task Manager',
        click: () => openManagerWindow(),
      },
      {
        label: 'Quick Add Task...',
        click: () => {
          openManagerWindow();
          if (managerWindow) {
            managerWindow.webContents.send('trigger-quick-add');
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Always on Top',
        type: 'checkbox',
        checked: settings.always_on_top,
        click: (item) => {
          saveSettings({ always_on_top: item.checked });
          if (widgetWindow) {
            widgetWindow.setAlwaysOnTop(item.checked, 'screen-saver');
          }
          broadcastToAllWindows('settings-changed', getSettings());
        },
      },
      {
        label: 'Launch at Windows Startup',
        type: 'checkbox',
        checked: settings.launch_at_startup,
        click: (item) => {
          saveSettings({ launch_at_startup: item.checked });
          applyStartupSetting(item.checked);
          broadcastToAllWindows('settings-changed', getSettings());
        },
      },
      { type: 'separator' },
      {
        label: 'Settings...',
        click: () => {
          openManagerWindow();
          if (managerWindow) {
            managerWindow.webContents.send('open-settings');
          }
        },
      },
      {
        label: 'Exit Still',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray?.setContextMenu(contextMenu);
  };

  tray.on('click', () => {
    if (widgetWindow) {
      if (widgetWindow.isVisible()) {
        widgetWindow.focus();
      } else {
        widgetWindow.show();
        widgetWindow.focus();
      }
    }
  });

  updateTrayMenu();
  } catch (err) {
    console.warn('System tray initialization caught error:', err);
  }
}

function applyStartupSetting(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
      args: ['--hidden'],
    });
  } catch (err) {
    console.error('Failed to update Windows login item settings:', err);
  }
}

function createWidgetWindow(): void {
  const settings = getSettings();
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  const defaultWidth = settings.widget_size?.width || 380;
  const defaultHeight = settings.widget_size?.height || 480;

  let x = settings.widget_position?.x;
  let y = settings.widget_position?.y;

  if (x === undefined || y === undefined || x < 0 || y < 0 || x > workArea.width || y > workArea.height) {
    x = workArea.x + workArea.width - defaultWidth - 32;
    y = workArea.y + 64;
  }

  widgetWindow = new BrowserWindow({
    x,
    y,
    width: defaultWidth,
    height: defaultHeight,
    minWidth: 320,
    minHeight: 340,
    maxWidth: 480,
    maxHeight: 850,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    alwaysOnTop: settings.always_on_top,
    skipTaskbar: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  });

  if (settings.always_on_top) {
    widgetWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  widgetWindow.setOpacity(settings.widget_opacity || 0.95);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    widgetWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/widget.html`);
  } else {
    widgetWindow.loadFile(path.join(app.getAppPath(), 'dist/widget.html'));
  }

  // Debounce saving window position and size
  let saveTimeout: NodeJS.Timeout | null = null;
  const scheduleSaveBounds = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (!widgetWindow || widgetWindow.isDestroyed()) return;
      const bounds = widgetWindow.getBounds();
      saveSettings({
        widget_position: { x: bounds.x, y: bounds.y },
        widget_size: { width: bounds.width, height: bounds.height },
      });
    }, 500);
  };

  widgetWindow.on('moved', scheduleSaveBounds);
  widgetWindow.on('resized', scheduleSaveBounds);

  widgetWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      widgetWindow?.hide();
    }
  });
}

function openManagerWindow(): void {
  if (managerWindow && !managerWindow.isDestroyed()) {
    if (managerWindow.isMinimized()) managerWindow.restore();
    managerWindow.show();
    managerWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  managerWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 920,
    minHeight: 600,
    frame: false,
    backgroundColor: '#121316',
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    managerWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/index.html`);
  } else {
    managerWindow.loadFile(path.join(app.getAppPath(), 'dist/index.html'));
  }

  // Critical requirement: Closing manager hides it, does not terminate app or widget
  managerWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      managerWindow?.hide();
    }
  });
}

function getBannerDimensions(taskCount: number) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const bannerWidth = Math.min(860, Math.max(720, workArea.width - 32));
  let bannerHeight = 140;
  if (taskCount === 2) bannerHeight = 170;
  else if (taskCount >= 3) bannerHeight = 205;

  const x = workArea.x + Math.round((workArea.width - bannerWidth) / 2);
  const y = workArea.y + 10;
  return { width: bannerWidth, height: bannerHeight, x, y };
}

function createBannerWindow(): BrowserWindow {
  if (bannerWindow && !bannerWindow.isDestroyed()) {
    return bannerWindow;
  }

  const dims = getBannerDimensions(1);

  bannerWindow = new BrowserWindow({
    x: dims.x,
    y: dims.y,
    width: dims.width,
    height: dims.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: process.env.NODE_ENV === 'development' || !app.isPackaged,
    },
  });

  bannerWindow.setAlwaysOnTop(true, 'screen-saver');

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    bannerWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/banner.html`);
  } else {
    bannerWindow.loadFile(path.join(app.getAppPath(), 'dist/banner.html'));
  }

  bannerWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      bannerWindow?.hide();
    }
  });

  return bannerWindow;
}

function setupOverdueManager(): void {
  overdueController = new OverdueController({
    getTasks: () => getAllTasks(),
    getDismissedSignatures: () => getDismissedOverdueSignatures(),
    saveDismissedSignatures: (signatures: string[]) => saveDismissedOverdueSignatures(signatures),
    isBannerVisible: () => (bannerWindow ? bannerWindow.isVisible() : false),
    onShowBanner: (overdueTasks: Task[]) => {
      const win = createBannerWindow();
      const dims = getBannerDimensions(overdueTasks.length);
      win.setBounds({
        x: dims.x,
        y: dims.y,
        width: dims.width,
        height: dims.height,
      });
      win.setAlwaysOnTop(true, 'screen-saver');
      if (!win.isVisible()) {
        win.showInactive();
      }
      win.webContents.send('overdue-tasks-updated', overdueTasks);
    },
    onUpdateBanner: (overdueTasks: Task[]) => {
      if (bannerWindow && !bannerWindow.isDestroyed()) {
        const dims = getBannerDimensions(overdueTasks.length);
        bannerWindow.setBounds({
          x: dims.x,
          y: dims.y,
          width: dims.width,
          height: dims.height,
        });
        bannerWindow.webContents.send('overdue-tasks-updated', overdueTasks);
      }
    },
    onHideBanner: () => {
      if (bannerWindow && !bannerWindow.isDestroyed() && bannerWindow.isVisible()) {
        bannerWindow.hide();
      }
    },
  });
}

function registerShortcuts(): void {
  try {
    // Alt+Space or Alt+Shift+H to toggle widget
    globalShortcut.register('Alt+Shift+H', () => {
      if (widgetWindow) {
        if (widgetWindow.isVisible()) {
          widgetWindow.hide();
        } else {
          widgetWindow.show();
          widgetWindow.focus();
        }
      }
    });

    // Alt+Shift+N for quick task entry
    globalShortcut.register('Alt+Shift+N', () => {
      openManagerWindow();
      if (managerWindow) {
        managerWindow.webContents.send('trigger-quick-add');
      }
    });

    // Alt+Shift+M for task manager
    globalShortcut.register('Alt+Shift+M', () => {
      openManagerWindow();
    });
  } catch (err) {
    console.error('Failed to register global shortcuts:', err);
  }
}

function setupIpc(): void {
  ipcMain.handle('get-tasks', async () => {
    return getAllTasks();
  });

  ipcMain.handle('get-overdue-tasks', async () => {
    return overdueController?.getOverdueTasks() || [];
  });

  ipcMain.handle('dismiss-overdue-banner', async () => {
    overdueController?.dismiss();
  });

  ipcMain.handle('create-task', async (_event, taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (!taskData || typeof taskData.title !== 'string') {
      throw new Error('Invalid task title');
    }
    const task = createTask(taskData);
    broadcastToAllWindows('tasks-changed');
    overdueController?.evaluate();
    return task;
  });

  ipcMain.handle('update-task', async (_event, id: string, updates: Partial<Task>) => {
    if (typeof id !== 'string' || !updates || typeof updates !== 'object') {
      throw new Error('Invalid task update payload');
    }
    const task = updateTask(id, updates);
    broadcastToAllWindows('tasks-changed');
    overdueController?.evaluate();
    return task;
  });

  ipcMain.handle('toggle-task-complete', async (_event, id: string) => {
    if (typeof id !== 'string') {
      throw new Error('Invalid task id');
    }
    const task = toggleTaskComplete(id);
    broadcastToAllWindows('tasks-changed');
    overdueController?.evaluate();
    return task;
  });

  ipcMain.handle('delete-task', async (_event, id: string) => {
    if (typeof id !== 'string') {
      throw new Error('Invalid task id');
    }
    const res = deleteTask(id);
    broadcastToAllWindows('tasks-changed');
    overdueController?.evaluate();
    return res;
  });

  ipcMain.handle('snooze-task', async (_event, id: string, minutes: number) => {
    if (typeof id !== 'string' || typeof minutes !== 'number' || minutes <= 0) {
      throw new Error('Invalid snooze payload');
    }
    const task = snoozeTask(id, minutes);
    broadcastToAllWindows('tasks-changed');
    overdueController?.evaluate();
    return task;
  });

  ipcMain.handle('get-settings', async () => {
    return getSettings();
  });

  ipcMain.handle('save-settings', async (_event, settings: Partial<AppSettings>) => {
    const updated = saveSettings(settings);
    if (settings.always_on_top !== undefined && widgetWindow) {
      widgetWindow.setAlwaysOnTop(settings.always_on_top, 'screen-saver');
    }
    if (settings.widget_opacity !== undefined && widgetWindow) {
      widgetWindow.setOpacity(settings.widget_opacity);
    }
    if (settings.launch_at_startup !== undefined) {
      applyStartupSetting(settings.launch_at_startup);
    }
    broadcastToAllWindows('settings-changed', updated);
    return updated;
  });

  ipcMain.handle('open-manager', async () => {
    openManagerWindow();
  });

  ipcMain.handle('toggle-widget', async () => {
    if (widgetWindow) {
      if (widgetWindow.isVisible()) {
        widgetWindow.hide();
      } else {
        widgetWindow.show();
        widgetWindow.focus();
      }
    }
  });

  ipcMain.handle('set-always-on-top', async (_event, alwaysOnTop: boolean) => {
    if (widgetWindow) {
      widgetWindow.setAlwaysOnTop(alwaysOnTop, 'screen-saver');
    }
    saveSettings({ always_on_top: alwaysOnTop });
    broadcastToAllWindows('settings-changed', getSettings());
  });

  ipcMain.handle('set-widget-opacity', async (_event, opacity: number) => {
    if (widgetWindow) {
      widgetWindow.setOpacity(opacity);
    }
    saveSettings({ widget_opacity: opacity });
    broadcastToAllWindows('settings-changed', getSettings());
  });

  ipcMain.handle('minimize-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });

  ipcMain.handle('maximize-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.handle('close-window', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win === managerWindow) {
      managerWindow?.hide();
    } else if (win === widgetWindow) {
      widgetWindow?.hide();
    } else if (win === bannerWindow) {
      overdueController?.dismiss();
    } else {
      win?.close();
    }
  });
}

app.whenReady().then(async () => {
  await initDatabase();
  setupIpc();
  setupTray();
  registerShortcuts();

  const settings = getSettings();
  applyStartupSetting(settings.launch_at_startup);

  // Initialize banner window and overdue manager
  createBannerWindow();
  setupOverdueManager();

  // Handle display resolution changes safely
  screen.on('display-metrics-changed', () => {
    if (bannerWindow && !bannerWindow.isDestroyed()) {
      const overdueCount = overdueController?.getOverdueTasks().length || 1;
      const dims = getBannerDimensions(overdueCount);
      bannerWindow.setBounds({
        x: dims.x,
        y: dims.y,
        width: dims.width,
        height: dims.height,
      });
    }
  });

  // Evaluate overdue tasks after database is ready
  overdueController?.evaluate();

  // Lightweight 30-second interval to catch time transitions without polling DB aggressively
  overdueCheckInterval = setInterval(() => {
    overdueController?.evaluate();
  }, 30000);

  // Check if launched with --hidden argument
  const isHiddenLaunch = process.argv.includes('--hidden');

  createWidgetWindow();

  // If not hidden launch and widget isn't hidden by preference, show it
  if (!isHiddenLaunch && settings.widget_visibility_mode !== 'hidden') {
    widgetWindow?.show();
  }
});

app.on('window-all-closed', () => {
  // Do not quit when windows are closed! Keep running in tray for persistent widget reminders
  // Explicit exit only via tray menu or settings
});

app.on('will-quit', () => {
  if (overdueCheckInterval) {
    clearInterval(overdueCheckInterval);
    overdueCheckInterval = null;
  }
  globalShortcut.unregisterAll();
});
