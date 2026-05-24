/**
 * TranslationViewer — modal for viewing OCR output files.
 *
 * Shows tabs for whichever of OCR text / Translation / Summary are available.
 * Each tab fetches content lazily via the FM content endpoint.
 */
import { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { X, Paperclip } from 'lucide-react';
import { DocumentViewer } from '~/components/DocumentViewer';
import type { VernacularJob } from '../hooks/useOcrJobs';

type Tab = 'ocr' | 'translate' | 'summary';

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: 'ocr', label: 'OCR Text' },
  { key: 'translate', label: 'English Translation' },
  { key: 'summary', label: 'Summary' },
];

function TabPane({
  fileId,
  filename,
  onAttach,
}: {
  fileId: string | null | undefined;
  filename: string;
  onAttach: (fileId: string) => void;
}) {
  if (!fileId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        Not available — run the action first.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <DocumentViewer fileId={fileId} filename={filename} className="h-full" />
      </div>
      <div className="shrink-0 border-t border-border-light px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-md border border-border-light bg-surface-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover"
          onClick={() => onAttach(fileId)}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach to AI
        </button>
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  sourceFilename: string;
  jobs: VernacularJob[];
  onAttach: (fileId: string, filename: string) => void;
};

export default function TranslationViewer({ open, onClose, sourceFilename, jobs, onAttach }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  const doneJobs = new Map(
    jobs.filter((j) => j.status === 'done' && j.output_file_id).map((j) => [j.action, j]),
  );

  const availableTabs = TAB_CONFIG.filter((t) => doneJobs.has(t.key));
  const currentTab = doneJobs.has(activeTab) ? activeTab : (availableTabs[0]?.key ?? 'ocr');
  const activeJob = doneJobs.get(currentTab);

  const handleAttach = (fileId: string) => {
    const suffixes: Record<Tab, string> = {
      ocr: '-ocr.md',
      translate: '-en.md',
      summary: '-smry.md',
    };
    const stem = sourceFilename.replace(/\.[^.]+$/, '');
    onAttach(fileId, `${stem}${suffixes[currentTab]}`);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border-light bg-white shadow-xl dark:bg-gray-900">

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border-light px-4 py-3">
            <span className="truncate text-sm font-semibold text-text-primary">
              {sourceFilename}
            </span>
            <button
              type="button"
              className="ml-3 shrink-0 rounded-md p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex shrink-0 border-b border-border-light">
            {TAB_CONFIG.map((tab) => {
              const available = doneJobs.has(tab.key);
              return (
                <button
                  key={tab.key}
                  type="button"
                  disabled={!available}
                  className={[
                    'px-4 py-2.5 text-sm font-medium transition-colors',
                    !available
                      ? 'cursor-not-allowed opacity-30 text-text-secondary'
                      : currentTab === tab.key
                        ? 'border-b-2 border-text-primary text-text-primary'
                        : 'text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                  onClick={() => available && setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <TabPane
              key={currentTab}
              fileId={activeJob?.output_file_id}
              filename={`${sourceFilename.replace(/\.[^.]+$/, '')}-${currentTab}.md`}
              onAttach={handleAttach}
            />
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
