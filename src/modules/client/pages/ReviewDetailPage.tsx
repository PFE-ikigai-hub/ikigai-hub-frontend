import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, Check, Download, Sparkles, RefreshCw, File, Pencil, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { deliverablesApi, triggerBrowserDownload, versionsApi } from '@/core/api/client';
import type { DownloadConfirmationPayload } from '@/core/api/client';
import { useAuth } from '@/core/auth/AuthProvider';
import { useI18n } from '@/core/i18n/I18nProvider';
import { InlineLoader } from '@/shared/components/feedback/InlineLoader';
import { DeliverableDetailSkeleton } from '@/shared/components/skeleton';
import { CommentsList } from '@/shared/components/review/CommentsList';
import { VersionsList } from '@/shared/components/review/VersionsList';
import { AnnotationTool } from '@/shared/components/review/AnnotationTool';
import { SecureDownloadModal } from '@/shared/components/ui/SecureDownloadModal';
import { SecureValidationModal } from '@/shared/components/ui/SecureValidationModal';
import { useToast } from '@/shared/components/ui/toast';

// Lazy load PdfViewer to reduce initial bundle size
const PdfViewer = lazy(() => import('@/shared/components/review/PdfViewer'));
import type { ApiDeliverable, ApiVersion } from '@/types/index';
import { normalizeVersions } from '@/shared/utils/versions';
import { isLikelyPdfBlob, shouldReadTextPreview } from '@/shared/utils/preview';
import { useSmartBackNavigation } from '@/shared/hooks/useSmartBackNavigation';

export function ClientReviewDetailPage() {
  const { deliverableId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const toast = useToast();
  const { role } = useAuth();

  const [zoom, setZoom] = useState(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null!);

  const livrableId = Number.parseInt(String(deliverableId ?? ''), 10);

  const [livrable, setLivrable] = useState<ApiDeliverable | null>(null);
  const [versions, setVersions] = useState<ApiVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorNotFound, setErrorNotFound] = useState(false);

  // Preview states
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');
  const [previewError, setPreviewError] = useState('');

  // Media refs for timestamp support in comments
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [pendingSeekSeconds, setPendingSeekSeconds] = useState<number | null>(null);
  
  const [currentPdfPage, setCurrentPdfPage] = useState(1);

  const { goBack: handleBack } = useSmartBackNavigation({
    role,
    fallbackByRole: {
      CLIENT: '/client/dashboard',
      EMPLOYE: '/employee/feedback',
      ADMIN: '/admin/projects',
    },
    defaultFallback: '/client/dashboard',
  });

  // 1) Fetch deliverable + versions
  useEffect(() => {
    if (Number.isNaN(livrableId)) {
      navigate('/client/dashboard', { replace: true });
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setErrorNotFound(false);
      try {
        const liv = await deliverablesApi.byId(livrableId);
        if (cancelled) return;

        setLivrable(liv);
        try {
          const versionsResponse = await versionsApi.byDeliverable(livrableId);
          if (cancelled) return;
          const apiVersions = Array.isArray((versionsResponse as any)?.content)
            ? (versionsResponse as any).content
            : Array.isArray(versionsResponse)
              ? versionsResponse
              : Array.isArray(liv.versions)
                ? liv.versions
                : [];
          const normalized = normalizeVersions(apiVersions);
          setVersions(normalized);
          
          // Respect versionId from search params if present
          const searchParams = new URLSearchParams(location.search);
          const vId = searchParams.get('versionId');
          if (vId) {
            const vidNum = Number.parseInt(vId, 10);
            if (normalized.some(v => v.id === vidNum)) {
              setSelectedVersionId(vidNum);
            } else {
              setSelectedVersionId(normalized.length > 0 ? normalized[0].id : null);
            }
          } else {
            setSelectedVersionId(normalized.length > 0 ? normalized[0].id : null);
          }
        } catch {
          if (!cancelled) {
            const fallback = normalizeVersions(Array.isArray(liv.versions) ? liv.versions : []);
            setVersions(fallback);
            setSelectedVersionId(fallback.length > 0 ? fallback[0].id : null);
          }
        }
      } catch {
        if (!cancelled) setErrorNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [livrableId, navigate]);

  // 2) Current version
  const currentVersion = selectedVersionId
    ? versions.find(v => v.id === selectedVersionId) || versions[0]
    : versions[0];

  // 3) Fetch preview (stable, revoked only on version change)
  useEffect(() => {
    if (!currentVersion || !currentVersion.id || !livrable) return;

    let cancelled = false;
    let localBlobUrl: string | null = null;

    setPreviewBlobUrl(null);
    setPreviewMimeType('');
    setPreviewText('');
    setPreviewError('');

    const loadPreview = async () => {
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          const { url, contentType, blob } = await versionsApi.preview(currentVersion.id);

          if (cancelled) {
            window.URL.revokeObjectURL(url);
            return;
          }

          setPreviewMimeType(contentType || '');

          if ((livrable.type === 'PDF' || contentType === 'application/pdf') && !(await isLikelyPdfBlob(blob, contentType))) {
            window.URL.revokeObjectURL(url);
            if (!cancelled) setPreviewError(t("review.invalidPdf"));
            return;
          }

          if (shouldReadTextPreview(livrable.type, contentType)) {
            const text = await blob.text();
            if (!cancelled) setPreviewText(text);
            return;
          }

          localBlobUrl = url;
          setPreviewBlobUrl(url);
          return;
        } catch (err) {
          retries++;
          if (retries <= maxRetries && !cancelled) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          if (!cancelled) setPreviewError(t("review.previewUnavailable"));
        }
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
      if (localBlobUrl) window.URL.revokeObjectURL(localBlobUrl);
    };
  }, [currentVersion?.id, livrable?.type, previewRefreshKey, t]);

  const handleVersionSelect = useCallback((versionId: number) => {
    setSelectedVersionId(versionId);
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRefreshImage = () => {
    setZoom(1);
    setPreviewRefreshKey((prev) => prev + 1);
  };

  const handleValidate = () => {
    setValidationModalOpen(true);
  };

  const handleConfirmValidation = async (_password: string) => {
    if (!currentVersion) return;
    setIsValidating(true);
    try {
      await versionsApi.validate(currentVersion.id);
      setShowSuccessMessage(true);

      setVersions(prev =>
        prev.map(v => v.id === currentVersion.id ? { ...v, statut: 'VALIDATED' as const } : v)
      );

      if (livrable) {
        setLivrable({ ...livrable, statut: 'VALIDE' });
      }

      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (e: any) {
      const backendMessage = e?.response?.data?.message;
      toast.error(typeof backendMessage === "string" ? backendMessage : t('common.error'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownload = async (payload: DownloadConfirmationPayload) => {
    if (!currentVersion) return;
    const blob = await versionsApi.download(currentVersion.id, payload);
    const base = (livrable?.nom || `version_${currentVersion.id}`).replace(/[\\/:*?"<>|]+/g, '_');
    const version = currentVersion.numero?.trim?.() || `v${currentVersion.id}`;
    triggerBrowserDownload(blob, `${base}_${version}`);
  };

  const seekToTimestamp = useCallback((seconds: number) => {
    setPendingSeekSeconds(seconds);
    const media = livrable?.type === 'VIDEO' ? videoRef.current : livrable?.type === 'AUDIO' ? audioRef.current : null;
    if (media) {
      media.currentTime = seconds;
      media.play().catch(() => {});
      setPendingSeekSeconds(null);
    }
  }, [livrable?.type]);

  useEffect(() => {
    if (pendingSeekSeconds == null) return;
    const media = livrable?.type === 'VIDEO' ? videoRef.current : livrable?.type === 'AUDIO' ? audioRef.current : null;
    if (!media) return;
    media.currentTime = pendingSeekSeconds;
    media.play().catch(() => {});
    setPendingSeekSeconds(null);
  }, [pendingSeekSeconds, livrable?.type, previewBlobUrl]);

  const openDownloadModal = () => {
    if (!currentVersion) return;
    setDownloadModalOpen(true);
  };

  const renderPreview = () => {
    if (previewError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <File className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
            <p className="text-stone-500 dark:text-stone-400 mb-2">{t("review.previewUnavailable")}</p>
            <p className="text-sm text-stone-400 dark:text-stone-500">{previewError}</p>
            {currentVersion && (
              <button
                onClick={openDownloadModal}
                className="mt-4 px-4 py-2 ikg-gradient-btn rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                {t("review.downloadFile")}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (!currentVersion) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <File className="w-16 h-16 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
          <p className="text-stone-600 dark:text-stone-400 mb-2 font-medium">{livrable?.nom}</p>
          <p className="text-sm text-stone-400 dark:text-stone-500">{t("review.noVersionAvailable")}</p>
        </div>
      );
    }

    const type = livrable?.type || 'AUTRE';
    const isPdfPreview = type === 'PDF' || previewMimeType === 'application/pdf';

    // IMAGE
    if (type === 'IMAGE' || previewMimeType.startsWith('image/')) {
      return (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative w-full h-full flex items-center justify-center p-4"
        >
          <img
            src={previewBlobUrl!}
            alt={livrable?.nom || 'preview'}
            className="w-full h-full rounded-lg shadow-2xl shadow-stone-200/50 dark:shadow-black/50 bg-white dark:bg-[#0d0d0f] object-contain block"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
            }}
          />
          <AnnotationTool
            containerRef={containerRef}
            zoom={zoom}
            versionId={currentVersion?.id || 0}
            refreshKey={previewRefreshKey}
            interactive={annotateMode}
          />
        </motion.div>
      );
    }

    // VIDEO
    if (type === 'VIDEO' || previewMimeType.startsWith('video/')) {
      return (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative max-h-full max-w-full flex items-center justify-center p-4"
        >
          <video
            ref={videoRef}
            src={previewBlobUrl!}
            controls
            controlsList="nodownload"
            autoPlay
            onContextMenu={(e) => e.preventDefault()}
            className="max-w-full max-h-full rounded-lg shadow-2xl shadow-stone-200/50 dark:shadow-black/50 bg-black object-contain"
          >
            {t("review.videoUnsupported")}
          </video>
          {/* Annotations disabled for audio - only IMAGE supports annotations */}
        </motion.div>
      );
    }

    // AUDIO
    if (type === 'AUDIO' || previewMimeType.startsWith('audio/')) {
      return (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-2xl mx-auto p-8"
        >
          <div className="bg-white dark:bg-stone-900 rounded-lg shadow-2xl shadow-stone-200/50 dark:shadow-black/50 p-8">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-white mb-2">
                {livrable?.nom || 'Audio Lecture'}
              </h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {currentVersion?.numero}
              </p>
            </div>
            <audio
              ref={audioRef}
              src={previewBlobUrl!}
              controls
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              className="w-full mb-4"
            >
              {t("review.audioUnsupported")}
            </audio>
          </div>
        </motion.div>
      );
    }

    // PDF - with scroll-based page detection
    if (isPdfPreview) {
      return (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full h-full"
        >
          <Suspense fallback={
            <InlineLoader className="h-full" />
          }>
            <PdfViewer
              url={previewBlobUrl!}
              currentPage={currentPdfPage}
              onPageChange={setCurrentPdfPage}
            />
          </Suspense>
        </motion.div>
      );
    }

    // TEXTE
    if (type === 'TEXTE' || previewMimeType.startsWith('text/') || previewText) {
      return (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-4xl mx-auto bg-white dark:bg-stone-900 rounded-lg shadow-2xl shadow-stone-200/50 dark:shadow-black/50 p-8 overflow-auto relative max-h-full"
        >
          <pre className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap font-mono leading-relaxed">
            {previewText}
          </pre>
          {/* Annotations disabled for audio - only IMAGE supports annotations */}
        </motion.div>
      );
    }

    // AUTRE â€” no preview, just download
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <File className="w-16 h-16 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
          <p className="text-stone-600 dark:text-stone-400 mb-2 font-medium">{livrable?.nom}</p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mb-6">
            {t("review.previewUnavailableType")}
          </p>
          <button
            onClick={openDownloadModal}
            className="px-6 py-2.5 ikg-gradient-btn rounded-xl text-sm hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
          >
            <Download className="w-4 h-4" />
            {t('deliverables.download')}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <DeliverableDetailSkeleton />
    );
  }

  if (!livrable || errorNotFound) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-400 font-medium"
        >
          {t("review.notFound")}
        </motion.div>
      </div>
    );
  }

  // Guard: block full detail render until the preview is ready, to match the reference behavior.
  if (!previewBlobUrl && !previewText && !previewError && !errorNotFound && !!currentVersion) {
    return (
      <DeliverableDetailSkeleton />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background dark:bg-[#0a0a0b] transition-colors duration-300">
      <motion.div
        key="content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <header className="lg:hidden bg-white/70 dark:bg-[#0d0d0f]/70 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/40 px-6 py-3.5 z-20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200"
                aria-label={t('review.back')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="h-6 w-px bg-stone-200 dark:bg-stone-700 mx-2 hidden md:block" />

              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3 flex-wrap">
                  <h2 className="text-base font-bold text-stone-900 dark:text-white tracking-tight break-words">{livrable.nom}</h2>
                  {currentVersion && (
                    <span className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[11px] font-bold rounded border border-stone-200 dark:border-stone-700 shrink-0">
                      {currentVersion.numero}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 break-words">
                  {livrable.projetNom}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile comments button */}
              <button
                onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                aria-label={t("review.historyComments")} 
              >
                <History className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-3">
                {livrable.statut === 'EN_REVUE' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleValidate}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg transition-colors text-sm font-medium shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    {t('deliverables.validate')}
                  </motion.button>
                )}

                {currentVersion && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={openDownloadModal}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0d0d0f] border border-stone-200 dark:border-stone-800/60 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors text-sm font-medium shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    {t('deliverables.download')}
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Success Message */}
        <AnimatePresence>
          {showSuccessMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-green-500 text-white overflow-hidden"
            >
              <div className="px-6 py-3 text-center text-sm font-medium flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('validation.success')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 overflow-hidden min-h-0 lg:min-h-screen">
          {/* Main preview area */}
          <div className="flex-1 lg:w-[62%] lg:flex-none lg:order-2 min-w-0 flex flex-col overflow-hidden bg-stone-50/30 dark:bg-[#0c0c0e]">
            {/* Zoom controls + Annotation toggle (Image only) */}
            {livrable.type === 'IMAGE' && (
              <div className="bg-white/40 dark:bg-stone-900/40 backdrop-blur-md border-b border-stone-100/30 dark:border-stone-800/30 px-6 py-2 flex items-center justify-center gap-4">
                <div className="flex items-center bg-white/80 dark:bg-stone-800/80 rounded-xl shadow-sm border border-stone-200/40 dark:border-stone-700/40 p-0.5">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors text-stone-500"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-stone-600 dark:text-stone-400 min-w-[48px] text-center border-x border-stone-100 dark:border-stone-700 mx-1">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors text-stone-500"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleRefreshImage}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title={t("review.refresh")}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

                <button
                  onClick={() => setAnnotateMode(!annotateMode)}
                  className={`p-1.5 rounded transition-all flex items-center gap-2 px-3 ${
                    annotateMode 
                      ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-sm' 
                      : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  title={annotateMode ? t('review.viewMode') : t('review.annotateMode')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Annotations are only available for IMAGE deliverables */}

            {/* Canvas */}
            <div 
              ref={containerRef}
              className="flex-1 overflow-auto p-6 md:p-8 lg:p-12 relative flex items-center justify-center"
            >
              {renderPreview()}
            </div>
          </div>

          {/* Right Sidebar - Desktop */}
          <div className="hidden lg:flex lg:order-1 w-[38%] min-w-0 flex-col bg-white/60 dark:bg-[#0d0d0f]/60 backdrop-blur-xl border-r border-stone-200/40 dark:border-stone-800/30 shadow-xl shadow-stone-100/20 dark:shadow-none z-10 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-5 border-b border-stone-200/40 dark:border-stone-800/30 space-y-4">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
                  type="button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('review.back')}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-stone-900 dark:text-white truncate tracking-tight">{livrable.nom}</h2>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                    {livrable.projetNom}
                  </p>
                </div>

                {versions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {versions.map(v => (
                      <button
                        key={v.id}
                        onClick={() => handleVersionSelect(v.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          v.id === currentVersion?.id 
                            ? 'bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-sm' 
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 dark:bg-transparent dark:border-stone-700/50 dark:text-stone-400 dark:hover:bg-stone-800/50'
                        }`}
                        type="button"
                      >
                        {v.numero}
                        {v.statut === 'VALIDATED' && <Check className={`w-3.5 h-3.5 ${v.id === currentVersion?.id ? 'text-green-400 dark:text-green-600' : 'text-green-500'}`} />}
                      </button>
                    ))}
                  </div>
                )}

                {currentVersion && (
                  <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <History className="w-3.5 h-3.5" />
                      {new Date(currentVersion.uploadedAt || currentVersion.dateUpload).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      currentVersion.statut === 'VALIDATED'
                        ? 'text-green-700 bg-green-100 dark:bg-green-900/30'
                        : 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30'
                    }`}>
                      {t(`status.${currentVersion.statut}`)}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {livrable.statut === 'EN_REVUE' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleValidate}
                      className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 rounded-lg transition-colors text-xs font-medium shadow-sm"
                      type="button"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {t('deliverables.validate')}
                    </motion.button>
                  )}

                  {currentVersion && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={openDownloadModal}
                      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#0d0d0f] border border-stone-200 dark:border-stone-800/60 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg transition-colors text-xs font-medium shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('deliverables.download')}
                    </motion.button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col pt-0">
                <CommentsList 
                  versionId={currentVersion?.id || 0}
                  enableTranslation
                  deliverableType={livrable?.type}
                  mediaRef={livrable?.type === 'VIDEO' ? videoRef : livrable?.type === 'AUDIO' ? audioRef : undefined}
                  onTimestampClick={seekToTimestamp}
                  currentPage={currentPdfPage}
                  onPageRefClick={(page) => setCurrentPdfPage(page)}
                />
              </div>
            </div>
          </div>

          {/* Comments sidebar - Mobile (Overlay) */}
          <AnimatePresence>
            {showCommentsSidebar && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
                onClick={() => setShowCommentsSidebar(false)}
              >
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl flex flex-col" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowCommentsSidebar(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
                    aria-label={t('common.close')}
                  >
                    <ArrowLeft className="w-5 h-5 dark:text-white" />
                  </button>

                  <div className="flex-1 flex flex-col overflow-hidden pt-12">
                    <div className="px-5 pb-4 border-b border-stone-200/40 dark:border-stone-800/30 space-y-4">
                      {versions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {versions.map(v => (
                            <button
                              key={v.id}
                              onClick={() => handleVersionSelect(v.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                v.id === currentVersion?.id 
                                  ? 'bg-stone-900 border-stone-900 text-white dark:bg-white dark:border-white dark:text-stone-900 shadow-sm' 
                                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 dark:bg-transparent dark:border-stone-700/50 dark:text-stone-400 dark:hover:bg-stone-800/50'
                              }`}
                              type="button"
                            >
                              {v.numero}
                              {v.statut === 'VALIDATED' && <Check className={`w-3.5 h-3.5 ${v.id === currentVersion?.id ? 'text-green-400 dark:text-green-600' : 'text-green-500'}`} />}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {currentVersion && (
                        <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <History className="w-3.5 h-3.5" />
                            {new Date(currentVersion.uploadedAt || currentVersion.dateUpload).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            currentVersion.statut === 'VALIDATED'
                              ? 'text-green-700 bg-green-100 dark:bg-green-900/30'
                              : 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30'
                          }`}>
                            {t(`status.${currentVersion.statut}`)}
                          </span>
                        </div>
                      )}
                    </div>
                    <CommentsList 
                      versionId={currentVersion?.id || 0}
                      enableTranslation
                      deliverableType={livrable?.type}
                      mediaRef={livrable?.type === 'VIDEO' ? videoRef : livrable?.type === 'AUDIO' ? audioRef : undefined}
                      onTimestampClick={seekToTimestamp}
                      currentPage={currentPdfPage}
                      onPageRefClick={(page) => setCurrentPdfPage(page)}
                      floatingButtonMode="fixed"
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      <SecureDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        onConfirm={handleDownload}
      />
      <SecureValidationModal
        isOpen={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        onConfirm={handleConfirmValidation}
        deliverableName={livrable?.nom}
      />
    </div>
  );
}








