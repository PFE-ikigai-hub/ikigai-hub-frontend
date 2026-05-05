// Ce fichier gere une partie du frontend.
import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
let workerInitialized = false;
if (typeof window !== 'undefined' && !workerInitialized) {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    workerInitialized = true;
  } catch (err) {
    console.warn('PDF worker init failed:', err);
  }
}

interface PdfViewerProps {
  url: string;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function PdfViewer({ url, currentPage, onPageChange }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ignoreNextScrollSyncRef = useRef(false);
  const pageFromObserverRef = useRef<number | null>(null);

  const onDocumentLoadSuccess = useCallback(({ numPages: pages }: { numPages: number }) => {
    setNumPages(pages);
    pageRefs.current = new Array(pages).fill(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message);
  }, []);
  useEffect(() => {
    if (!containerRef.current || numPages === 0) return;
    const container = containerRef.current;

    const syncPageFromScroll = () => {
      if (ignoreNextScrollSyncRef.current) return;
      const refs = pageRefs.current.filter((ref): ref is HTMLDivElement => !!ref);
      if (!refs.length) return;

      const targetY = container.scrollTop + container.clientHeight * 0.35;
      let activePage = 1;
      let minDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < refs.length; i += 1) {
        const ref = refs[i];
        const top = ref.offsetTop;
        const bottom = top + ref.offsetHeight;

        if (targetY >= top && targetY <= bottom) {
          activePage = i + 1;
          minDistance = 0;
          break;
        }

        const distance = Math.min(Math.abs(targetY - top), Math.abs(targetY - bottom));
        if (distance < minDistance) {
          minDistance = distance;
          activePage = i + 1;
        }
      }

      if (activePage !== currentPage) {
        pageFromObserverRef.current = activePage;
        onPageChange(activePage);
      }
    };

    container.addEventListener('scroll', syncPageFromScroll, { passive: true });
    window.setTimeout(syncPageFromScroll, 0);
    return () => container.removeEventListener('scroll', syncPageFromScroll);
  }, [numPages, currentPage, onPageChange]);
  useEffect(() => {
    if (pageFromObserverRef.current === currentPage) {
      pageFromObserverRef.current = null;
      return;
    }
    const pageRef = pageRefs.current[currentPage - 1];
    if (pageRef && containerRef.current) {
      ignoreNextScrollSyncRef.current = true;
      pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        ignoreNextScrollSyncRef.current = false;
      }, 450);
    }
  }, [currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <p className="text-red-500">Error loading PDF: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-stone-100 dark:bg-stone-900">
      <div className="bg-white/40 dark:bg-stone-900/40 backdrop-blur-md border-b border-stone-100/30 dark:border-stone-800/30 px-6 py-2 flex items-center justify-center gap-4">
        <div className="flex items-center bg-white/80 dark:bg-stone-800/80 rounded-xl shadow-sm border border-stone-200/40 dark:border-stone-700/40 p-0.5">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors text-stone-500 disabled:opacity-40"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-stone-600 dark:text-stone-400 min-w-[80px] text-center border-x border-stone-100 dark:border-stone-700 mx-1">
            Page {currentPage} / {numPages || '?'}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors text-stone-500 disabled:opacity-40"
            type="button"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-4 bg-stone-200 dark:bg-stone-700" />
        <div className="flex items-center bg-white/80 dark:bg-stone-800/80 rounded-xl shadow-sm border border-stone-200/40 dark:border-stone-700/40 p-0.5">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors text-stone-500"
            type="button"
          >
            -
          </button>
          <span className="text-xs font-mono text-stone-600 dark:text-stone-400 min-w-[48px] text-center border-x border-stone-100 dark:border-stone-700 mx-1">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded transition-colors text-stone-500"
            type="button"
          >
            +
          </button>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-4"
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-full" />
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              ref={(el) => { pageRefs.current[pageNum - 1] = el; }}
              data-page-number={pageNum}
              className="mb-4 flex justify-center"
            >
              <Page
                pageNumber={pageNum}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                loading={
                  <div className="flex items-center justify-center min-h-[240px] w-full">
                    <div className="animate-spin w-6 h-6 border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-full" />
                  </div>
                }
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}