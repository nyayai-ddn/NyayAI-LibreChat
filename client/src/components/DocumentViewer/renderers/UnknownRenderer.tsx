import { FileQuestion } from 'lucide-react';

interface Props {
  filename: string;
}

export default function UnknownRenderer({ filename }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <FileQuestion className="h-10 w-10 text-text-secondary opacity-40" />
      <p className="text-sm text-text-secondary">Preview not available for this file type.</p>
      <p className="font-mono text-xs text-text-secondary opacity-60">{filename}</p>
    </div>
  );
}
