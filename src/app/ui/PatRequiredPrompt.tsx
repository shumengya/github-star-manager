import { useTranslation } from "react-i18next";
import dialog from "../styles/dialog.module.css";
import controls from "../styles/controls.module.css";
import extra from "./PatRequiredPrompt.module.css";

type PatRequiredPromptProps = {
  onEnterToken: () => void;
  onLater: () => void;
};

const TOKEN_CREATE_URL =
  "https://github.com/settings/tokens/new?scopes=repo,user&description=star-manager";

export function PatRequiredPrompt({ onEnterToken, onLater }: PatRequiredPromptProps) {
  const { t } = useTranslation();

  return (
    <div className={dialog.overlay} role="dialog" aria-modal="true" aria-labelledby="pat-required-title">
      <div className={dialog.panel}>
        <h3 id="pat-required-title">{t("patRequired.title")}</h3>
        <p>{t("patRequired.intro")}</p>
        <p>{t("patRequired.classicHint")}</p>
        <ul className={extra.list}>
          <li>
            <code>repo</code>
            <span>{t("patRequired.scopes.repo")}</span>
          </li>
          <li>
            <code>user</code>
            <span>{t("patRequired.scopes.user")}</span>
          </li>
        </ul>
        <p className={extra.note}>{t("patRequired.storageNote")}</p>
        <p>
          <a className={extra.link} href={TOKEN_CREATE_URL} target="_blank" rel="noreferrer">
            {t("patRequired.createLink")}
          </a>
        </p>
        <div className={controls.actions}>
          <button className={controls.button} onClick={onLater}>
            {t("patRequired.later")}
          </button>
          <button className={`${controls.button} ${controls.primary}`} onClick={onEnterToken}>
            {t("patRequired.enterToken")}
          </button>
        </div>
      </div>
    </div>
  );
}
