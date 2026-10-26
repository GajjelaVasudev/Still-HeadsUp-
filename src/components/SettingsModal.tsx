import React from 'react';
import { AppSettings, WidgetVisibilityMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => Promise<any>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-surface-container-low rounded-2xl border border-outline-variant/30 shadow-2xl p-space-lg flex flex-col gap-space-lg relative overflow-hidden"
        style={{
          boxShadow: '0 24px 60px -8px rgba(0,0,0,0.85), inset 0 1px 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-sm">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-space-md max-h-[70vh] overflow-y-auto pr-1">
          {/* Windows Startup Option */}
          <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container border border-outline-variant/20">
            <div className="flex flex-col gap-0.5">
              <span className="font-body-medium text-body-medium text-on-surface">
                Launch at Windows sign-in
              </span>
              <span className="text-caption text-outline">
                Automatically start HeadsUp widget silently in the background
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ launch_at_startup: !settings.launch_at_startup })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                settings.launch_at_startup ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <div
                className={`bg-surface-container-lowest w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  settings.launch_at_startup ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Always on Top */}
          <div className="flex items-center justify-between p-space-sm rounded-xl bg-surface-container border border-outline-variant/20">
            <div className="flex flex-col gap-0.5">
              <span className="font-body-medium text-body-medium text-on-surface">
                Always on Top Mode
              </span>
              <span className="text-caption text-outline">
                Keep the task widget pinned above full-screen windows
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ always_on_top: !settings.always_on_top })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                settings.always_on_top ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <div
                className={`bg-surface-container-lowest w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  settings.always_on_top ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Visibility Mode Selector */}
          <div className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-surface-container border border-outline-variant/20">
            <span className="font-body-medium text-body-medium text-on-surface">
              Desktop Display Mode
            </span>
            <div className="grid grid-cols-3 gap-space-xs pt-1">
              {(['desktop', 'always-on-top', 'hidden'] as WidgetVisibilityMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onUpdateSettings({ widget_visibility_mode: mode })}
                  className={`py-1.5 px-2 rounded-lg text-micro font-micro uppercase tracking-wider transition-all text-center ${
                    settings.widget_visibility_mode === mode
                      ? 'bg-primary text-on-primary font-bold shadow'
                      : 'bg-surface-container-high text-outline hover:text-on-surface'
                  }`}
                >
                  {mode === 'desktop' ? 'Desktop' : mode === 'always-on-top' ? 'Always-on-top' : 'Hidden'}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-surface-container border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="font-body-medium text-body-medium text-on-surface">
                Widget Opacity
              </span>
              <span className="font-label-kbd text-label-kbd text-primary font-mono">
                {Math.round((settings.widget_opacity || 0.95) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={settings.widget_opacity || 0.95}
              onChange={(e) => onUpdateSettings({ widget_opacity: parseFloat(e.target.value) })}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Keyboard Shortcuts Section */}
          <div className="flex flex-col gap-space-xs p-space-sm rounded-xl bg-surface-container border border-outline-variant/20">
            <span className="font-body-medium text-body-medium text-on-surface">
              Global Keyboard Shortcuts
            </span>
            <div className="flex flex-col gap-space-xs pt-1 text-caption">
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Show / Hide Widget</span>
                <kbd className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-mono text-label-kbd">
                  Alt + Shift + H
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-outline-variant/10">
                <span className="text-on-surface-variant">Quick Add Task</span>
                <kbd className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-mono text-label-kbd">
                  Alt + Shift + N
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-on-surface-variant">Open Task Hub</span>
                <kbd className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-mono text-label-kbd">
                  Alt + Shift + M
                </kbd>
              </div>
            </div>
          </div>

          {/* Persistence & Database Card */}
          <div className="p-space-sm rounded-xl bg-surface-container/60 border border-outline-variant/20 flex flex-col gap-1 text-caption">
            <div className="flex items-center gap-space-xs text-secondary font-medium">
              <span className="material-symbols-outlined text-[15px]">storage</span>
              <span>Local SQLite Engine: Connected</span>
            </div>
            <p className="text-outline text-micro">
              Tasks are saved persistently in your Windows AppData directory and survive app exits, power loss, and restarts.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-space-xs border-t border-outline-variant/20">
          <button
            type="button"
            onClick={onClose}
            className="px-space-lg py-1.5 rounded-lg bg-primary text-on-primary font-medium text-caption shadow transition-transform active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
