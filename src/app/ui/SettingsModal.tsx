import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type UiLanguagePreference } from "../i18n/language";
import { validatePat } from "../services/githubAuth";
import { usePreferenceStore } from "../store/preferences";
import dialog from "../styles/dialog.module.css";
import controls from "../styles/controls.module.css";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const { preferences, setReadmeOptIn, setPatToken, setUiLanguage } = usePreferenceStore();
  const [patTokenInput, setPatTokenInput] = useState(preferences.patToken);
  const [patLoginInput, setPatLoginInput] = useState(preferences.viewerLogin);
  const [status, setStatus] = useState("");
  const [isSavingPat, setIsSavingPat] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPatTokenInput(preferences.patToken);
    setPatLoginInput(preferences.viewerLogin);
  }, [isOpen, preferences.patToken, preferences.viewerLogin]);

  if (!isOpen) return null;

  const handleSavePat = async () => {
    const token = patTokenInput.trim();
    if (!token) {
      setStatus(t("settings.pat.required"));
      return;
    }
    setIsSavingPat(true);
    setStatus(t("settings.pat.validating"));
    try {
      const viewer = await validatePat(token);
      setPatToken(token, viewer.login);
      setPatLoginInput(viewer.login);
      setStatus(t("settings.pat.validated", { login: viewer.login }));
    } catch (error) {
      const err = error as Error;
      const name = err?.name || "Error";
      const message = err?.message || "Validation failed";
      setStatus(t("settings.pat.validationFailed", { name, message }));
    } finally {
      setIsSavingPat(false);
    }
  };

  return (
    <div className={dialog.overlay} role="dialog" aria-modal="true">
      <div className={`${dialog.panel} scroll`}>
        <button className={dialog.close} onClick={onClose} aria-label={t("settings.closeAria")}>
          ✕
        </button>
        <h3>{t("settings.title")}</h3>
        <p>{t("settings.description")}</p>

        <div className={dialog.section}>
          <h4>{t("settings.sections.language")}</h4>
          <div className={controls.field}>
            <label htmlFor="ui-language-select">{t("settings.language.appLanguage")}</label>
            <select
              id="ui-language-select"
              value={preferences.uiLanguage}
              onChange={(event) => setUiLanguage(event.target.value as UiLanguagePreference)}
            >
              <option value="auto">{t("settings.language.auto")}</option>
              <option value="en">{t("settings.language.english")}</option>
              <option value="zh-CN">{t("settings.language.chineseSimplified")}</option>
            </select>
          </div>
        </div>

        <div className={dialog.section}>
          <h4>{t("settings.sections.patManagement")}</h4>
          <div className={controls.field}>
            <label htmlFor="pat-token">{t("settings.pat.githubPat")}</label>
            <input
              id="pat-token"
              type="password"
              value={patTokenInput}
              onChange={(event) => setPatTokenInput(event.target.value)}
              placeholder="ghp_..."
            />
          </div>
          <div className={controls.field}>
            <label htmlFor="pat-login">{t("settings.pat.githubLoginOptional")}</label>
            <input
              id="pat-login"
              type="text"
              value={patLoginInput}
              onChange={(event) => setPatLoginInput(event.target.value)}
              placeholder="octocat"
            />
          </div>
          <div className={controls.actions}>
            <button className={controls.button} onClick={handleSavePat} disabled={isSavingPat}>
              {isSavingPat ? t("settings.pat.validating") : t("settings.pat.savePat")}
            </button>
            <button
              className={controls.button}
              onClick={() => {
                setPatToken("", "");
                setPatTokenInput("");
                setPatLoginInput("");
                setStatus(t("settings.pat.cleared"));
              }}
            >
              {t("settings.pat.clearPat")}
            </button>
          </div>
        </div>

        <div className={dialog.section}>
          <h4>{t("settings.sections.readmeFetching")}</h4>
          <label className={controls.check}>
            <input
              type="checkbox"
              checked={preferences.readmeOptIn}
              onChange={(event) => setReadmeOptIn(event.target.checked)}
            />
            {t("settings.readme.enable")}
          </label>
        </div>

        <div className={dialog.section}>
          <h4>{t("settings.sections.localCache")}</h4>
          <p className={controls.muted}>{t("settings.cache.help")}</p>
          <div className={controls.actions}>
            <button
              className={controls.button}
              onClick={() => {
                indexedDB.deleteDatabase("star-manager");
                setStatus(t("settings.cache.cleared"));
                setTimeout(() => window.location.reload(), 300);
              }}
            >
              {t("settings.cache.clearButton")}
            </button>
          </div>
        </div>

        {status ? <p className={controls.muted}>{status}</p> : null}
      </div>
    </div>
  );
}
