import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { detectBrowserLanguage, resolveEffectiveLanguage } from "./i18n/language";
import { retryListMembership, syncFromGitHub } from "./core/githubSync";
import { db } from "./data/db";
import { useLiveQuery } from "./data/useLiveQuery";
import { validatePat } from "./services/githubAuth";
import { usePreferenceStore } from "./store/preferences";
import { AssignListModal } from "./ui/AssignListModal";
import { FirstRunPrompt } from "./ui/FirstRunPrompt";
import { ManageListsModal } from "./ui/ManageListsModal";
import { PatModal } from "./ui/PatModal";
import { SettingsModal } from "./ui/SettingsModal";

type RepoPreview = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  language?: string | null;
  stars?: number;
  updatedAt?: string;
};

const previewRepos: RepoPreview[] = [];
const previewLists: { id: string; name: string; count: number }[] = [
  { id: "all", name: "", count: 0 },
  { id: "unclassified", name: "", count: 0 },
];

export default function App() {
  const { t, i18n } = useTranslation();
  const { preferences, setReadmeOptIn, markOnboarded, setPatToken, setLastSyncedAt } =
    usePreferenceStore();
  const [activeList, setActiveList] = useState("all");
  const [isPatModalOpen, setIsPatModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [assignRepo, setAssignRepo] = useState<{ id: string; name: string } | null>(null);
  const [failedListIds, setFailedListIds] = useState<string[]>([]);
  const [listSidebarOpen, setListSidebarOpen] = useState(false);
  const [languageFilter, setLanguageFilter] = useState("all");
  const [showUnlisted, setShowUnlisted] = useState(false);
  const [recentOnly, setRecentOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const browserLanguage = useMemo(() => detectBrowserLanguage(), []);
  const effectiveLanguage = useMemo(
    () => resolveEffectiveLanguage(preferences.uiLanguage, browserLanguage),
    [preferences.uiLanguage, browserLanguage]
  );

  useEffect(() => {
    void i18n.changeLanguage(effectiveLanguage);
    document.documentElement.lang = effectiveLanguage;
  }, [i18n, effectiveLanguage]);

  useEffect(() => {
    if (!preferences.hasCompletedOnboarding) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [preferences.hasCompletedOnboarding]);

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
        language: repo.language,
        stars: repo.stargazerCount,
        updatedAt: repo.updatedAt,
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
        const haystack = `${repo.name} ${repo.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (languageFilter !== "all" && repo.language !== languageFilter) return false;
      if (showUnlisted && repo.tags.length > 0) return false;
      if (recentOnly && repo.updatedAt) {
        const updatedAt = Date.parse(repo.updatedAt);
        if (!Number.isNaN(updatedAt) && updatedAt < threshold) return false;
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
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">★</div>
          <div>
            <h1 className="brand-title">{t("common.appName")}</h1>
            <p className="brand-subtitle">{t("app.subtitle")}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="button" onClick={() => setIsPatModalOpen(true)}>
            {preferences.viewerLogin
              ? `PAT: ${preferences.viewerLogin}`
              : t("app.actions.connectPat")}
          </button>
          <button className="button" onClick={() => setIsSettingsOpen(true)}>
            {t("common.actions.settings")}
          </button>
          <button
            className="button primary"
            onClick={async () => {
              if (!preferences.patToken) {
                setIsPatModalOpen(true);
                return;
              }
              try {
                const result = await syncFromGitHub({ token: preferences.patToken });
                setFailedListIds(result.failedListIds);
                setLastSyncedAt(new Date().toISOString());
              } catch (error) {
                window.alert((error as Error).message || t("app.sync.detail.syncFailed"));
              }
            }}
          >
            {t("app.actions.syncStarLists")}
          </button>
          {failedListIds.length > 0 ? (
            <button
              className="button"
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

      <main className="app-main">
        {listSidebarOpen ? (
          <div
            className="list-sidebar-backdrop"
            aria-hidden
            onClick={() => setListSidebarOpen(false)}
          />
        ) : null}
        <section className={`panel panel--star-lists ${listSidebarOpen ? "is-open" : ""}`}>
          <div className="panel-heading panel-heading--list-sidebar">
            <button
              type="button"
              className="list-sidebar-close-btn"
              onClick={() => setListSidebarOpen(false)}
              aria-label={t("app.nav.closeListSidebar")}
            >
              ✕
            </button>
            <h2>{t("app.sections.starLists")}</h2>
            <button type="button" className="button" onClick={() => setIsManageListsOpen(true)}>
              {t("app.actions.manageLists")}
            </button>
          </div>
          {lists.filter((l) => l.id !== "all" && l.id !== "unclassified").length === 0 ? (
            <p className="helper-text list-panel-hint">{t("app.empty.noListsHint")}</p>
          ) : null}
          {lists.map((list) => (
            <div
              key={list.id}
              className={`list-item ${activeList === list.id ? "active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveList(list.id);
                setListSidebarOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setActiveList(list.id);
                  setListSidebarOpen(false);
                }
              }}
            >
              <span>
                {list.id === "all"
                  ? t("common.values.allStarred")
                  : list.id === "unclassified"
                    ? t("common.values.unclassified")
                    : list.name}
              </span>
              <span>{list.count}</span>
            </div>
          ))}
        </section>

        <section className="panel panel--repos">
          <div className="repo-panel-toolbar">
            <button
              type="button"
              className="button list-sidebar-open-btn"
              onClick={() => setListSidebarOpen(true)}
            >
              <span className="list-sidebar-open-icon" aria-hidden>
                ☰
              </span>
              <span className="list-sidebar-open-text">{t("app.nav.openStarLists")}</span>
              <span className="list-sidebar-active-chip">{activeListLabel}</span>
            </button>
          </div>
          <h2>{t("app.sections.repositories")}</h2>
          {repos.length === 0 ? (
            <div className="empty-state">
              <p>{t("app.empty.noDataTitle")}</p>
              <p>{t("app.empty.noDataHint")}</p>
            </div>
          ) : (
            <div className="filters">
              <div className="filter-group">
                <label htmlFor="language-select">{t("common.labels.language")}</label>
                <select
                  id="language-select"
                  value={languageFilter}
                  onChange={(event) => setLanguageFilter(event.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? t("common.values.all") : option}
                    </option>
                  ))}
                </select>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={showUnlisted}
                  onChange={(event) => setShowUnlisted(event.target.checked)}
                />
                {t("app.filters.noList")}
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={recentOnly}
                  onChange={(event) => setRecentOnly(event.target.checked)}
                />
                {t("app.filters.updatedLastSixMonths")}
              </label>
              <div className="filter-group search">
                <label htmlFor="repo-search">{t("common.labels.search")}</label>
                <input
                  id="repo-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("app.filters.searchPlaceholder")}
                />
              </div>
            </div>
          )}
          {repos.length > 0 && filteredRepos.length === 0 ? (
            <div className="empty-state">
              <p>{t("app.empty.noFilteredTitle")}</p>
              <p>{t("app.empty.noFilteredHint")}</p>
            </div>
          ) : repos.length === 0 ? null : (
            <div className="repo-grid">
              {filteredRepos.map((repo) => (
                <article key={repo.id} className="repo-card">
                  <h3 className="repo-title">{repo.name}</h3>
                  <p className="repo-desc">{repo.description || t("app.values.noDescription")}</p>
                  <div className="repo-tags">
                    {repo.tags.map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="repo-meta">
                    <span>{repo.language || t("common.labels.unknown")}</span>
                    <span>★ {repo.stars ?? 0}</span>
                  </div>
                  <button
                    className="button"
                    onClick={() => setAssignRepo({ id: repo.id, name: repo.name })}
                  >
                    {t("app.actions.assignList")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {!preferences.hasCompletedOnboarding ? (
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
        onClose={() => setIsPatModalOpen(false)}
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
