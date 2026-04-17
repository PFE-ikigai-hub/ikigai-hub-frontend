import { useEffect } from "react";
import { useTranslateText } from "@/shared/hooks/useTranslateText";
import { useI18n } from "@/core/i18n/I18nProvider";

type TranslatedTextProps = {
  text: string;
  className?: string;
  showLoader?: boolean;
};

export function TranslatedText({ text, className = "", showLoader = true }: TranslatedTextProps) {
  const { language } = useI18n();
  const { translated, isTranslating, translate, error } = useTranslateText();

  useEffect(() => {
    if (text) translate(text);
  }, [text, language, translate]);

  if (isTranslating && showLoader) {
    return (
      <span className={`inline-flex items-center gap-1.5 opacity-60 ${className}`}>
        <span
          className="inline-block w-3 h-3 border border-[#6893e8]/35 border-t-[#c510ea] rounded-full animate-spin"
          style={{ verticalAlign: "middle" }}
        />
        <span className="italic">{text}</span>
      </span>
    );
  }

  const cleanedTranslated = typeof translated === "string" ? translated.trim() : "";
  const cleanedOriginal = text?.trim?.() ?? "";

  return (
    <span className={className}>
      {error || !cleanedTranslated || cleanedTranslated === cleanedOriginal ? text : translated}
    </span>
  );
}
