import { describe, expect, it } from "vitest";
import { normalizeVersions } from "@/shared/utils/versions";

function makeVersion(id: number, dateUpload: string, numero = "v-raw") {
  return {
    id,
    livrableId: 10,
    livrableNom: "Doc",
    numero,
    fichierUrl: "/files/demo",
    dateUpload,
    noteInterne: null,
    statut: "REVIEWED",
    commentaires: [],
    annotations: [],
    validations: [],
  } as const;
}

describe("normalizeVersions", () => {
  it("returns empty for empty input", () => {
    expect(normalizeVersions([])).toEqual([]);
  });

  it("deduplicates and renumbers latest-first", () => {
    const output = normalizeVersions([
      makeVersion(2, "2024-03-01T00:00:00.000Z"),
      makeVersion(1, "2024-01-01T00:00:00.000Z"),
      makeVersion(2, "2024-03-01T00:00:00.000Z"), // duplicate by id
    ]);

    expect(output).toHaveLength(2);
    expect(output[0].id).toBe(2);
    expect(output[0].numero).toBe("V2");
    expect(output[1].id).toBe(1);
    expect(output[1].numero).toBe("V1");
  });

  it("keeps FINAL label on latest version", () => {
    const output = normalizeVersions([
      makeVersion(10, "2024-01-01T00:00:00.000Z"),
      makeVersion(11, "2024-02-01T00:00:00.000Z", "V FINAL"),
    ]);

    expect(output[0].id).toBe(11);
    expect(output[0].numero).toBe("V FINAL");
    expect(output[1].numero).toBe("V1");
  });

  it("handles invalid dates with stable ordering", () => {
    const output = normalizeVersions([
      makeVersion(4, "invalid-date"),
      makeVersion(3, "invalid-date"),
      makeVersion(5, "2025-01-01T00:00:00.000Z"),
    ]);

    expect(output.map((v) => v.id)).toEqual([5, 4, 3]);
    expect(output.map((v) => v.numero)).toEqual(["V3", "V2", "V1"]);
  });
});
