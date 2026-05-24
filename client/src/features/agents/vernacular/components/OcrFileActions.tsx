/**
 * Shown on PDF file rows in the FM Panel.
 * Handles the full OCR lifecycle: trigger → status polling → language badge → viewer.
 */
import { useState } from 'react';
import { useOcrTrigger } from '../hooks/useOcrTrigger';
import { useOcrStatus, type OcrStatusData } from '../hooks/useOcrStatus';
import LanguageBadge from './LanguageBadge';
import OcrStatusIndicator from './OcrStatusIndicator';
import TranslationViewer from './TranslationViewer';

type Props = {
  fileId: string;
  filename: string;
  onAttach: (attachFileId: string, attachFilename: string) => void;
};

const IN_PROGRESS = new Set(['pending', 'uploading', 'processing', 'translating']);

export default function OcrFileActions({ fileId, filename, onAttach }: Props) {
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const trigger = useOcrTrigger();
  const { data: ocrData } = useOcrStatus(fileId, pollingEnabled);

  const status = ocrData?.status ?? null;
  const isInProgress = status ? IN_PROGRESS.has(status) : false;
  const isDone = status === 'done';
  const isError = status === 'error';
  const isMutating = trigger.isLoading;

  const handleTrigger = () => {
    setPollingEnabled(true);
    trigger.mutate({ file_id: fileId, filename });
  };

  if (trigger.isSuccess && !pollingEnabled) {
    setPollingEnabled(true);
  }

  return (
    <>
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {isDone && ocrData?.detected_language_label ? (
          <LanguageBadge languageLabel={ocrData.detected_language_label} />
        ) : null}

        {isInProgress || isMutating ? <OcrStatusIndicator status={isMutating ? 'pending' : status!} /> : null}
        {isError ? <OcrStatusIndicator status="error" error={ocrData?.error} /> : null}
        {trigger.isError ? (
          <span className="text-[10px] text-red-500" title={trigger.error?.message}>
            Failed
          </span>
        ) : null}

        {isDone ? (
          <button
            type="button"
            className="inline-flex items-center rounded border border-border-light px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:border-text-secondary hover:text-text-primary"
            onClick={() => setViewerOpen(true)}
            title="View extracted text and translation"
          >
            View
          </button>
        ) : null}

        {!isDone && !isInProgress && !isMutating ? (
          <button
            type="button"
            className="inline-flex items-center rounded border border-border-light px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:border-text-secondary hover:text-text-primary disabled:opacity-40"
            onClick={handleTrigger}
            disabled={isMutating}
            title="Extract text and translate to English"
          >
            Extract & Translate
          </button>
        ) : null}
      </div>

      {isDone && ocrData ? (
        <TranslationViewer
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          sourceFilename={filename}
          ocrData={ocrData as OcrStatusData}
          languageLabel={ocrData.detected_language_label}
          onAttach={onAttach}
        />
      ) : null}
    </>
  );
}
