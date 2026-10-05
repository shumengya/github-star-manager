import { useTranslation } from "react-i18next";
import controls from "../styles/controls.module.css";
import { formatIsoDate, type RepoPreview } from "../types/repo";
import styles from "./RepoRow.module.css";

type RepoRowProps = {
  repo: RepoPreview;
  onAssign: () => void;
  onUnstar: () => void;
  unstarBusy?: boolean;
};

export function RepoRow({ repo, onAssign, onUnstar, unstarBusy }: RepoRowProps) {
  const { t } = useTranslation();

  return (
    <article className={styles.row}>
      {repo.ownerAvatarUrl ? (
        <img
          className={styles.avatar}
          src={repo.ownerAvatarUrl}
          alt=""
          width={32}
          height={32}
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span />
      )}
      <div className={styles.body}>
        <h3 className={styles.title}>
          {repo.repoUrl ? (
            <a href={repo.repoUrl} target="_blank" rel="noreferrer">
              {repo.name}
            </a>
          ) : (
            repo.name
          )}
        </h3>
        <p className={styles.desc}>{repo.description || t("app.values.noDescription")}</p>
        {repo.parentFullName ? (
          <p className={styles.parent}>{t("app.repo.forkedFrom", { name: repo.parentFullName })}</p>
        ) : null}
        <div className={styles.tags}>
          {repo.tags.map((tag) => (
            <span className={styles.tag} key={tag}>
              {tag}
            </span>
          ))}
          {repo.topics.slice(0, 6).map((topic) => (
            <span className={styles.topic} key={topic}>
              {topic}
            </span>
          ))}
        </div>
        <div className={styles.meta}>
          <span className={styles.lang}>
            {repo.languageColor ? (
              <span className={styles.dot} style={{ background: repo.languageColor }} aria-hidden />
            ) : null}
            {repo.language || t("common.labels.unknown")}
          </span>
          <span>★ {repo.stars ?? 0}</span>
          <span>
            {t("app.repo.forks")} {repo.forks ?? 0}
          </span>
          <span>
            {t("app.repo.issues")} {repo.openIssues ?? 0}
          </span>
          {repo.license ? <span>{repo.license}</span> : null}
          {repo.starredAt ? (
            <span>
              {t("app.repo.starredAt")} {formatIsoDate(repo.starredAt)}
            </span>
          ) : null}
          {repo.pushedAt || repo.updatedAt ? (
            <span>
              {t("app.repo.pushedAt")} {formatIsoDate(repo.pushedAt || repo.updatedAt)}
            </span>
          ) : null}
        </div>
      </div>
      <div className={styles.side}>
        {repo.isArchived || repo.isFork || repo.isTemplate ? (
          <div className={styles.badges}>
            {repo.isArchived ? <span className={styles.badge}>{t("app.repo.archived")}</span> : null}
            {repo.isFork ? <span className={styles.badge}>{t("app.repo.fork")}</span> : null}
            {repo.isTemplate ? <span className={styles.badge}>{t("app.repo.template")}</span> : null}
          </div>
        ) : null}
        {repo.homepageUrl ? (
          <a className={styles.home} href={repo.homepageUrl} target="_blank" rel="noreferrer">
            {t("app.repo.homepage")}
          </a>
        ) : null}
        <button type="button" className={controls.button} onClick={onAssign}>
          {t("app.actions.assignList")}
        </button>
        <button type="button" className={controls.button} onClick={onUnstar} disabled={unstarBusy}>
          {t("app.actions.unstar")}
        </button>
      </div>
    </article>
  );
}
