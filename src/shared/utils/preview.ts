// Ce fichier gere une partie du frontend.
export function isTextLikeMimeType(contentType?: string | null): boolean {
  if (!contentType) return false;
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("yaml") ||
    normalized.includes("csv") ||
    normalized.includes("javascript") ||
    normalized.includes("markdown")
  );
}

export function shouldReadTextPreview(deliverableType?: string | null, contentType?: string | null): boolean {
  if ((deliverableType ?? "").toUpperCase() === "TEXTE") return true;
  return isTextLikeMimeType(contentType);
}

export async function isLikelyPdfBlob(blob: Blob, contentType?: string | null): Promise<boolean> {
  const normalized = (contentType ?? "").toLowerCase();
  if (normalized.includes("application/pdf")) return true;
  if (blob.size < 5) return false;
  try {
    const signature = await blob.slice(0, 5).text();
    return signature.startsWith("%PDF-");
  } catch {
    return false;
  }
}