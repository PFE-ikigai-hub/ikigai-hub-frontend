import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, History, Trash2 } from "lucide-react";
import { deliverablesApi, versionsApi } from "@/core/api/client";
import { useI18n } from "@/core/i18n/I18nProvider";
import { useToast } from "@/shared/components/ui/toast";
import { DeliverableDetailSkeleton } from "@/shared/components/skeleton";
import { SecureDeleteModal } from "@/modules/admin/components/SecureDeleteModal";
import type { ApiDeliverable, ApiVersion } from "@/types/index";
import { normalizeVersions } from "@/shared/utils/versions";

export function AdminDeliverableDetailPage() {
  const { deliverableId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const toast = useToast();

  const id = Number.parseInt(String(deliverableId ?? ""), 10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliverable, setDeliverable] = useState<ApiDeliverable | null>(null);
  const [versions, setVersions] = useState<ApiVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [deleteVersionModalOpen, setDeleteVersionModalOpen] = useState(false);
  const [deleteDeliverableModalOpen, setDeleteDeliverableModalOpen] = useState(false);

  useEffect(() => {
    if (Number.isNaN(id)) {
      navigate("/admin/deliverables", { replace: true });
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [d, versionsResponse] = await Promise.all([
          deliverablesApi.byId(id),
          versionsApi.byDeliverable(id),
        ]);
        if (cancelled) return;

        const normalized = normalizeVersions(versionsResponse.content ?? []);
        setDeliverable(d);
        setVersions(normalized);
        setSelectedVersionId(normalized[0]?.id ?? null);
      } catch (e: any) {
        if (cancelled) return;
        const msg = e?.response?.data?.message;
        setError(typeof msg === "string" ? msg : t("review.notFound"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, navigate, t]);

  const selectedVersion = useMemo(
    () => (selectedVersionId ? versions.find((v) => v.id === selectedVersionId) ?? null : null),
    [versions, selectedVersionId]
  );

  const handleDeleteVersion = async () => {
    if (!selectedVersion) return;
    try {
      await versionsApi.delete(selectedVersion.id);
      const next = versions.filter((v) => v.id !== selectedVersion.id);
      setVersions(next);
      setSelectedVersionId(next[0]?.id ?? null);
      toast.success(t("review.versionDeleted"));
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : t("common.error"));
      throw e;
    }
  };

  const handleDeleteDeliverable = async () => {
    if (!deliverable) return;
    try {
      await deliverablesApi.delete(deliverable.id);
      toast.success(t("admin.deliverableDeleted"));
      navigate(`/admin/projects/${deliverable.projetId}`, { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(typeof msg === "string" ? msg : t("common.error"));
      throw e;
    }
  };

  if (loading) {
    return <DeliverableDetailSkeleton />;
  }

  if (!deliverable || error) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
        <div className="text-center text-stone-500 dark:text-stone-400">
          <p>{error || t("review.notFound")}</p>
          <button
            type="button"
            onClick={() => navigate("/admin/deliverables", { replace: true })}
            className="mt-4 px-4 py-2 rounded-lg border border-stone-200 dark:border-stone-700 text-sm"
          >
            {t("review.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-[1300px] mx-auto min-h-screen space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/admin/projects/${deliverable.projetId}`)}
            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("review.back")}
          </button>

          <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-stone-900 dark:text-white">
            {deliverable.nom}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {deliverable.projetNom} - {deliverable.type} - {t(`status.${deliverable.statut}`)} with [{deliverable.type}]
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedVersion && (
            <button
              type="button"
              onClick={() => setDeleteVersionModalOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("common.delete")} {t("review.version")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteDeliverableModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("common.delete")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="rounded-2xl border border-stone-200/70 dark:border-stone-800/70 bg-white dark:bg-[#0d0d0f] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-100">
              <History className="w-4 h-4" />
              {t("review.versions")}
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">{versions.length}</span>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {versions.map((v) => {
              const active = selectedVersionId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVersionId(v.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    active
                      ? "border-stone-900 dark:border-white bg-stone-50 dark:bg-stone-900/50"
                      : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white">{v.numero}</p>
                    {v.statut === "VALIDATED" && <Check className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    {new Date(v.uploadedAt || v.dateUpload).toLocaleDateString("fr-FR")}
                  </p>
                </button>
              );
            })}
            {versions.length === 0 && (
              <div className="text-xs text-stone-500 dark:text-stone-400 py-6 text-center">
                {t("review.noVersionAvailable")}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200/70 dark:border-stone-800/70 bg-white dark:bg-[#0d0d0f] p-5">
          {selectedVersion ? (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">{t("review.version")} {selectedVersion.numero}</h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-stone-500 dark:text-stone-400">{t("status")}</dt>
                  <dd className="mt-1 font-medium text-stone-900 dark:text-white">{t(`status.${selectedVersion.statut}`)}</dd>
                </div>
                <div>
                  <dt className="text-stone-500 dark:text-stone-400">{t("table.date")}</dt>
                  <dd className="mt-1 font-medium text-stone-900 dark:text-white">
                    {new Date(selectedVersion.uploadedAt || selectedVersion.dateUpload).toLocaleString("fr-FR")}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500 dark:text-stone-400">{t("review.uploadedBy")}</dt>
                  <dd className="mt-1 font-medium text-stone-900 dark:text-white">{selectedVersion.uploadedByName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-stone-500 dark:text-stone-400">Review data</dt>
                  <dd className="mt-1 font-medium text-stone-900 dark:text-white">Hidden for admin governance role</dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="text-sm text-stone-500 dark:text-stone-400">
              {t("review.noVersionAvailable")}
            </div>
          )}
        </div>
      </div>

      <SecureDeleteModal
        isOpen={deleteVersionModalOpen}
        onClose={() => setDeleteVersionModalOpen(false)}
        title={t("delete_version_confirm")}
        description={t("review.deleteVersionConfirm", { version: selectedVersion?.numero ?? "" })}
        strongMode
        onConfirm={handleDeleteVersion}
      />

      <SecureDeleteModal
        isOpen={deleteDeliverableModalOpen}
        onClose={() => setDeleteDeliverableModalOpen(false)}
        title={t("delete_deliverable_confirm")}
        description={t("delete_deliverable_warning", { name: deliverable.nom })}
        strongMode
        onConfirm={handleDeleteDeliverable}
      />
    </div>
  );
}