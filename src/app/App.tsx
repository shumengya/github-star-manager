import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { detectBrowserLanguage, resolveEffectiveLanguage } from "./i18n/language";
import { isLastSyncStale, retryListMembership, syncFromGitHub } from "./core/githubSync";
import { unstarRepoFromGitHub } from "./core/unstarRepo";
import { db } from "./data/db";
import { useLiveQuery } from "./data/useLiveQuery";
import { ListRail } from "./layout/ListRail";
import { RepoCatalog } from "./layout/RepoCatalog";
import { validatePat } from "./services/githubAuth";
import { getPreferenceSnapshot, usePreferenceStore } from "./store/preferences";
import controls from "./styles/controls.module.css";
import shell from "./layout/AppShell.module.css";
import { formatIsoDate, type ListPreview, type RepoPreview } from "./types/repo";
import { AssignListModal } from "./ui/AssignListModal";
import { BrandMark } from "./ui/BrandMark";
import { FirstRunPrompt } from "./ui/FirstRunPrompt";
import { ManageListsModal } from "./ui/ManageListsModal";
import { PatModal } from "./ui/PatModal";
import { PatRequiredPrompt } from "./ui/PatRequiredPrompt";
import { SettingsModal } from "./ui/SettingsModal";

const previewRepos: RepoPreview[] = [];
const previewLists: ListPreview[] = [
  { id: "all", name: "", count: 0 },
  { id: "unclassified", name: "", count: 0 },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const { preferences, setReadmeOptIn, markOnboarded, setPatToken, setLastSyncedAt } =
    usePreferenceStore();
  const [activeList, setActiveList] = useState("all");
  const [isPatModalOpen, setIsPatModalOpen] = useState(false);
  const [patIntroDismissed, setPatIntroDismissed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [assignRepo, setAssignRepo] = useState<{ id: string; name: string } | null>(null);
  const [failedListIds, setFailedListIds] = useState<string[]>([]);
  const [listSidebarOpen, setListSidebarOpen] = useState(false);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [showUnlisted, setShowUnlisted] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [unstarBusyId, setUnstarBusyId] = useState<string | null>(null);
  const unstarLock = useRef(false);
  const syncLock = useRef(false);
  const autoStaleSyncStarted = useRef(false);

  const browserLanguage = useMemo(() => detectBrowserLanguage(), []);
  const effectiveLanguage = useMemo(
    () => resolveEffectiveLanguage(preferences.uiLanguage, browserLanguage),
    [preferences.uiLanguage, browserLanguage]
  );

  useEffect(() => {
    void i18n.changeLanguage(effectiveLanguage);
    document.documentElement.lang = effectiveLanguage;
  }, [i18n, effectiveLanguage]);

  const runSync = useCallback(async (): Promise<boolean> => {
    const token = getPreferenceSnapshot().patToken.trim();
    if (!token) {
      setIsPatModalOpen(true);
      return false;
    }
    if (syncLock.current) return false;
    syncLock.current = true;
    setIsSyncing(true);
    try {
      const result = await syncFromGitHub({ token });
      setFailedListIds(result.failedListIds);
      setLastSyncedAt(new Date().toISOString());
      return true;
    } catch (error) {
      window.alert((error as Error).message || t("app.sync.detail.syncFailed"));
      return false;
    } finally {
      syncLock.current = false;
      setIsSyncing(false);
    }
  }, [setLastSyncedAt, t]);

  useEffect(() => {
    const onInteract = () => {
      const { patToken, lastSyncedAt } = getPreferenceSnapshot();
      if (!patToken.trim() || !isLastSyncStale(lastSyncedAt)) return;
      if (autoStaleSyncStarted.current || syncLock.current) return;
      autoStaleSyncStarted.current = true;
      void runSync().then((ok) => {
        if (!ok) autoStaleSyncStarted.current = false;
      });
    };
    window.addEventListener("pointerdown", onInteract);
    return () => window.removeEventListener("pointerdown", onInteract);
  }, [runSync]);

  const handleUnstar = useCallback(
    async (repo: { id: string; name: string }) => {
      const token = getPreferenceSnapshot().patToken.trim();
      if (!token) {
        setIsPatModalOpen(true);
        return;
      }
      const ok = window.confirm(t("app.sync.detail.unstarConfirm", { name: repo.name }));
      if (!ok) return;
      if (unstarLock.current) return;
      unstarLock.current = true;
      setUnstarBusyId(repo.id);
      try {
        await unstarRepoFromGitHub({ token }, repo.id);
      } catch (error) {
        window.alert((error as Error).message || t("app.sync.detail.unstarFailed"));
      } finally {
        unstarLock.current = false;
        setUnstarBusyId(null);
      }
    },
    [t]
  );

  const showPatRequiredPrompt =
    !preferences.patToken.trim() && !patIntroDismissed && !isPatModalOpen;

  useEffect(() => {
    if (showPatRequiredPrompt || !preferences.hasCompletedOnboarding) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [showPatRequiredPrompt, preferences.hasCompletedOnboarding]);

  const lists = useLiveQuery(
    async () => {
      const listRows = await db.lists.toArray();
      const repoListRows = await db.repoLists.toArray();
      const repoListMap = new Map(repoListRows.map((row) => [row.repoId, row.listIds]));
      const countMap = new Map<string, number>();
      for (const row of repoListRows) {
        for (const listId of row.listIds) {
          countMap.set(listId, (countMap.get(listId) ?? 0) + 1);
        }
      }

      const listCounts = listRows.map((list) => ({
        id: list.id,
        name: list.name,
        count: countMap.get(list.id) ?? 0,
      }));
      const repoRows = await db.repos.toArray();
      let unclassifiedCount = 0;
      for (const repo of repoRows) {
        const ids = repoListMap.get(repo.id);
        if (!ids || ids.length === 0) unclassifiedCount += 1;
      }
      const total = repoRows.length;
      return [
        { id: "all", name: "", count: total },
        { id: "unclassified", name: "", count: unclassifiedCount },
        ...listCounts,
      ];
    },
    [],
    previewLists
  );

  const repos = useLiveQuery(
    async () => {
      const repoRows = await db.repos.toArray();
      const listMap = new Map<string, string>();
      const listRows = await db.lists.toArray();
      for (const list of listRows) listMap.set(list.id, list.name);

      const repoListRows = await db.repoLists.toArray();
      const repoListLookup = new Map(repoListRows.map((row) => [row.repoId, row.listIds]));

      return repoRows.map((repo) => ({
        id: repo.id,
        name: repo.fullName,
        description: repo.description || "",
        tags: (repoListLookup.get(repo.id) || [])
          .map((listId) => listMap.get(listId))
          .filter((name): name is string => Boolean(name))
          .slice(0, 4),
        topics: repo.topics ?? [],
        language: repo.language,
        languageColor: repo.languageColor,
        stars: repo.stargazerCount,
        forks: repo.forkCount,
        openIssues: repo.openIssuesCount,
        license: repo.license,
        homepageUrl: repo.homepageUrl,
        repoUrl: repo.repoUrl,
        ownerAvatarUrl: repo.ownerAvatarUrl,
        parentFullName: repo.parentFullName,
        isArchived: repo.isArchived,
        isFork: repo.isFork,
        isTemplate: repo.isTemplate,
        updatedAt: repo.updatedAt,
        pushedAt: repo.pushedAt,
        starredAt: repo.starredAt,
      }));
    },
    [],
    previewRepos
  );

  const languageOptions = useMemo(() => {
    const set = new Set<string>();
    for (const repo of repos) {
      if (repo.language) set.add(repo.language);
    }
    return ["all", ...Array.from(set).sort()];
  }, [repos]);

  const visibleRepos = useMemo(() => {
    if (activeList === "all") return repos;
    if (activeList === "unclassified") return repos.filter((repo) => repo.tags.length === 0);
    const listName = lists.find((list) => list.id === activeList)?.name;
    if (!listName) return [];
    return repos.filter((repo) => repo.tags.includes(listName));
  }, [activeList, repos, lists]);

  const activeListLabel = useMemo(() => {
    const item = lists.find((l) => l.id === activeList);
    if (!item) return "";
    if (item.id === "all") return t("common.values.allStarred");
    if (item.id === "unclassified") return t("common.values.unclassified");
    return item.name;
  }, [lists, activeList, t]);

  const filteredRepos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const threshold = Date.now() - 1000 * 60 * 60 * 24 * 180;
    return visibleRepos.filter((repo) => {
      if (query) {
        const haystack =
          `${repo.name} ${repo.description} ${repo.topics.join(" ")} ${repo.license ?? ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (languageFilter !== "all" && repo.language !== languageFilter) return false;
      if (showUnlisted && repo.tags.length > 0) return false;
      if (recentOnly) {
        const activityAt = Date.parse(repo.pushedAt || repo.updatedAt || "");
        if (!Number.isNaN(activityAt) && activityAt < threshold) return false;
      }
      return true;
    });
  }, [visibleRepos, languageFilter, showUnlisted, recentOnly, searchQuery]);

  useEffect(() => {
    if (activeList === "all") return;
    const exists = lists.some((list) => list.id === activeList);
    if (!exists) setActiveList("all");
  }, [activeList, lists]);

  useEffect(() => {
    if (!listSidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setListSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listSidebarOpen]);

  useEffect(() => {
    if (!listSidebarOpen) return;
    const mq = window.matchMedia("(max-width: 1100px)");
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [listSidebarOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1101px)");
    const close = () => {
      if (mq.matches) setListSidebarOpen(false);
    };
    mq.addEventListener("change", close);
    close();
    return () => mq.removeEventListener("change", close);
  }, []);

  return (
    <div className={shell.shell}>
      <header className={shell.header}>
        <div className={shell.brand}>
          <div className={shell.logo}>
            <BrandMark size={40} />
          </div>
          <div>
            <h1 className={shell.title}>{t("common.appName")}</h1>
            <p className={shell.subtitle}>{t("app.subtitle")}</p>
          </div>
        </div>
        <div className={shell.actions}>
          {isSyncing ? (
            <span className={shell.synced}>{t("app.sync.status.running")}</span>
          ) : preferences.lastSyncedAt ? (
            <span className={shell.synced}>
              {t("app.sync.status.completed")} {formatIsoDate(preferences.lastSyncedAt)}
            </span>
          ) : null}
          <button className={controls.button} onClick={() => setIsPatModalOpen(true)}>
            {preferences.viewerLogin
              ? `PAT: ${preferences.viewerLogin}`
              : t("app.actions.connectPat")}
          </button>
          <button className={controls.button} onClick={() => setIsSettingsOpen(true)}>
            {t("common.actions.settings")}
          </button>
          <button
            className={`${controls.button} ${controls.primary}`}
            disabled={isSyncing}
            onClick={() => {
              void runSync();
            }}
          >
            {t("app.actions.syncStarLists")}
          </button>
          {failedListIds.length > 0 ? (
            <button
              className={controls.button}
              onClick={async () => {
                if (!preferences.patToken) return;
                try {
                  const result = await retryListMembership(
                    { token: preferences.patToken },
                    failedListIds
                  );
                  setFailedListIds(result.failedListIds);
                } catch (error) {
                  window.alert((error as Error).message || t("app.sync.detail.retryFailed"));
                }
              }}
            >
              {t("app.actions.retryFailedLists", { count: failedListIds.length })}
            </button>
          ) : null}
        </div>
      </header>

      <main className={shell.main}>
        {listSidebarOpen ? (
          <div className={shell.backdrop} aria-hidden onClick={() => setListSidebarOpen(false)} />
        ) : null}
        <ListRail
          lists={lists}
          activeList={activeList}
          open={listSidebarOpen}
          onSelect={(id) => {
            setActiveList(id);
            setListSidebarOpen(false);
          }}
          onClose={() => setListSidebarOpen(false)}
          onManage={() => setIsManageListsOpen(true)}
        />
        <RepoCatalog
          repos={repos}
          filteredRepos={filteredRepos}
          languageOptions={languageOptions}
          languageFilter={languageFilter}
          showUnlisted={showUnlisted}
          recentOnly={recentOnly}
          searchQuery={searchQuery}
          activeListLabel={activeListLabel}
          onOpenRail={() => setListSidebarOpen(true)}
          onLanguageFilter={setLanguageFilter}
          onShowUnlisted={setShowUnlisted}
          onRecentOnly={setRecentOnly}
          onSearch={setSearchQuery}
          onAssign={setAssignRepo}
          onUnstar={(repo) => {
            void handleUnstar(repo);
          }}
          unstarBusyId={unstarBusyId}
        />
      </main>

      {showPatRequiredPrompt ? (
        <PatRequiredPrompt
          onEnterToken={() => setIsPatModalOpen(true)}
          onLater={() => setPatIntroDismissed(true)}
        />
      ) : !preferences.hasCompletedOnboarding ? (
        <FirstRunPrompt
          onConfirm={(value) => {
            setReadmeOptIn(value);
            markOnboarded();
          }}
          onSkip={() => {
            setReadmeOptIn(false);
            markOnboarded();
          }}
        />
      ) : null}
      <PatModal
        isOpen={isPatModalOpen}
        onClose={() => {
          setIsPatModalOpen(false);
        }}
        onSave={async (token) => {
          try {
            const viewer = await validatePat(token);
            setPatToken(token, viewer.login);
            setIsPatModalOpen(false);
          } catch (error) {
            window.alert((error as Error).message || t("app.sync.detail.tokenValidationFailed"));
          }
        }}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ManageListsModal
        isOpen={isManageListsOpen}
        onClose={() => setIsManageListsOpen(false)}
        patToken={preferences.patToken}
        onRequestToken={() => setIsPatModalOpen(true)}
      />
      {assignRepo ? (
        <AssignListModal
          isOpen={Boolean(assignRepo)}
          repoId={assignRepo.id}
          repoName={assignRepo.name}
          patToken={preferences.patToken}
          onClose={() => setAssignRepo(null)}
          onRequestToken={() => setIsPatModalOpen(true)}
        />
      ) : null}
    </div>
  );
}
