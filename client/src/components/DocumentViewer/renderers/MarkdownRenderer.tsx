import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface Props {
  data: ArrayBuffer;
}

// Custom components for document-style markdown (not chat-style)
const mdComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-3 mt-6 text-xl font-bold text-text-primary first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-2 mt-5 text-lg font-semibold text-text-primary">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold text-text-primary">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 text-sm leading-relaxed text-text-primary">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1 text-sm text-text-primary">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1 text-sm text-text-primary">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-border-light bg-surface-secondary px-3 py-2 text-left text-xs font-semibold text-text-primary">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-border-light px-3 py-2 text-sm text-text-primary">{children}</td>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-3 border-l-4 border-border-light pl-4 text-sm italic text-text-secondary">
      {children}
    </blockquote>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <code className="rounded bg-surface-secondary px-1 py-0.5 font-mono text-xs text-text-primary">
        {children}
      </code>
    ) : (
      <pre className="mb-3 overflow-x-auto rounded-md bg-surface-secondary p-3 font-mono text-xs text-text-primary">
        <code>{children}</code>
      </pre>
    ),
  hr: () => <hr className="my-4 border-border-light" />,
};

export default function MarkdownRenderer({ data }: Props) {
  const text = new TextDecoder('utf-8').decode(data);

  return (
    <div className="h-full overflow-y-auto px-6 py-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={mdComponents as Record<string, React.ElementType>}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
