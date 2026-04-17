import React, { useState, useRef, useEffect, RefObject } from 'react';
import { Circle, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/core/auth/AuthProvider';
import { useI18n } from '@/core/i18n/I18nProvider';
import { annotationsApi } from '@/core/api/client';
import { useToast } from '@/shared/components/ui/toast';
import type { ApiAnnotation } from '@/types/index';

interface Annotation {
  id: number;
  x: number;
  y: number;
  radius: number;
  isOwner: boolean;
  authorName: string;
}

interface AnnotationToolProps {
  containerRef: RefObject<HTMLDivElement>;
  zoom: number;
  versionId: number;
  refreshKey?: number;
  interactive?: boolean;
  displayOnly?: boolean;
}

export function AnnotationTool({
  containerRef,
  zoom,
  versionId,
  refreshKey = 0,
  interactive = true,
  displayOnly = false,
}: AnnotationToolProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();

  const currentUserId = String(user?.id ?? '');

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!versionId) return;
    let cancelled = false;

    const fetchAnnotations = async () => {
      try {
        const data = await annotationsApi.byVersion(versionId);
        if (!cancelled) {
          setAnnotations(
            data.map((a: ApiAnnotation) => ({
              id: a.id,
              x: (a.positionJson as any)?.x ?? 0,
              y: (a.positionJson as any)?.y ?? 0,
              radius: (a.rayonJson as any)?.r ?? (a.rayonJson as any)?.radius ?? 20,
              isOwner: String(a.utilisateurId) === currentUserId,
              authorName: `${a.utilisateurPrenom} ${a.utilisateurNom}`,
            }))
          );
        }
      } catch {
        if (!cancelled) setAnnotations([]);
      }
    };

    fetchAnnotations();
    return () => {
      cancelled = true;
    };
  }, [versionId, currentUserId, refreshKey]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!interactive || displayOnly) return;
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: -Date.now(),
      x,
      y,
      radius: 20,
      isOwner: true,
      authorName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
    };

    setCurrentAnnotation(newAnnotation);
    setIsDrawing(true);
    startPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentAnnotation) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const currentPX = e.clientX - rect.left;
    const currentPY = e.clientY - rect.top;

    const dx = (currentPX - startPosRef.current.x) / zoom;
    const dy = (currentPY - startPosRef.current.y) / zoom;
    const distance = Math.sqrt(dx * dx + dy * dy);

    setCurrentAnnotation({
      ...currentAnnotation,
      radius: Math.max(10, distance),
    });
  };

  const handleMouseUp = async () => {
    if (isDrawing && currentAnnotation && versionId) {
      setSaving(true);
      try {
        const created = await annotationsApi.create({
          versionId,
          positionJson: { x: currentAnnotation.x, y: currentAnnotation.y },
          rayonJson: { r: currentAnnotation.radius },
        });

        setAnnotations((prev) => [
          ...prev,
          {
            id: created.id,
            x: (created.positionJson as any)?.x ?? currentAnnotation.x,
            y: (created.positionJson as any)?.y ?? currentAnnotation.y,
            radius: (created.rayonJson as any)?.r ?? (created.rayonJson as any)?.radius ?? currentAnnotation.radius,
            isOwner: true,
            authorName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim(),
          },
        ]);
      } catch {
        // keep UI stable
      } finally {
        setSaving(false);
      }
      setCurrentAnnotation(null);
    }
    setIsDrawing(false);
  };

  const handleDeleteAnnotation = async (annotationId: number) => {
    setDeletingId(annotationId);
    try {
      await annotationsApi.delete(annotationId);
      setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAnnotationDragStart = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedAnnotation(id);
    setIsDragging(true);
  };

  const handleAnnotationResize = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedAnnotation(id);
    setIsResizing(true);
  };

  const handleDocumentMouseMove = (e: MouseEvent) => {
    if (!selectedAnnotation) return;
    const annotation = annotations.find((a) => a.id === selectedAnnotation);
    if (!annotation || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (isDragging) {
      setAnnotations(
        annotations.map((a) =>
          a.id === selectedAnnotation
            ? { ...a, x: (px / rect.width) * 100, y: (py / rect.height) * 100 }
            : a
        )
      );
    } else if (isResizing) {
      const dx = (px - (annotation.x / 100) * rect.width) / zoom;
      const dy = (py - (annotation.y / 100) * rect.height) / zoom;
      setAnnotations(
        annotations.map((a) =>
          a.id === selectedAnnotation ? { ...a, radius: Math.max(10, Math.sqrt(dx * dx + dy * dy)) } : a
        )
      );
    }
  };

  const handleDocumentMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setSelectedAnnotation(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleDocumentMouseMove);
      document.addEventListener('mouseup', handleDocumentMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleDocumentMouseMove);
        document.removeEventListener('mouseup', handleDocumentMouseUp);
      };
    }
  }, [isDragging, isResizing, selectedAnnotation, annotations, zoom]);

  return (
    <div
      className={`absolute inset-0 ${interactive && !displayOnly ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ zIndex: interactive && !displayOnly ? 40 : 1 }}
    >
      {annotations.map((annotation) => (
        <div key={annotation.id} className="absolute" style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}>
          <svg
            style={{
              position: 'absolute',
              left: -annotation.radius,
              top: -annotation.radius,
              width: annotation.radius * 2,
              height: annotation.radius * 2,
              pointerEvents: 'none',
            }}
          >
            <circle
              cx={annotation.radius}
              cy={annotation.radius}
              r={annotation.radius - 2}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              opacity="0.9"
            />
          </svg>

          {!displayOnly && (
            <>
              <div
                className="bg-stone-900 dark:bg-stone-100 rounded-full border-2 border-white shadow-lg"
                onMouseDown={(e) => interactive && handleAnnotationDragStart(e, annotation.id)}
                style={{
                  position: 'absolute',
                  left: -6,
                  top: -6,
                  width: 12,
                  height: 12,
                  cursor: 'move',
                  pointerEvents: interactive ? 'auto' : 'none',
                }}
              />

              <div
                className="bg-white rounded-full border-2 border-stone-800 dark:border-stone-200 shadow-lg"
                onMouseDown={(e) => interactive && handleAnnotationResize(e, annotation.id)}
                style={{
                  position: 'absolute',
                  left: annotation.radius - 6,
                  top: -6,
                  width: 12,
                  height: 12,
                  cursor: 'ew-resize',
                  pointerEvents: interactive ? 'auto' : 'none',
                }}
              />

              {annotation.isOwner && (
                <button
                  style={{
                    position: 'absolute',
                    left: -annotation.radius - 8,
                    top: -annotation.radius - 8,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAnnotation(annotation.id);
                  }}
                  disabled={deletingId === annotation.id}
                  className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                  title={t('review.deleteAnnotation')}
                >
                  {deletingId === annotation.id ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[#6893e8]" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      ))}

      {!displayOnly && currentAnnotation && (
        <svg
          style={{
            position: 'absolute',
            left: `${currentAnnotation.x}%`,
            top: `${currentAnnotation.y}%`,
            marginLeft: -currentAnnotation.radius,
            marginTop: -currentAnnotation.radius,
            width: currentAnnotation.radius * 2,
            height: currentAnnotation.radius * 2,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <circle
            cx={currentAnnotation.radius}
            cy={currentAnnotation.radius}
            r={currentAnnotation.radius - 2}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            opacity="0.7"
          />
        </svg>
      )}

      {!displayOnly && annotations.length === 0 && !isDrawing && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-lg text-sm shadow-lg pointer-events-none">
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4" />
            <span>Cliquez et glissez pour créer une annotation circulaire</span>
          </div>
        </div>
      )}

      {!displayOnly && saving && (
        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin text-[#6893e8]" />
          Sauvegarde...
        </div>
      )}
    </div>
  );
}
