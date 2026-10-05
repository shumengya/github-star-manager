import { useState } from "react";
import { useTranslation } from "react-i18next";
import dialog from "../styles/dialog.module.css";
import controls from "../styles/controls.module.css";

type PatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (token: string) => void;
};

export function PatModal({ isOpen, onClose, onSave }: PatModalProps) {
  const { t } = useTranslation();
  const [token, setToken] = useState("");

  if (!isOpen) return null;

  return (
    <div className={dialog.overlay} role="dialog" aria-modal="true">
      <div className={dialog.panel}>
        <h3>{t("patModal.title")}</h3>
        <p>{t("patModal.description")}</p>
        <div className={controls.field}>
          <label htmlFor="pat-input">{t("patModal.tokenLabel")}</label>
          <input
            id="pat-input"
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="ghp_..."
          />
        </div>
        <div className={controls.actions}>
          <button className={controls.button} onClick={onClose}>
            {t("common.actions.cancel")}
          </button>
          <button
            className={`${controls.button} ${controls.primary}`}
            onClick={() => {
              if (!token.trim()) return;
              onSave(token.trim());
              setToken("");
            }}
          >
            {t("patModal.savePat")}
          </button>
        </div>
      </div>
    </div>
  );
}
