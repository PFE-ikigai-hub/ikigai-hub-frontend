// Ce fichier gere une partie du frontend.
import type { ApiVersion } from "@/types/index";


function includesFinal(label: unknown): boolean {
  if (typeof label !== "string") return false;
  return label.toLowerCase().includes("final");
}

 * Normalizes version labels to a stable "V1..Vn" sequence (latest-first),
 * mirroring the behavior of the original dashboards.
export function normalizeVersions(versions: ApiVersion[]): ApiVersion[] {
  if (!versions.length) return [];
  const byId = new Map<number, ApiVersion>();
  for (const v of versions) byId.set(v.id, v);

  const unique = Array.from(byId.values());

  const asc = [...unique].sort((a, b) => {
    const ta = new Date(a.dateUpload).getTime();
    const tb = new Date(b.dateUpload).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return a.id - b.id;
    if (Number.isNaN(ta)) return -1;
    if (Number.isNaN(tb)) return 1;
    return ta - tb;
  });

  const last = asc[asc.length - 1];
  const lastIsFinal = includesFinal(last?.numero);

  const renumberedAsc = asc.map((v, i) => ({
    ...v,
    numero: lastIsFinal && i === asc.length - 1 ? "V FINAL" : `V${i + 1}`,
  }));
  return renumberedAsc.reverse();
}