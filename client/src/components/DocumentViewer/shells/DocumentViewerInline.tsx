import DocumentViewer from '../DocumentViewer';

export interface DocumentViewerInlineProps {
  fileId: string;
  filename: string;
  /** Tailwind height class, e.g. "h-96" or "h-[500px]". Defaults to "h-96". */
  height?: string;
  className?: string;
}

/**
 * Fixed-height embedded viewer — for dashboards, chat threads, or any surface
 * where a modal/panel would be too disruptive.
 */
export default function DocumentViewerInline({
  fileId,
  filename,
  height = 'h-96',
  className = '',
}: DocumentViewerInlineProps) {
  return (
    <div
      className={`${height} w-full overflow-hidden rounded-lg border border-border-light bg-white dark:bg-gray-900 ${className}`}
    >
      <DocumentViewer fileId={fileId} filename={filename} className="h-full" />
    </div>
  );
}
