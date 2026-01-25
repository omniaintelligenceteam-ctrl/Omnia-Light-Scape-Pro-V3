import { useEffect, useCallback, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  description: string;
  category: 'navigation' | 'actions' | 'editor' | 'general';
  action: () => void;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

// Check if user is typing in an input field
const isInputField = (element: EventTarget | null): boolean => {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.isContentEditable
  );
};

// Format shortcut key for display
export const formatShortcutKey = (shortcut: KeyboardShortcut): string => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];

  if (shortcut.modifiers?.includes('ctrl')) {
    parts.push(isMac ? '⌃' : 'Ctrl');
  }
  if (shortcut.modifiers?.includes('alt')) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (shortcut.modifiers?.includes('shift')) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.modifiers?.includes('meta')) {
    parts.push(isMac ? '⌘' : 'Win');
  }

  // Format key name
  let keyName = shortcut.key.toUpperCase();
  if (keyName === 'ESCAPE') keyName = 'Esc';
  if (keyName === 'ARROWUP') keyName = '↑';
  if (keyName === 'ARROWDOWN') keyName = '↓';
  if (keyName === 'ARROWLEFT') keyName = '←';
  if (keyName === 'ARROWRIGHT') keyName = '→';
  if (keyName === 'ENTER') keyName = '↵';
  if (keyName === ' ') keyName = 'Space';

  parts.push(keyName);
  return parts.join(isMac ? '' : '+');
};

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      // unless it's an escape key or specific navigation key
      const targetIsInput = isInputField(event.target);
      const isEscape = event.key === 'Escape';
      const isNavigationKey = ['ArrowUp', 'ArrowDown', 'Tab'].includes(event.key);

      // Show help modal with ?
      if (event.key === '?' && !targetIsInput) {
        event.preventDefault();
        setShowHelp(true);
        return;
      }

      for (const shortcut of shortcuts) {
        // Skip disabled shortcuts
        if (shortcut.enabled === false) continue;

        // Check if key matches
        if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

        // Check modifiers
        const modifiers = shortcut.modifiers || [];
        const ctrlRequired = modifiers.includes('ctrl');
        const altRequired = modifiers.includes('alt');
        const shiftRequired = modifiers.includes('shift');
        const metaRequired = modifiers.includes('meta');

        const ctrlPressed = event.ctrlKey || event.metaKey; // Treat Cmd as Ctrl on Mac
        const altPressed = event.altKey;
        const shiftPressed = event.shiftKey;
        const metaPressed = event.metaKey;

        // Strict modifier matching for shortcuts with modifiers
        if (modifiers.length > 0) {
          if (ctrlRequired !== ctrlPressed) continue;
          if (altRequired !== altPressed) continue;
          if (shiftRequired !== shiftPressed) continue;
          if (metaRequired !== metaPressed) continue;
        } else {
          // For shortcuts without modifiers, don't trigger if any modifier is pressed
          if (ctrlPressed || altPressed || metaPressed) continue;
          // Allow shift for letters (for capital letters)
          if (shiftPressed && shortcut.key.length === 1 && /[a-z]/i.test(shortcut.key)) {
            // Allow shift only for single letters
          }
        }

        // Skip if in input field (unless escape or navigation)
        if (targetIsInput && !isEscape && !isNavigationKey) continue;

        // Execute the shortcut
        event.preventDefault();
        shortcut.action();
        return;
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Group shortcuts by category for display
  const shortcutsByCategory = shortcuts.reduce(
    (acc, shortcut) => {
      if (shortcut.enabled !== false) {
        if (!acc[shortcut.category]) acc[shortcut.category] = [];
        acc[shortcut.category].push(shortcut);
      }
      return acc;
    },
    {} as Record<string, KeyboardShortcut[]>
  );

  return {
    showHelp,
    setShowHelp,
    shortcutsByCategory,
    formatShortcutKey,
  };
};

// Predefined common shortcuts that can be used as templates
export const commonShortcuts = {
  save: (action: () => void): KeyboardShortcut => ({
    key: 's',
    modifiers: ['ctrl'],
    description: 'Save',
    category: 'general',
    action,
  }),
  newProject: (action: () => void): KeyboardShortcut => ({
    key: 'n',
    modifiers: ['ctrl'],
    description: 'New project',
    category: 'actions',
    action,
  }),
  search: (action: () => void): KeyboardShortcut => ({
    key: '/',
    description: 'Focus search',
    category: 'navigation',
    action,
  }),
  escape: (action: () => void): KeyboardShortcut => ({
    key: 'Escape',
    description: 'Close / Cancel',
    category: 'general',
    action,
  }),
  generate: (action: () => void): KeyboardShortcut => ({
    key: 'g',
    description: 'Generate design',
    category: 'editor',
    action,
  }),
  quote: (action: () => void): KeyboardShortcut => ({
    key: 'q',
    description: 'Generate quote',
    category: 'actions',
    action,
  }),
};

export default useKeyboardShortcuts;
