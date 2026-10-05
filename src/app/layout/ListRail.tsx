import { useTranslation } from "react-i18next";
import controls from "../styles/controls.module.css";
import styles from "./ListRail.module.css";
import type { ListPreview } from "../types/repo";

type ListRailProps = {
  lists: ListPreview[];
  activeList: string;
  open: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onManage: () => void;
};

export function ListRail({ lists, activeList, open, onSelect, onClose, onManage }: ListRailProps) {
  const { t } = useTranslation();
  const hasCustom = lists.some((list) => list.id !== "all" && list.id !== "unclassified");

  return (
    <section className={`${styles.rail} ${open ? styles.open : ""} scroll`}>
      <div className={styles.head}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={t("app.nav.closeListSidebar")}>
          ✕
        </button>
        <h2>{t("app.sections.starLists")}</h2>
        <button type="button" className={controls.button} onClick={onManage}>
          {t("app.actions.manageLists")}
        </button>
      </div>
      {hasCustom ? null : <p className={styles.hint}>{t("app.empty.noListsHint")}</p>}
      {lists.map((list) => (
        <button
          key={list.id}
          type="button"
          className={`${styles.item} ${activeList === list.id ? styles.active : ""}`}
          onClick={() => onSelect(list.id)}
        >
          <span>
            {list.id === "all"
              ? t("common.values.allStarred")
              : list.id === "unclassified"
                ? t("common.values.unclassified")
                : list.name}
          </span>
          <span className={styles.count}>{list.count}</span>
        </button>
      ))}
    </section>
  );
}
