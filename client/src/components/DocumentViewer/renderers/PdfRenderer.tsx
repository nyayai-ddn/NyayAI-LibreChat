import { useEffect, useState } from 'react';

interface Props {
  data: ArrayBuffer;
}

export default function PdfRenderer({ data }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data]);

  if (!blobUrl) return null;

  return (
    <iframe
      src={blobUrl}
      className="h-full w-full border-0"
      title="PDF Document"
    />
  );
}
