import { useCallback, useSyncExternalStore } from "react";
import type { UiLanguagePreference } from "../i18n/language";

type Preferences = {
  hasCompletedOnboarding: boolean;
  readmeOptIn: boolean;
  patToken: string;
  viewerLogin: string;
  lastSyncedAt: string;
  uiLanguage: UiLanguagePreference;
};

const STORAGE_KEY = "star-manager.preferences";

const defaultPreferences: Preferences = {
  hasCompletedOnboarding: false,
  readmeOptIn: false,
  patToken: "",
  viewerLogin: "",
  lastSyncedAt: "",
  uiLanguage: "auto",
};

let cached = readFromStorage();
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): Preferences {
  if (typeof window === "undefined") {
    return { ...defaultPreferences };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultPreferences };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      ...defaultPreferences,
      ...parsed,
    };
  } catch {
    return { ...defaultPreferences };
  }
}

function persist(next: Preferences) {
  cached = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  emitChange();
}

export function usePreferenceStore() {
  const state = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => cached,
    () => cached
  );

  const setReadmeOptIn = useCallback((value: boolean) => {
    persist({ ...cached, readmeOptIn: value });
  }, []);

  const markOnboarded = useCallback(() => {
    persist({ ...cached, hasCompletedOnboarding: true });
  }, []);

  const setPatToken = useCallback((token: string, viewerLogin: string) => {
    persist({ ...cached, patToken: token, viewerLogin });
  }, []);

  const setLastSyncedAt = useCallback((timestamp: string) => {
    persist({ ...cached, lastSyncedAt: timestamp });
  }, []);

  const setUiLanguage = useCallback((value: UiLanguagePreference) => {
    persist({ ...cached, uiLanguage: value });
  }, []);

  return {
    preferences: state,
    setReadmeOptIn,
    markOnboarded,
    setPatToken,
    setLastSyncedAt,
    setUiLanguage,
  };
}

export function getPreferenceSnapshot(): Preferences {
  return cached;
}
