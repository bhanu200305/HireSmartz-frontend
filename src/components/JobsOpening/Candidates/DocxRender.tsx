import { useEffect, useRef, useState } from 'react';
import { Loader } from '../../shared/ui/loader';
import './docxRender.css';

type DocxRenderProps = {
  blob: Blob;
  /** `thumbnail`: first page scaled down to the box's width, no scroll
   * (Candidate Details / Assessment preview). `full`: every page at real
   * size, scrolling (ResumeViewerModal). */
  variant: 'thumbnail' | 'full';
  /** Shown if docx-preview can't parse the file. */
  fallback: React.ReactNode;
};

// Renders a .docx resume entirely in the browser with docx-preview — the
// file never leaves the app. docx-preview is loaded on demand so PDF-only
// users never download it.
const DocxRender = ({ blob, variant, fallback }: DocxRenderProps) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let cancelled = false;
    setStatus('loading');
    body.innerHTML = '';

    import('docx-preview')
      .then(({ renderAsync }) =>
        renderAsync(blob, body, undefined, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
        })
      )
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });

    return () => {
      cancelled = true;
    };
  }, [blob]);

  // Thumbnail: scale the rendered page so its full width fits the box.
  useEffect(() => {
    if (variant !== 'thumbnail' || status !== 'ready') return;
    const outer = outerRef.current;
    const page = bodyRef.current?.querySelector<HTMLElement>('section.docx');
    if (!outer || !page) return;
    const update = () => {
      const pageWidth = page.offsetWidth || 1;
      setScale(Math.min(1, outer.clientWidth / pageWidth));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [variant, status]);

  if (status === 'failed') return <>{fallback}</>;

  return (
    <div
      ref={outerRef}
      className={`relative h-full w-full ${
        variant === 'thumbnail'
          ? 'docx-render--thumbnail overflow-hidden'
          : 'docx-render--full overflow-auto'
      }`}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader />
        </div>
      )}
      <div
        ref={bodyRef}
        className={status === 'ready' ? '' : 'invisible'}
        style={
          variant === 'thumbnail'
            ? { transform: `scale(${scale})`, transformOrigin: 'top left' }
            : undefined
        }
      />
    </div>
  );
};

export default DocxRender;
