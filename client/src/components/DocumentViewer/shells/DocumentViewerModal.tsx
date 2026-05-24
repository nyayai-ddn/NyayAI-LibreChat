import { Dialog, DialogPanel } from '@headlessui/react';
import { X, Paperclip } from 'lucide-react';
import DocumentViewer from '../DocumentViewer';

export interface DocumentViewerModalProps {
  open: boolean;
  onClose: () => void;
  fileId: string;
  filename: string;
  onAttach?: (fileId: string, filename: string) => void;
}

export default function DocumentViewerModal({
  open,
  onClose,
  fileId,
  filename,
  onAttach,
}: DocumentViewerModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border-light bg-white shadow-xl dark:bg-gray-900">

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border-light px-4 py-3">
            <span className="truncate text-sm font-semibold text-text-primary">{filename}</span>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              {onAttach && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-md border border-border-light bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-hover"
                  onClick={() => { onAttach(fileId, filename); onClose(); }}
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  Attach to AI
                </button>
              )}
              <button
                type="button"
                className="rounded-md p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <DocumentViewer fileId={fileId} filename={filename} className="h-full" />
          </div>

        </DialogPanel>
      </div>
    </Dialog>
  );
}
