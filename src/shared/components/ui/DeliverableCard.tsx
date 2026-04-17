import { useState, useEffect, useRef } from 'react';
import { MessageCircle, FileText, Image, Video, FileType, File, Music } from 'lucide-react';
import { useI18n } from '@/core/i18n/I18nProvider';
import { versionsApi } from '@/core/api/client';
import BorderGlow from '../effects/BorderGlow';
import { getStatusIcon } from '@/shared/utils/status';
import { isLikelyPdfBlob } from '@/shared/utils/preview';

interface DeliverableCardProps {
  id: string;
  title: string;
  version: string;
  status: 'EN_REVUE' | 'VALIDE';
  type: string;
  commentsCount: number;
  projectName: string;
  thumbnailUrl?: string;
  latestVersionId?: number;
  fichierUrl?: string;  // Direct file URL for preview
  dateCreation?: string;
  layout?: 'grid' | 'list';
  showDeleteAction?: boolean;
  onDelete?: (id: string) => void;
  onClick: (id: string) => void;
}

const typeIcons: Record<string, any> = {
  IMAGE: Image,
  VIDEO: Video,
  PDF: FileText,
  TEXTE: FileType,
  AUDIO: Music,
  AUTRE: File,
};

export function DeliverableCard({
  id,
  title,
  version,
  status,
  type,
  commentsCount,
  projectName,
  thumbnailUrl: initialThumbnailUrl,
  onClick,
  latestVersionId,
  fichierUrl,
  dateCreation,
  layout = 'grid',
  showDeleteAction = false,
  onDelete,
}: DeliverableCardProps) {
  const { t } = useI18n();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(initialThumbnailUrl);
  const [videoDuration, setVideoDuration] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const previewBlobUrlRef = useRef<string | null>(null);

  const handleVideoMetadata = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const duration = e.currentTarget.duration;
    if (!isNaN(duration) && duration > 0 && duration !== Infinity) {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      setVideoDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  };

  const isValidated = status === 'VALIDE';
  const safeType = (type || 'AUTRE').toUpperCase();
  const typeLabel = t(`filter.type.${safeType}`);
  const TypeIcon = typeIcons[safeType] || File;
  const StatusIcon = getStatusIcon(status);

  useEffect(() => {
    setThumbnailUrl(initialThumbnailUrl);
    setHasError(false);
  }, [initialThumbnailUrl]);

  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Lazy load: only fetch preview when card is visible
  useEffect(() => {
    if (!cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // Start loading slightly before it comes into view
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const [isFetchInProgress, setIsFetchInProgress] = useState(false);

  // Try preview endpoint first (legacy behavior), then fallback to direct URL.
  useEffect(() => {
    if (!isVisible) return; // Don't fetch until visible
    if (safeType === 'AUDIO' || safeType === 'TEXTE') {
      return;
    }

    let cancelled = false;

    const fetchLazyData = async () => {
      if (!latestVersionId) {
        if (fichierUrl && fichierUrl.trim() !== '') {
          setThumbnailUrl(fichierUrl);
          setHasError(false);
        }
        return;
      }

      setIsFetchInProgress(true);
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          const res = await versionsApi.preview(latestVersionId);
          if (cancelled) {
            window.URL.revokeObjectURL(res.url);
            return;
          }
          if (safeType === 'PDF' && !(await isLikelyPdfBlob(res.blob, res.contentType))) {
            window.URL.revokeObjectURL(res.url);
            throw new Error("Invalid PDF preview");
          }

          if (previewBlobUrlRef.current) {
            window.URL.revokeObjectURL(previewBlobUrlRef.current);
          }
          previewBlobUrlRef.current = res.url;
          setThumbnailUrl(res.url);
          setHasError(false);
          setIsFetchInProgress(false);
          return;
        } catch (err) {
          retries++;
          if (retries <= maxRetries && !cancelled) {
             // Wait 500ms before retry
             await new Promise(resolve => setTimeout(resolve, 500));
             continue;
          }
        }
      }

      if (!cancelled && fichierUrl && fichierUrl.trim() !== '') {
        if (previewBlobUrlRef.current) {
          window.URL.revokeObjectURL(previewBlobUrlRef.current);
          previewBlobUrlRef.current = null;
        }
        setThumbnailUrl(fichierUrl);
        setHasError(false);
      }
      setIsFetchInProgress(false);
    };

    fetchLazyData();
    return () => {
      cancelled = true;
    };
  }, [latestVersionId, fichierUrl, safeType, isVisible]);

  useEffect(() => () => {
    if (previewBlobUrlRef.current) {
      window.URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
  }, []);

  if (layout === 'list') {
    return (
      <tr 
        ref={cardRef as any}
        onClick={() => onClick(id)} 
        className="group border-b border-stone-100/80 dark:border-white/5 hover:bg-stone-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
      >
        <td className="py-3 px-5">
           <div className="flex items-center gap-3">
               <div className={`w-14 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative shadow-sm border border-stone-200 dark:border-stone-700/50 ${
                 safeType === 'AUDIO' || safeType === 'TEXTE' ? 'bg-transparent' : 'bg-stone-100 dark:bg-stone-800/50'
               } ${isFetchInProgress ? 'animate-pulse' : ''}`}>
                 {!hasError && thumbnailUrl ? (
                   <div className="w-full h-full">
                     {safeType === 'VIDEO' ? (
                       <div className="relative w-full h-full">
                         <video
                           src={thumbnailUrl}
                           className="w-full h-full object-cover bg-stone-100 dark:bg-stone-900"
                           muted
                           playsInline
                           disablePictureInPicture
                           onLoadedMetadata={handleVideoMetadata}
                           onError={() => setHasError(true)}
                         />
                         {videoDuration && (
                           <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 backdrop-blur-sm text-white text-[9px] font-medium tracking-wide z-10 pointer-events-none">
                             {videoDuration}
                           </div>
                         )}
                       </div>
                     ) : safeType === 'PDF' ? (
                       <div className="relative w-full h-full bg-white overflow-hidden">
                         <iframe
                           src={`${thumbnailUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                           className="absolute pointer-events-none border-none bg-white"
                           style={{ width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', top: '-20px', left: '-20px' }}
                           tabIndex={-1}
                           scrolling="no"
                         />
                       </div>
                     ) : safeType === 'TEXTE' ? (
                       <div className="w-full h-full flex items-center justify-center bg-transparent">
                         <FileType className="w-6 h-6 text-stone-600 dark:text-stone-400" />
                       </div>
                     ) : safeType === 'AUDIO' ? (
                       <div className="w-full h-full flex items-center justify-center bg-transparent">
                         <Music className="w-6 h-6 text-stone-600 dark:text-stone-400" />
                       </div>
                     ) : (
                       <img 
                         src={thumbnailUrl} 
                         className="w-full h-full object-cover bg-stone-100 dark:bg-stone-900" 
                         onError={() => setHasError(true)}
                       />
                     )}
                   </div>
                 ) : (
                   <TypeIcon className="w-6 h-6 text-stone-500 dark:text-stone-400" />
                 )}
               </div>
               <div className="flex flex-col min-w-0">
                   <h3 className="text-sm font-semibold text-stone-900 dark:text-white truncate">
                     {title} <span className="opacity-40 text-[10px] ml-1 font-normal">[{typeLabel === `filter.type.${safeType}` ? safeType : typeLabel}]</span>
                   </h3>
                   <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">{projectName}</p>
               </div>
           </div>
        </td>

        <td className="py-3 px-5 hidden sm:table-cell">
           {version ? (
              <span className="text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2.5 py-1 rounded-md">
                 {version}
              </span>
           ) : (
              <span className="text-xs text-stone-400">-</span>
           )}
        </td>

         <td className="py-3 px-5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border ${
              isValidated 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-green-200 dark:border-white/10' 
                : 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-amber-200 dark:border-white/10'
            }`}>
             <StatusIcon className="w-3.5 h-3.5" />
             {isValidated ? t('deliverables.validated') : t('deliverables.inReview')}
            </span>
         </td>

        <td className="py-3 px-5 hidden lg:table-cell">
           <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-white/60">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{commentsCount}</span>
           </div>
        </td>

        <td className="py-3 px-5 hidden sm:table-cell whitespace-nowrap">
           <div className="text-[11px] text-stone-500 dark:text-white/60">
             {dateCreation ? new Date(dateCreation).toLocaleDateString("fr-FR") : '-'}
           </div>
        </td>
        
        <td className="py-3 px-5 text-right w-28">
           <div className="flex items-center justify-end gap-2">
              {showDeleteAction && onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                >
                  {t('common.delete')}
                </button>
              )}
              <div className="text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white transition-colors flex justify-end">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
           </div>
        </td>
      </tr>
    );
  }

  // GRID LAYOUT
  return (
    <div ref={cardRef} onClick={() => onClick(id)} className="h-full cursor-pointer hover:-translate-y-1 transition-transform duration-300">
      <BorderGlow
        edgeSensitivity={30}
        glowColor="40 80 80"
        backgroundColor="transparent"
        borderRadius={16}
        glowRadius={40}
        glowIntensity={1}
        coneSpread={25}
        animated={false}
        colors={['#c510ea', '#6893e8', '#053aa3']}
        fillOpacity={0}
        className="h-full"
      >
        <div className="group relative flex flex-col h-full bg-white dark:bg-[#0d0d0f] rounded-[inherit] overflow-hidden border border-stone-200 dark:border-stone-800/70 hover:shadow-xl hover:shadow-stone-200/80 dark:hover:shadow-black/60 ease-out transition-all">

      <div className={`relative aspect-[16/10] w-full overflow-hidden flex items-center justify-center border-b border-stone-100 dark:border-stone-800/70 ${
        isFetchInProgress ? 'bg-stone-100 dark:bg-stone-900 animate-pulse' : 'bg-stone-50 dark:bg-black/40'
      }`}>
        {!hasError && thumbnailUrl && !isFetchInProgress ? (
          <div className="w-full h-full">
            {safeType === 'VIDEO' ? (
              <div className="relative w-full h-full">
                <video
                  src={thumbnailUrl}
                  className="w-full h-full object-cover bg-stone-100 dark:bg-stone-900 opacity-90 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  muted
                  playsInline
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  onLoadedMetadata={handleVideoMetadata}
                  onError={() => setHasError(true)}
                />
                <div className="absolute inset-0 z-10 bg-transparent" />
                {videoDuration && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-white text-[12px] font-bold tracking-wide z-20 pointer-events-none shadow-black/40 shadow-sm border border-white/10">
                    {videoDuration}
                  </div>
                )}
              </div>
            ) : safeType === 'PDF' ? (
              <div className="relative w-full h-full bg-white overflow-hidden">
                <iframe
                  src={`${thumbnailUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="absolute pointer-events-none border-none bg-white"
                  style={{ width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', top: '-20px', left: '-20px' }}
                  scrolling="no"
                  title={title}
                  tabIndex={-1}
                />
              </div>
            ) : safeType === 'TEXTE' ? (
              <div className="w-full h-full flex items-center justify-center bg-transparent">
                <FileType className="w-10 h-10 text-stone-600 dark:text-stone-400" />
              </div>
            ) : safeType === 'AUDIO' ? (
              <div className="w-full h-full flex items-center justify-center bg-transparent">
                <Music className="w-10 h-10 text-stone-600 dark:text-stone-400" />
              </div>
            ) : (
              <img
                src={thumbnailUrl}
                alt={title}
                className="w-full h-full object-cover bg-stone-100 dark:bg-stone-900 opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                onError={() => setHasError(true)}
              />
            )}
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-stone-100 dark:bg-black/20">
            <TypeIcon className="w-10 h-10 text-stone-500 dark:text-stone-600" />
          </div>
        )}
      </div>
        
        <div className="absolute top-3 left-3 z-20">
          {version && (
            <span className="px-3 py-1.5 text-xs font-bold tracking-wide rounded-md backdrop-blur-md shadow-sm border border-black/5 dark:border-white/20 bg-white/80 dark:bg-stone-800/70 text-stone-900 dark:text-white shadow-stone-200/20 shadow-sm">
              {version}
            </span>
          )}
        </div>

      <div className="flex flex-col flex-1 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="text-[14px] font-semibold text-stone-900 dark:text-white leading-snug group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors line-clamp-1 truncate">
            {title} <span className="opacity-40 text-[10px] ml-1 font-normal">[{typeLabel === `filter.type.${safeType}` ? safeType : typeLabel}]</span>
          </h3>
        </div>

        <div className="mb-3">
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium line-clamp-1 flex items-center gap-1.5">
            {projectName}
          </p>
        </div>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100 dark:border-white/5">
           <div className="text-[10px] text-stone-400 dark:text-white/40 font-medium whitespace-nowrap">
             {dateCreation ? new Date(dateCreation).toLocaleDateString("fr-FR") : ''}
           </div>

           <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ml-2 mr-auto border shadow-sm ${
            isValidated 
              ? 'bg-green-50/80 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30' 
              : 'bg-amber-50/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30'
           }`}>
             <StatusIcon className="w-3.5 h-3.5" />
             {isValidated ? t('deliverables.validated') : t('deliverables.inReview')}
           </div>

           <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-white/60 font-medium whitespace-nowrap group-hover:text-stone-900 dark:group-hover:text-white transition-colors">
             <MessageCircle className="w-4 h-4" />
             <span className="font-bold">{commentsCount}</span>
           </div>
        </div>
      </div>
        </div>
      </BorderGlow>
    </div>
  );
}
