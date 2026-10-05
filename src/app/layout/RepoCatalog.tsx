import { useTranslation } from "react-i18next";
import controls from "../styles/controls.module.css";
import type { RepoPreview } from "../types/repo";
import styles from "./RepoCatalog.module.css";
import { RepoRow } from "./RepoRow";

type RepoCatalogProps = {
  repos: RepoPreview[];
  filteredRepos: RepoPreview[];
  languageOptions: string[];
  languageFilter: string;
  showUnlisted: boolean;
  recentOnly: boolean;
  searchQuery: string;
  activeListLabel: string;
  onOpenRail: () => void;
  onLanguageFilter: (value: string) => void;
  onShowUnlisted: (value: boolean) => void;
  onRecentOnly: (value: boolean) => void;
  onSearch: (value: string) => void;
  onAssign: (repo: { id: string; name: string }) => void;
};

export function RepoCatalog({
  repos,
  filteredRepos,
  languageOptions,
  languageFilter,
  showUnlisted,
  recentOnly,
  searchQuery,
  activeListLabel,
  onOpenRail,
  onLanguageFilter,
  onShowUnlisted,
  onRecentOnly,
  onSearch,
  onAssign,
}: RepoCatalogProps) {
  const { t } = useTranslation();

  return (
    <section className={styles.catalog}>
      <div className={styles.toolbar}>
        <button type="button" className={`${controls.button} ${styles.openRail}`} onClick={onOpenRail}>
          <span aria-hidden>☰</span>
          <span>{t("app.nav.openStarLists")}</span>
          <span className={styles.current}>{activeListLabel}</span>
        </button>
      </div>
      <h2 className={styles.heading}>{t("app.sections.repositories")}</h2>
      {repos.length === 0 ? (
        <div className={styles.empty}>
          <img src="/favicon.svg" alt="" width={48} height={48} />
          <p>{t("app.empty.noDataTitle")}</p>
          <p className={styles.hint}>{t("app.empty.noDataHint")}</p>
        </div>
      ) : (
        <div className={styles.filters}>
          <div className={styles.group}>
            <label htmlFor="language-select">{t("common.labels.language")}</label>
            <select
              id="language-select"
              value={languageFilter}
              onChange={(event) => onLanguageFilter(event.target.value)}
            >
              {languageOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? t("common.values.all") : option}
                </option>
              ))}
            </select>
          </div>
          <label className={controls.check}>
            <input
              type="checkbox"
              checked={showUnlisted}
              onChange={(event) => onShowUnlisted(event.target.checked)}
            />
            {t("app.filters.noList")}
          </label>
          <label className={controls.check}>
            <input
              type="checkbox"
              checked={recentOnly}
              onChange={(event) => onRecentOnly(event.target.checked)}
            />
            {t("app.filters.updatedLastSixMonths")}
          </label>
          <div className={`${styles.group} ${styles.search}`}>
            <label htmlFor="repo-search">{t("common.labels.search")}</label>
            <input
              id="repo-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={t("app.filters.searchPlaceholder")}
            />
          </div>
        </div>
      )}
      {repos.length > 0 && filteredRepos.length === 0 ? (
        <div className={styles.empty}>
          <p>{t("app.empty.noFilteredTitle")}</p>
          <p className={styles.hint}>{t("app.empty.noFilteredHint")}</p>
        </div>
      ) : repos.length === 0 ? null : (
        <div className={styles.rows}>
          {filteredRepos.map((repo) => (
            <RepoRow
              key={repo.id}
              repo={repo}
              onAssign={() => onAssign({ id: repo.id, name: repo.name })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
