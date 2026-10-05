import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { setRepoListMembership } from "../core/repoListAssignments";
import { syncRepoListAssignmentToGitHub } from "../core/syncRepoListToGitHub";
import { db } from "../data/db";
import { useLiveQuery } from "../data/useLiveQuery";
import dialog from "../styles/dialog.module.css";
import controls from "../styles/controls.module.css";
import lists from "./lists.module.css";

type AssignListModalProps = {
  isOpen: boolean;
  repoId: string;
  repoName: string;
  patToken: string;
  onClose: () => void;
  onRequestToken?: () => void;
};

export function AssignListModal({
  isOpen,
  repoId,
  repoName,
  patToken,
  onClose,
  onRequestToken,
}: AssignListModalProps) {
  const { t } = useTranslation();
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

  const listRows = useLiveQuery(async () => db.lists.orderBy("name").toArray(), [], []);
  const repoList = useLiveQuery(async () => db.repoLists.get(repoId), [repoId], undefined);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedListIds(repoList?.listIds ?? []);
    setStatus("");
  }, [isOpen, repoId, repoList?.listIds]);

  const selectedSet = useMemo(() => new Set(selectedListIds), [selectedListIds]);

  if (!isOpen) return null;

  const toggleList = (listId: string) => {
    setSelectedListIds((prev) => {
      const has = prev.includes(listId);
      if (has) return prev.filter((id) => id !== listId);
      return [...prev, listId];
    });
  };

  const handleSave = async () => {
    if (!patToken.trim()) {
      setStatus(t("assignList.status.needPat"));
      onRequestToken?.();
      return;
    }
    setIsSaving(true);
    setStatus("");
    try {
      await syncRepoListAssignmentToGitHub({ token: patToken }, repoId, selectedListIds);
      await setRepoListMembership(repoId, selectedListIds);
      setIsSaving(false);
      onClose();
    } catch (error) {
      setIsSaving(false);
      setStatus((error as Error).message || t("assignList.status.saveFailed"));
    }
  };

  return (
    <div className={dialog.overlay} role="dialog" aria-modal="true">
      <div className={`${dialog.panel} scroll`}>
        <button className={dialog.close} onClick={onClose} aria-label={t("assignList.closeAria")}>
          ✕
        </button>
        <h3>{t("assignList.title")}</h3>
        <p>{t("assignList.description", { repoName })}</p>
        <div className={dialog.section}>
          <h4>{t("assignList.sections.lists")}</h4>
          {listRows.length === 0 ? (
            <p className={controls.muted}>{t("assignList.status.noLists")}</p>
          ) : (
            <div className={lists.grid}>
              {listRows.map((list) => (
                <label className={lists.item} key={list.id}>
                  <input
                    type="checkbox"
                    checked={selectedSet.has(list.id)}
                    onChange={() => toggleList(list.id)}
                  />
                  <span>{list.name}</span>
                </label>
              ))}
            </div>
          )}
          <div className={controls.actions}>
            <button className={controls.button} onClick={() => setSelectedListIds([])} disabled={isSaving}>
              {t("common.actions.clear")}
            </button>
            <button className={`${controls.button} ${controls.primary}`} onClick={handleSave} disabled={isSaving}>
              {isSaving ? t("assignList.status.saving") : t("common.actions.save")}
            </button>
          </div>
          {status ? <p className={controls.muted}>{status}</p> : null}
        </div>
      </div>
    </div>
  );
}
