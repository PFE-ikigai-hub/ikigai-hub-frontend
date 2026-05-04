import { describe, expect, it } from "vitest";
import { isLikelyPdfBlob, isTextLikeMimeType, shouldReadTextPreview } from "@/shared/utils/preview";

describe("preview utils", () => {
  it("detects text-like mime types", () => {
    expect(isTextLikeMimeType("text/plain")).toBe(true);
    expect(isTextLikeMimeType("application/json")).toBe(true);
    expect(isTextLikeMimeType("application/xml")).toBe(true);
    expect(isTextLikeMimeType("text/markdown")).toBe(true);
    expect(isTextLikeMimeType("application/octet-stream")).toBe(false);
    expect(isTextLikeMimeType(null)).toBe(false);
  });

  it("decides when to read text preview", () => {
    expect(shouldReadTextPreview("TEXTE", "application/octet-stream")).toBe(true);
    expect(shouldReadTextPreview("IMAGE", "application/json")).toBe(true);
    expect(shouldReadTextPreview("IMAGE", "application/octet-stream")).toBe(false);
  });

  it("detects pdf blobs from mime type or signature", async () => {
    const pngBlob = new Blob(["not-a-pdf"], { type: "image/png" });
    const signatureBlob = {
      size: 100,
      slice: () => ({
        text: async () => "%PDF-",
      }),
    } as unknown as Blob;

    await expect(isLikelyPdfBlob(pngBlob, "application/pdf")).resolves.toBe(true);
    await expect(isLikelyPdfBlob(new Blob(["x"]), "image/png")).resolves.toBe(false);
    await expect(isLikelyPdfBlob(signatureBlob, "application/octet-stream")).resolves.toBe(true);
  });

  it("returns false when reading signature fails", async () => {
    const brokenBlob = {
      size: 100,
      slice: () => ({
        text: async () => {
          throw new Error("cannot read");
        },
      }),
    } as unknown as Blob;

    await expect(isLikelyPdfBlob(brokenBlob)).resolves.toBe(false);
  });
});
