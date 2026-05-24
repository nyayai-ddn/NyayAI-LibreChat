import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  data: ArrayBuffer;
}

export default function DocxRenderer({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setRendering(true);
    setRenderError(null);

    import('docx-preview').then(({ renderAsync }) =>
      renderAsync(data, containerRef.current!, containerRef.current!, {
        inWrapper: false,
        ignoreLastRenderedPageBreak: true,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
      }),
    )
      .then(() => setRendering(false))
      .catch((err: Error) => {
        setRenderError(err.message);
        setRendering(false);
      });
  }, [data]);

  return (
    <div className="relative h-full overflow-auto">
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Rendering document…
        </div>
      )}
      {renderError && (
        <div className="p-4 text-sm text-red-500">Failed to render document: {renderError}</div>
      )}
      {/* docx-preview injects HTML + scoped styles directly into this element */}
      <div
        ref={containerRef}
        className="docx-viewer-container p-4"
        style={{ visibility: rendering ? 'hidden' : 'visible' }}
      />
    </div>
  );
}
