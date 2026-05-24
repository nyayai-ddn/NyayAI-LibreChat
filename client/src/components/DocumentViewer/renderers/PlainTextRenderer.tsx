interface Props {
  data: ArrayBuffer;
}

export default function PlainTextRenderer({ data }: Props) {
  const text = new TextDecoder('utf-8').decode(data);

  return (
    <div className="h-full overflow-y-auto p-4">
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-text-primary">
        {text}
      </pre>
    </div>
  );
}
