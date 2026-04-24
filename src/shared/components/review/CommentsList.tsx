import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Trash2, Loader2, Clock, FileText, Plus } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useI18n } from '@/core/i18n/I18nProvider';
import { commentsApi, translationApi } from '@/core/api/client';
import { useToast } from '@/shared/components/ui/toast';
import { protectCommentReferences } from '@/shared/utils/translationMarkers';
import type { ApiCommentaire } from '@/types/index';


interface CommentsListProps {
  versionId: number;
  enableTranslation?: boolean;
  deliverableType?: string;
  mediaRef?: React.RefObject<HTMLMediaElement | null>;
  onTimestampClick?: (seconds: number) => void;
  currentPage?: number;
  onPageRefClick?: (page: number) => void;
  floatingButtonMode?: 'absolute' | 'fixed';
}

export function CommentsList({
  versionId,
  enableTranslation = false,
  deliverableType,
  mediaRef,
  onTimestampClick,
  currentPage,
  onPageRefClick,
  floatingButtonMode = 'absolute',
}: CommentsListProps) {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const toast = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<ApiCommentaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showTranslation, setShowTranslation] = useState<Record<number, boolean>>({});
  const [translationByCommentId, setTranslationByCommentId] = useState<Record<number, { lang: string; text: string }>>(
    {}
  );
  const [translatingId, setTranslatingId] = useState<number | null>(null);
  const [, setAvatarVersion] = useState<number>(0);

  const supportsTimestamps = deliverableType === 'VIDEO' || deliverableType === 'AUDIO';
  const supportsPageRefs = deliverableType === 'PDF';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentUserId = user ? Number(user.id) : null;
  const canCreateComment = user?.role === "CLIENT";
  const canTranslateComments = enableTranslation && user?.role !== "CLIENT";

  // Fetch comments for the selected version
  useEffect(() => {
    if (!versionId) return;
    let cancelled = false;
    setShowTranslation({});
    setTranslationByCommentId({});
    setTranslatingId(null);

    const fetchComments = async () => {
      setLoading(true);
      try {
        const data = await commentsApi.byVersion(versionId);
        if (!cancelled) setComments(data);
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchComments();
    return () => { cancelled = true; };
  }, [versionId]);

  // Listen for avatar changes from SettingsPage
  useEffect(() => {
    const handleAvatarUpdated = () => {
      setAvatarVersion((v) => v + 1);
    };
    window.addEventListener('avatar-updated', handleAvatarUpdated);
    return () => window.removeEventListener('avatar-updated', handleAvatarUpdated);
  }, []);

  const targetLang = language === "FR" ? "fr" : language === "AR" ? "ar" : "en";

  const handleTranslateToggle = async (comment: ApiCommentaire) => {
    if (!canTranslateComments) return;

    const currentlyShown = !!showTranslation[comment.id];
    if (currentlyShown) {
      setShowTranslation((prev) => ({ ...prev, [comment.id]: false }));
      return;
    }

    const cached = translationByCommentId[comment.id];
    if (cached && cached.lang === targetLang) {
      setShowTranslation((prev) => ({ ...prev, [comment.id]: true }));
      return;
    }

    setTranslatingId(comment.id);
    try {
      const { protectedText, restore } = protectCommentReferences(comment.texte);
      const translatedRaw = await translationApi.translate(protectedText, targetLang);
      const translated = restore(translatedRaw || "");
      setTranslationByCommentId((prev) => ({ ...prev, [comment.id]: { lang: targetLang, text: translated } }));
      setShowTranslation((prev) => ({ ...prev, [comment.id]: true }));
    } catch {
      toast.error(t("translation_unavailable"));
    } finally {
      setTranslatingId((prev) => (prev === comment.id ? null : prev));
    }
  };

  const formatRelativeDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) {
      return diffMins <= 0 ? 'now' : `${diffMins}min`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPageRef = (page: number): string => `[Page ${page}]`;

  const insertTimestamp = () => {
    const media = mediaRef?.current;
    if (!media) return;
    
    const time = media.currentTime;
    const timestamp = `[${formatTime(time)}]`;
    
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = commentText.substring(0, start) + timestamp + commentText.substring(end);
      setCommentText(newText);
      
      // Restore cursor position after the inserted timestamp
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + timestamp.length;
        textarea.focus();
      }, 0);
    } else {
      setCommentText(prev => prev + timestamp);
    }
  };

  const insertPageRef = () => {
    const pageNum = currentPage || 1;
    const pageRef = formatPageRef(pageNum);
    
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = commentText.substring(0, start) + pageRef + commentText.substring(end);
      setCommentText(newText);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + pageRef.length;
        textarea.focus();
      }, 0);
    } else {
      setCommentText(prev => prev + pageRef);
    }
  };

  const parseCommentWithTimestamps = (text: string): (string | { type: 'timestamp'; value: string; seconds: number } | { type: 'page'; value: string; page: number })[] => {
    const parts: (string | { type: 'timestamp'; value: string; seconds: number } | { type: 'page'; value: string; page: number })[] = [];
    // Match [MM:SS], bare MM:SS (ex: "at 2:50 fix"), and [Page N]
    const regex = /\[(\d+):([0-5]\d)\]|\b(\d{1,2}):([0-5]\d)\b|\[Page (\d+)\]/gi;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      if ((match[1] && match[2]) || (match[3] && match[4])) {
        // Timestamp match [MM:SS] or bare MM:SS
        const minGroup = match[1] ?? match[3];
        const secGroup = match[2] ?? match[4];
        if (!minGroup || !secGroup) continue;
        const minutes = parseInt(minGroup, 10);
        const seconds = parseInt(secGroup, 10);
        const totalSeconds = minutes * 60 + seconds;
        parts.push({ type: 'timestamp', value: match[0], seconds: totalSeconds });
      } else if (match[5]) {
        // Page reference match [Page N]
        const page = parseInt(match[5], 10);
        parts.push({ type: 'page', value: match[0], page });
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const handleTimestampClick = (seconds: number) => {
    // Always call the callback to update parent state
    if (onTimestampClick) {
      onTimestampClick(seconds);
    }
    // Navigate the media element if available
    const media = mediaRef?.current;
    if (media) {
      media.currentTime = seconds;
      media.play();
    }
  };

  const handlePageRefClick = (page: number) => {
    if (onPageRefClick) {
      onPageRefClick(page);
    }
  };

  const handleAddComment = async () => {
    if (!canCreateComment) return;
    if (!commentText.trim() || !versionId) return;
    setSubmitting(true);
    try {
      const newComment = await commentsApi.create(versionId, commentText.trim());
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      setIsAdding(false);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const executeDeleteComment = async (commentId: number) => {
    setDeletingId(commentId);
    try {
      await commentsApi.delete(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success(t("review.commentDeleted"));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    toast(t("review.deleteCommentConfirm"), {
      action: {
        label: t("common.delete"),
        onClick: () => executeDeleteComment(commentId),
      },
      cancel: {
        label: t("common.cancel"),
        onClick: () => {},
      },
      duration: 5000,
      actionButtonStyle: { backgroundColor: '#ef4444', color: 'white', border: 'none' },
    });
  };

  if (loading) {
    return (
      <div className="flex-1 bg-white dark:bg-[#0d0d0f] flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-stone-900 dark:text-white" />
      </div>
    );
  }

  // Get current user's avatar from localStorage for real-time updates
  // avatarVersion is used to force re-render when avatar changes
  const getCurrentUserAvatarUrl = () => {
    if (!user?.id) return null;
    try {
      const avatarKey = `ikigai-avatar-${user.id}`;
      const timestampKey = `ikigai-avatar-ts-${user.id}`;
      const stored = localStorage.getItem(avatarKey);
      const timestamp = localStorage.getItem(timestampKey);
      if (stored) {
        // Don't append timestamp to data URLs (breaks them)
        if (stored.startsWith('data:')) {
          return stored;
        }
        return `${stored}?t=${timestamp || Date.now()}`;
      }
    } catch {
      // ignore
    }
    return user?.photoUrl || null;
  };

  const getAvatarUrl = (comment: ApiCommentaire) => {
    // If this is the current user's comment, use localStorage avatar for real-time updates
    if (user && comment.utilisateurId.toString() === user.id) {
      const localAvatar = getCurrentUserAvatarUrl();
      if (localAvatar) return localAvatar;
    }
    
    if (comment.utilisateurPhotoUrl) {
      return comment.utilisateurPhotoUrl;
    }
    // Use default avatar - no photo available
    return null;
  };

  const renderAvatar = (comment: ApiCommentaire, size: 'sm' | 'md' = 'sm') => {
    const avatarUrl = getAvatarUrl(comment);
    // Bigger sizes for better visibility
    const sizeClasses = size === 'sm' ? 'w-11 h-11' : 'w-12 h-12';
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={`${comment.utilisateurPrenom} ${comment.utilisateurNom}`}
          className={`${sizeClasses} rounded-full object-cover shrink-0 bg-white`}
          style={{ 
            imageRendering: '-webkit-optimize-contrast',
            willChange: 'transform'
          }}
        />
      );
    }
    
    // Extract initials
    const prenomInitiale = comment.utilisateurPrenom ? comment.utilisateurPrenom.charAt(0).toUpperCase() : '';
    const nomInitiale = comment.utilisateurNom ? comment.utilisateurNom.charAt(0).toUpperCase() : '';
    const initials = (prenomInitiale + nomInitiale) || '?';
    
    // Choose text size based on size flag
    const textClass = size === 'sm' ? 'text-sm' : 'text-base';

    // Default avatar with initials and grey background matching the rest of the app
    return (
      <div 
        className={`${sizeClasses} rounded-full flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0 shadow-sm border border-stone-200 dark:border-stone-700`} 
        title={`${comment.utilisateurPrenom || ''} ${comment.utilisateurNom || ''}`.trim()}
      >
        <span className={`${textClass} font-semibold tracking-wider`}>{initials}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 bg-white dark:bg-[#0d0d0f] flex flex-col overflow-hidden relative group/comments">
      <div className="flex-1 overflow-auto p-4 space-y-6 relative scrollbar-hide">
        {comments.length === 0 && !isAdding ? (
          <div className="h-full flex flex-col items-center justify-center py-12 min-h-[300px] animate-in fade-in zoom-in duration-500">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-stone-500/5 dark:bg-stone-400/5 blur-2xl rounded-full scale-125" />
              <MessageCircle className="w-12 h-12 text-stone-200 dark:text-stone-800 relative z-10" />
            </div>
            <p className="text-xs font-bold text-stone-400 dark:text-stone-600 tracking-[0.2em] uppercase">No comments</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => {
              const isOwner = comment.utilisateurId === currentUserId;

              return (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="shrink-0 pt-0.5">
                    {renderAvatar(comment, 'sm')}
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <p className="text-[15px] font-semibold truncate text-stone-900 dark:text-white">
                        {comment.utilisateurPrenom} {comment.utilisateurNom}
                      </p>

                      {canCreateComment && isOwner && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={deletingId === comment.id}
                          className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                          title={t('review.deleteComment')}
                        >
                          {deletingId === comment.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    <p className="text-[15px] sm:text-base text-stone-800 dark:text-stone-200 leading-relaxed break-words mt-0.5">
                    {(() => {
                      const text = showTranslation[comment.id]
                        ? translationByCommentId[comment.id]?.text || comment.texte
                        : comment.texte;
                      const parts = parseCommentWithTimestamps(text);
                      return parts.map((part, idx) => {
                        if (typeof part === 'string') {
                          return <span key={idx}>{part}</span>;
                        }
                        if (part.type === 'timestamp') {
                          return (
                            <button
                              key={idx}
                              onClick={() => handleTimestampClick(part.seconds)}
                              className="inline font-semibold text-stone-900 dark:text-white hover:opacity-75 transition-colors mx-0.5"
                            >
                              {part.value}
                            </button>
                          );
                        }
                        if (part.type === 'page') {
                          return (
                            <button
                              key={idx}
                              onClick={() => handlePageRefClick(part.page)}
                              className="inline font-semibold text-stone-900 dark:text-white hover:opacity-75 transition-colors mx-0.5"
                            >
                              {part.value}
                            </button>
                          );
                        }
                        return null;
                      });
                    })()}
                    </p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <p className="text-[12.5px] text-stone-500 dark:text-stone-400">
                        {formatRelativeDate(comment.date)}
                      </p>
                      
                      {canTranslateComments && (
                        <button
                          onClick={() => handleTranslateToggle(comment)}
                          className={`inline-flex items-center text-[12px] font-semibold transition-colors ${
                            showTranslation[comment.id]
                              ? "text-stone-900 dark:text-white hover:opacity-75"
                              : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
                          }`}
                          type="button"
                          disabled={translatingId === comment.id}
                        >
                          {translatingId === comment.id && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          )}
                          {showTranslation[comment.id] ? t("comments.showOriginal") : t("comments.showTranslation")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {isAdding && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('review.commentPlaceholder')}
                className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-stone-900 dark:text-white"
                rows={4}
                autoFocus
                disabled={submitting}
              />
              {/* Timestamp/page buttons only for clients who can add comments */}
              {canCreateComment && supportsTimestamps && (
                <button
                  onClick={insertTimestamp}
                  type="button"
                  className="absolute bottom-2 right-2 p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors"
                  title="Insérer le timestamp actuel"
                >
                  <Clock className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                </button>
              )}
              {canCreateComment && supportsPageRefs && (
                <button
                  onClick={insertPageRef}
                  type="button"
                  className="absolute bottom-2 right-2 p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors"
                  title={`Insérer la page actuelle (${currentPage || 1})`}
                >
                  <FileText className="w-4 h-4 text-stone-600 dark:text-stone-400" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 ikg-gradient-btn rounded-lg hover:opacity-90 transition-colors text-sm font-medium shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-900 dark:text-white" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {t('review.submit')}
              </button>

              <button
                onClick={() => {
                  setIsAdding(false);
                  setCommentText('');
                }}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                {t('review.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Add Comment Button - Fixed at bottom right */}
      {canCreateComment && !isAdding && (
        <div
          className={`z-[150] ${
            floatingButtonMode === 'fixed'
              ? 'fixed bottom-6 right-6 sm:bottom-8 sm:right-8'
              : 'absolute bottom-6 right-6 sm:bottom-8 sm:right-8'
          }`}
        >
          <button
            onClick={() => setIsAdding(true)}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-lg shadow-blue-900/20 dark:shadow-blue-300/10 flex items-center justify-center transition-colors"
            title={t('review.addComment')}
          >
            <Plus className="w-7 h-7 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
