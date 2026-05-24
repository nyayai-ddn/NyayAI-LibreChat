import { lazy, Suspense } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { detectFormat } from './detectFormat';
import { useDocumentContent } from './useDocumentContent';

const MarkdownRenderer  = lazy(() => import('./renderers/MarkdownRenderer'));
const PlainTextRenderer = lazy(() => import('./renderers/PlainTextRenderer'));
const PdfRenderer       = lazy(() => import('./renderers/PdfRenderer'));
const DocxRenderer      = lazy(() => import('./renderers/DocxRenderer'));
const UnknownRenderer   = lazy(() => import('./renderers/UnknownRenderer'));

function LoadingView() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-text-secondary">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading…
    </div>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-sm">
      <AlertTriangle className="h-6 w-6 text-yellow-500" />
      <span className="text-center text-text-secondary">{message}</span>
    </div>
  );
}

export interface DocumentViewerProps {
  fileId: string;
  filename: string;
  className?: string;
}

export default function DocumentViewer({ fileId, filename, className = '' }: DocumentViewerProps) {
  const format = detectFormat(filename);
  const { data, isLoading, error } = useDocumentContent(fileId);

  if (isLoading) return <LoadingView />;
  if (error) return <ErrorView message={error instanceof Error ? error.message : 'Failed to load'} />;
  if (!data) return null;

  return (
    <div className={`h-full w-full overflow-hidden ${className}`}>
      <Suspense fallback={<LoadingView />}>
        {format === 'markdown'  && <MarkdownRenderer  data={data} />}
        {format === 'plaintext' && <PlainTextRenderer data={data} />}
        {format === 'pdf'       && <PdfRenderer       data={data} />}
        {format === 'docx'      && <DocxRenderer      data={data} />}
        {format === 'unknown'   && <UnknownRenderer   filename={filename} />}
      </Suspense>
    </div>
  );
}
