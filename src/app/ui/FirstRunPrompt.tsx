import { useTranslation } from "react-i18next";
import dialog from "../styles/dialog.module.css";
import controls from "../styles/controls.module.css";

type FirstRunPromptProps = {
  onConfirm: (enableReadme: boolean) => void;
  onSkip: () => void;
};

export function FirstRunPrompt({ onConfirm, onSkip }: FirstRunPromptProps) {
  const { t } = useTranslation();

  return (
    <div className={dialog.overlay} role="dialog" aria-modal="true">
      <div className={`${dialog.panel} scroll`}>
        <h3>{t("onboarding.title")}</h3>
        <p>{t("onboarding.description1")}</p>
        <p>{t("onboarding.description2")}</p>
        <div className={controls.actions}>
          <button className={controls.button} onClick={onSkip}>
            {t("onboarding.skip")}
          </button>
          <button className={`${controls.button} ${controls.primary}`} onClick={() => onConfirm(true)}>
            {t("onboarding.enable")}
          </button>
        </div>
      </div>
    </div>
  );
}
