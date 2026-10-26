# Still (HeadsUp) — Premium Persistent Windows Desktop Task Reminder

> macOS-inspired, persistent desktop productivity widget and task manager for Windows. Built with precision craft following the Google Stitch **Quiet Focus** design system.

---

## 🌟 Key Capabilities

1. **Persistent Desktop Widget**:
   - Sits continuously on your Windows desktop like a native digital sticky note.
   - Frameless, translucent glassmorphism surface (`#1a1b1e` with subtle 1px border highlight and inset light trap).
   - Draggable via top pill handle (`-webkit-app-region: drag`), freely resizable between 320px and 480px.
   - Saves window position, bounds, opacity, and visibility mode across restarts.

2. **Windows Startup & Background Lifecycle**:
   - Launches automatically at Windows sign-in with `--hidden` flag so the desktop widget appears silently without interrupting your workflow.
   - Single-instance protection ensures only one instance ever runs; opening a second instance brings the existing widget/manager into focus.
   - Closing the Expanded Task Manager window only hides it—it **never terminates** the desktop widget or background service.
   - Dedicated Windows System Tray icon with quick actions: toggle widget, open task hub, quick add task, always-on-top toggle, startup setting, and clean exit.

3. **Local SQLite Persistence**:
   - 100% offline-first, local SQLite storage engine located at `%APPDATA%/HeadsUp/still_tasks.db`.
   - Complete ACID transactions and durability across power loss, crashes, and Windows reboots.
   - Instant real-time IPC synchronization across both the Desktop Widget and the Full Task Hub.

4. **Date-Aware Task Engine**:
   - **Overdue Detection**: Prioritizes overdue tasks with coral badges and urgency tags (`P1`). Overdue tasks remain visible until completed or dismissed.
   - **Today & Scheduled Focus**: Displays remaining tasks with dynamic relative time indicators (`in 2h`, `in 3.5h`, `Until 23:59`) that flip to quick snooze/edit actions on row hover.
   - **Recurrence Engine**: Supports Daily, Weekly, and Monthly recurrence. Completing a recurring task automatically calculates and schedules the next occurrence.
   - **Snooze Engine**: Quick snooze directly from hover actions (+1h, +3h, tomorrow).

5. **Expanded Task Hub**:
   - Two-column layout with sidebar navigation: Today, Upcoming, Overdue, All Tasks, Completed.
   - Filter by Project / Focus tag (`Engineering`, `Academics`, `Work`, `Personal`, `Data Science`, `Algorithms`).
   - Global quick search with `Ctrl + K`.
   - Full Task creation & edit modal with validation, priority selection, dates, times, and notes.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `Alt + Shift + H` | Toggle Widget Show / Hide | Global (System-wide) |
| `Alt + Shift + N` | Quick Add Task | Global (System-wide) |
| `Alt + Shift + M` | Open Full Task Manager | Global (System-wide) |
| `N` | Open Task Creation modal | Inside Widget / Manager |
| `Ctrl + K` | Focus Global Search | Inside Task Manager |
| `Ctrl + ,` | Open Preferences / Settings | Inside Task Manager |
| `Ctrl + Enter` | Save Task Form | Inside Task Modal |
| `Esc` | Close Modal or Menu | Everywhere |

---

## 🛠️ Technology Stack

- **Runtime**: Electron 33 (Windows x64)
- **Frontend**: React 18, TypeScript, TailwindCSS v3
- **Build Tooling**: Vite 6, TypeScript Compiler (`tsc`), PostCSS
- **Persistence**: SQLite 3 (compiled WASM via `sql.js` with disk synchronization)
- **Design System**: Google Stitch **Quiet Focus** tokens and typography (`Inter`, `Material Symbols Outlined`)

---

## 🚀 Development & Build Instructions

### Prerequisites
- Node.js v20+ or v22+
- npm v10+

### Install Dependencies
```powershell
npm install
```

### Run Automated Tests
```powershell
npx tsc -p tsconfig.test.json; node dist-test/test/engine.test.js
```

### Start in Development Mode
```powershell
npm run dev
```

### Build Production Bundle & Run App
```powershell
npm start
```

### Package Windows Executable (Standalone Portable / Installer)
```powershell
npm run dist
```
The packaged standalone application is output to the `release/` directory.

---

## 📁 Project Architecture

```
HeadsUp/
├── electron/
│   ├── main.ts            # Window lifecycle, tray, global shortcuts, IPC broadcast
│   ├── preload.ts         # Secure contextBridge API
│   └── database.ts        # SQLite storage engine, schema, migrations, seed data
├── src/
│   ├── components/
│   │   ├── TaskModal.tsx       # Create & Edit task dialog with full validation
│   │   └── SettingsModal.tsx   # Preferences dialog (Startup, Opacity, Modes)
│   ├── hooks/
│   │   └── useTasks.ts         # React hook for real-time task sync & selectors
│   ├── manager/
│   │   ├── ManagerApp.tsx      # Full Task Hub application
│   │   └── main.tsx            # Manager entry point
│   ├── widget/
│   │   ├── WidgetApp.tsx       # Compact persistent floating widget
│   │   └── main.tsx            # Widget entry point
│   ├── styles/
│   │   └── globals.css         # Styling, custom drag regions, scrollbars
│   ├── types/
│   │   └── index.ts            # TypeScript data contracts & IPC interfaces
│   └── utils/
│       └── dateUtils.ts        # Date calculation engine, relative time, recurrence
├── test/
│   ├── engine.test.ts          # Automated tests for date engine & SQLite
│   └── electron-smoke.js       # End-to-end Electron process smoke runner
├── assets/                     # App and tray icons
├── index.html                  # Manager HTML host
├── widget.html                 # Widget HTML host
├── tailwind.config.js          # Quiet Focus design tokens
├── vite.config.ts              # Multi-page build configuration
└── package.json
```