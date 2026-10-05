import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { purgeListFromLocalStores } from "../core/purgeListLocal";
import { db } from "../data/db";
import { useLiveQuery } from "../data/useLiveQuery";
import {
  createUserList,
  deleteUserListOnGitHub,
  updateUserListOnGitHub,
} from "../services/githubStarLists";
import dialog from "../styles/dialog.module.css";
import controls from "../styles/controls.module.css";
import lists from "./lists.module.css";

type ManageListsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  patToken: string;
  onRequestToken?: () => void;
};

export function ManageListsModal({
  isOpen,
  onClose,
  patToken,
  onRequestToken,
}: ManageListsModalProps) {
  const { t } = useTranslation();
  const listRows = useLiveQuery(async () => db.lists.orderBy("name").toArray(), [], []);
  const repoListRows = useLiveQuery(async () => db.repoLists.toArray(), [], []);

  const countByList = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of repoListRows) {
      for (const id of row.listIds) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [repoListRows]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setEditingId(null);
    setName("");
    setDescription("");
    setIsPrivate(false);
  }, [isOpen]);

  const startEdit = (listId: string) => {
    const row = listRows.find((l) => l.id === listId);
    if (!row) return;
    setEditingId(listId);
    setName(row.name);
    setDescription(row.description ?? "");
    setIsPrivate(row.isPrivate);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setIsPrivate(false);
    setError("");
  };

  const requirePat = (): boolean => {
    if (patToken.trim()) return true;
    setError(t("listManage.needPat"));
    onRequestToken?.();
    return false;
  };

  const handleSubmit = async () => {
    if (!requirePat()) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("listManage.nameRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editingId) {
        const updated = await updateUserListOnGitHub({ token: patToken }, editingId, {
          name: trimmed,
          description: description.trim(),
          isPrivate,
        });
        await db.lists.put({
          id: updated.id,
          name: updated.name,
          description: updated.description,
          isPrivate,
        });
        cancelEdit();
      } else {
        const ref = await createUserList({ token: patToken }, trimmed, isPrivate, description.trim());
        await db.lists.put({
          id: ref.id,
          name: ref.name,
          description: description.trim(),
          isPrivate,
        });
        setName("");
        setDescription("");
        setIsPrivate(false);
      }
    } catch (e) {
      setError((e as Error).message || t("listManage.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (listId: string, listName: string) => {
    if (!requirePat()) return;
    if (!window.confirm(t("listManage.deleteConfirm", { name: listName }))) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteUserListOnGitHub({ token: patToken }, listId);
      await purgeListFromLocalStores(listId);
      if (editingId === listId) cancelEdit();
    } catch (e) {
      setError((e as Error).message || t("listManage.deleteFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={dialog.overlay} role="dialog" aria-modal="true">
      <div className={dialog.panel}>
        <button className={dialog.close} onClick={onClose} aria-label={t("listManage.closeAria")}>
          ✕
        </button>
        <h3>{t("listManage.title")}</h3>
        <p>{t("listManage.intro")}</p>

        <div className={dialog.section}>
          <h4>{editingId ? t("listManage.editSection") : t("listManage.createSection")}</h4>
          <div className={controls.field}>
            <label htmlFor="list-name">{t("listManage.nameLabel")}</label>
            <input
              id="list-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className={controls.field}>
            <label htmlFor="list-desc">{t("listManage.descriptionLabel")}</label>
            <textarea
              id="list-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </div>
          <label className={controls.check}>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={busy}
            />
            {t("listManage.isPrivate")}
          </label>
          <div className={controls.actions}>
            <button
              className={`${controls.button} ${controls.primary}`}
              type="button"
              onClick={handleSubmit}
              disabled={busy}
            >
              {busy
                ? editingId
                  ? t("listManage.status.saving")
                  : t("listManage.status.creating")
                : editingId
                  ? t("listManage.save")
                  : t("listManage.create")}
            </button>
            {editingId ? (
              <button className={controls.button} type="button" onClick={cancelEdit} disabled={busy}>
                {t("listManage.cancelEdit")}
              </button>
            ) : null}
          </div>
        </div>

        <div className={dialog.section}>
          <h4>{t("listManage.existingSection")}</h4>
          {listRows.length === 0 ? (
            <p className={controls.muted}>{t("listManage.empty")}</p>
          ) : (
            <div className={lists.table}>
              <div className={lists.head}>
                <span>{t("listManage.nameLabel")}</span>
                <span>{t("listManage.reposColumn")}</span>
                <span>{t("listManage.actionsColumn")}</span>
              </div>
              {listRows.map((list) => (
                <div className={lists.row} key={list.id}>
                  <span title={list.description || undefined}>{list.name}</span>
                  <span>{countByList.get(list.id) ?? 0}</span>
                  <span className={lists.rowActions}>
                    <button type="button" className={controls.button} onClick={() => startEdit(list.id)} disabled={busy}>
                      {t("listManage.edit")}
                    </button>
                    <button
                      type="button"
                      className={controls.button}
                      onClick={() => handleDelete(list.id, list.name)}
                      disabled={busy}
                    >
                      {t("listManage.delete")}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? <p className={controls.muted}>{error}</p> : null}
      </div>
    </div>
  );
}
