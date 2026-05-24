import type { OcrStatus } from '../hooks/useOcrStatus';

const STATUS_LABEL: Record<OcrStatus, string> = {
  pending: 'Queued…',
  uploading: 'Uploading…',
  processing: 'OCR running…',
  translating: 'Translating…',
  done: 'Done',
  error: 'Failed',
};

type Props = {
  status: OcrStatus;
  error?: string | null;
};

export default function OcrStatusIndicator({ status, error }: Props) {
  if (status === 'done') {
    return null;
  }

  if (status === 'error') {
    return (
      <span
        className="text-[10px] text-red-500"
        title={error ?? 'OCR failed'}
      >
        ✕ OCR failed
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[10px] text-text-secondary">
      <svg
        className="h-3 w-3 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      {STATUS_LABEL[status]}
    </span>
  );
}
