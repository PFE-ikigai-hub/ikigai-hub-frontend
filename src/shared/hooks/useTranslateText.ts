import { useCallback, useState } from "react";
import { useI18n } from "@/core/i18n/I18nProvider";
import { translationApi } from "@/core/api/client";
import { protectCommentReferences } from "@/shared/utils/translationMarkers";


const LANG_MAP: Record<string, string> = {
  FR: "fr",
  EN: "en",
  AR: "ar",
};

export function useTranslateText() {
  const { language } = useI18n();

  const [translated, setTranslated] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(false);

  const translate = useCallback(
    async (text: string) => {
      const target = LANG_MAP[language] ?? "en";

      setIsTranslating(true);
      setError(false);
      try {
        const { protectedText, restore } = protectCommentReferences(text);
        const translatedText = await translationApi.translate(protectedText, target);
        setTranslated(restore(translatedText || ""));
      } catch {
        setError(true);
        setTranslated(null);
      } finally {
        setIsTranslating(false);
      }
    },
    [language]
  );

  const reset = useCallback(() => {
    setTranslated(null);
    setError(false);
  }, []);

  return { translated, isTranslating, error, translate, reset };
}
