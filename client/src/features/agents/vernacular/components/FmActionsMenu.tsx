/**
 * S3-style Actions dropdown for a single FM file.
 *
 * isOcrSupported  — PDF or DOCX: show Extract Text / Translate / Summary actions
 * isTextDoc       — .md / .txt: show Translate via parent
 * parentFileId    — set on derived files (OCR output); used as the job source for Translate
 *
 * View is always shown — opens DocumentViewerModal for the file itself.
 */
import { useState } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import { ChevronDown, Loader2, Check, AlertTriangle, Eye, Paperclip, Trash2 } from 'lucide-react';
import { useOcrAction } from '../hooks/useOcrAction';
import { useOcrJobs } from '../hooks/useOcrJobs';
import { DocumentViewerModal } from '~/components/DocumentViewer';
import TranslateModal from './TranslateModal';

type Props = {
  fileId: string;
  filename: string;
  isOcrSupported: boolean;
  isTextDoc: boolean;
  parentFileId?: string;
  onAttachFile: (fileId: string, filename: string) => void;
  onDeleteFile: () => void;
};

function JobStatusIcon({ job }: { job: ReturnType<typeof useOcrJobs>['data'] extends (infer J)[] | undefined ? J | undefined : never }) {
  if (!job) return null;
  if (job.status === 'pending' || job.status === 'running') {
    return <Loader2 className="h-3 w-3 animate-spin text-text-secondary" />;
  }
  if (job.status === 'done') {
    return <Check className="h-3 w-3 text-green-500" />;
  }
  if (job.status === 'error') {
    return <AlertTriangle className="h-3 w-3 text-yellow-500" aria-label={job.error ?? 'Error'} />;
  }
  return null;
}

function itemCls(active: boolean, disabled = false) {
  return [
    'flex w-full items-center justify-between gap-3 px-3 py-2 text-sm',
    disabled
      ? 'cursor-not-allowed opacity-40'
      : active
        ? 'bg-surface-hover text-text-primary'
        : 'text-text-primary',
  ].join(' ');
}

export default function FmActionsMenu({
  fileId,
  filename,
  isOcrSupported,
  isTextDoc,
  parentFileId,
  onAttachFile,
  onDeleteFile,
}: Props) {
  const [translateOpen, setTranslateOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // For OCR-able files: poll jobs using own fileId.
  // For derived text docs: poll using parentFileId so we see the parent's job status.
  const jobSourceId = isTextDoc && parentFileId ? parentFileId : fileId;
  const { data: jobs = [] } = useOcrJobs(isOcrSupported || (isTextDoc && !!parentFileId) ? jobSourceId : null);
  const action = useOcrAction(jobSourceId);

  const ocrJob       = jobs.find((j) => j.action === 'ocr');
  const translateJob = jobs.find((j) => j.action === 'translate');
  const summaryJob   = jobs.find((j) => j.action === 'summary');

  const ocrDone      = ocrJob?.status === 'done';
  const translateDone = translateJob?.status === 'done';

  const ocrRunning     = ocrJob?.status === 'pending' || ocrJob?.status === 'running';
  const translateRunning = translateJob?.status === 'pending' || translateJob?.status === 'running';
  const summaryRunning = summaryJob?.status === 'pending' || summaryJob?.status === 'running';

  const canRunOcr    = isOcrSupported && !ocrRunning && !ocrDone;
  const canTranslate = ocrDone && !translateRunning && !translateDone;
  const canSummarise = (ocrDone || translateDone) && !summaryRunning && summaryJob?.status !== 'done';

  const detectedSourceLang = translateJob?.source_lang ?? null;

  const triggerAction = (
    act: 'ocr' | 'translate' | 'summary',
    sourceLang?: string,
    targetLang?: string,
  ) => {
    const triggerFileId = isTextDoc && parentFileId ? parentFileId : fileId;
    action.mutate({
      parent_file_id: triggerFileId,
      filename,
      action: act,
      ...(sourceLang ? { source_lang: sourceLang } : {}),
      ...(targetLang ? { target_lang: targetLang } : {}),
    });
  };

  return (
    <>
      <Menu as="div" className="relative">
        <MenuButton className="inline-flex items-center gap-1 rounded border border-border-light px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:border-text-secondary hover:text-text-primary">
          Actions
          <ChevronDown className="h-3 w-3" />
        </MenuButton>

        <MenuItems
          anchor="bottom end"
          className="z-50 mt-1 w-52 rounded-lg border border-border-light bg-white py-1 shadow-lg dark:bg-gray-900"
        >
          {/* OCR actions — PDF/DOCX source files only */}
          {isOcrSupported && (
            <>
              <MenuItem disabled={!canRunOcr}>
                {({ active }) => (
                  <button
                    type="button"
                    className={itemCls(active, !canRunOcr)}
                    onClick={() => canRunOcr && triggerAction('ocr')}
                  >
                    <span>Extract Text (OCR)</span>
                    <JobStatusIcon job={ocrJob} />
                  </button>
                )}
              </MenuItem>

              <MenuItem disabled={!canTranslate}>
                {({ active }) => (
                  <button
                    type="button"
                    className={itemCls(active, !canTranslate)}
                    onClick={() => canTranslate && setTranslateOpen(true)}
                  >
                    <span>Translate…</span>
                    <JobStatusIcon job={translateJob} />
                  </button>
                )}
              </MenuItem>

              <MenuItem disabled={!canSummarise}>
                {({ active }) => (
                  <button
                    type="button"
                    className={itemCls(active, !canSummarise)}
                    onClick={() => canSummarise && triggerAction('summary')}
                  >
                    <span>Generate Summary</span>
                    <JobStatusIcon job={summaryJob} />
                  </button>
                )}
              </MenuItem>

              <div className="my-1 border-t border-border-light" />
            </>
          )}

          {/* Translate action — derived text docs (.md from OCR) */}
          {isTextDoc && parentFileId && (
            <>
              <MenuItem disabled={!canTranslate}>
                {({ active }) => (
                  <button
                    type="button"
                    className={itemCls(active, !canTranslate)}
                    onClick={() => canTranslate && setTranslateOpen(true)}
                  >
                    <span>Translate…</span>
                    <JobStatusIcon job={translateJob} />
                  </button>
                )}
              </MenuItem>
              <div className="my-1 border-t border-border-light" />
            </>
          )}

          {/* View — always present, opens this file in the right format viewer */}
          <MenuItem>
            {({ active }) => (
              <button
                type="button"
                className={itemCls(active)}
                onClick={() => setViewerOpen(true)}
              >
                <span className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5" />
                  View
                </span>
              </button>
            )}
          </MenuItem>

          <MenuItem>
            {({ active }) => (
              <button
                type="button"
                className={itemCls(active)}
                onClick={() => onAttachFile(fileId, filename)}
              >
                <span className="flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" />
                  Add to Chat
                </span>
              </button>
            )}
          </MenuItem>

          <div className="my-1 border-t border-border-light" />

          <MenuItem>
            {({ active }) => (
              <button
                type="button"
                className={[itemCls(active), 'text-red-500'].join(' ')}
                onClick={onDeleteFile}
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </span>
              </button>
            )}
          </MenuItem>
        </MenuItems>
      </Menu>

      <TranslateModal
        open={translateOpen}
        onClose={() => setTranslateOpen(false)}
        detectedSourceLang={detectedSourceLang}
        onConfirm={(sourceLang, targetLang) => triggerAction('translate', sourceLang, targetLang)}
      />

      {/* View opens this file directly — PDF gets native viewer, DOCX gets docx-preview, MD gets markdown renderer */}
      <DocumentViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        filename={filename}
        fileId={fileId}
        onAttach={onAttachFile}
      />
    </>
  );
}
