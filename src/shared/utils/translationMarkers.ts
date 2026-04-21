const REFERENCE_REGEX = /\[Page\s+\d+\]|\[\d{1,2}:[0-5]\d\]|\b\d{1,2}:[0-5]\d\b/g;

type ProtectedReferencesResult = {
  protectedText: string;
  restore: (translated: string) => string;
};

export function protectCommentReferences(text: string): ProtectedReferencesResult {
  const references: string[] = [];
  const protectedText = text.replace(REFERENCE_REGEX, (match) => {
    const token = `[[IKIGAI_REF_${references.length}]]`;
    references.push(match);
    return token;
  });

  const restore = (translated: string) => {
    let result = translated;
    references.forEach((ref, index) => {
      const tokenRegex = new RegExp(`\\[\\[IKIGAI_REF_${index}\\]\\]`, "g");
      result = result.replace(tokenRegex, ref);
    });
    return result;
  };

  return { protectedText, restore };
}
