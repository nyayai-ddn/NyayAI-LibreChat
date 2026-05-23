import { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { X, AlertTriangle } from 'lucide-react';

const LANGUAGES = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'pa-IN', label: 'Punjabi' },
] as const;

function langLabel(code: string | null | undefined): string {
  if (!code) return 'Auto-detect';
  return LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

type Props = {
  open: boolean;
  onClose: () => void;
  detectedSourceLang?: string | null;
  onConfirm: (sourceLang: string | undefined, targetLang: string) => void;
};

export default function TranslateModal({ open, onClose, detectedSourceLang, onConfirm }: Props) {
  const [targetLang, setTargetLang] = useState<string>('en-IN');

  const sameLanguage = detectedSourceLang && detectedSourceLang === targetLang;

  const handleConfirm = () => {
    onConfirm(detectedSourceLang ?? undefined, targetLang);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-sm rounded-xl border border-border-light bg-white shadow-xl dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Translate Document</span>
            <button
              type="button"
              className="rounded-md p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Source language
              </label>
              <div className="rounded-md border border-border-light bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
                {langLabel(detectedSourceLang)}
                {detectedSourceLang ? null : (
                  <span className="ml-2 text-[10px] opacity-60">(auto-detect)</span>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Translate to
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full rounded-md border border-border-light bg-transparent px-3 py-2 text-sm text-text-primary"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {sameLanguage ? (
              <div className="flex items-center gap-2 rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Source and destination are the same language.
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-border-light px-4 py-3">
            <button
              type="button"
              className="rounded-md border border-border-light px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-md bg-text-primary px-3 py-1.5 text-sm text-white hover:opacity-80 disabled:opacity-40"
              disabled={!!sameLanguage}
              onClick={handleConfirm}
            >
              Translate
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
