export type DocFormat = 'markdown' | 'plaintext' | 'pdf' | 'docx' | 'unknown';

const EXT_MAP: Record<string, DocFormat> = {
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.txt': 'plaintext',
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.doc': 'docx',
};

const MIME_MAP: Record<DocFormat, string> = {
  markdown: 'text/markdown',
  plaintext: 'text/plain',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  unknown: 'application/octet-stream',
};

export function detectFormat(filename: string): DocFormat {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) return 'unknown';
  const ext = filename.slice(dotIdx).toLowerCase();
  return EXT_MAP[ext] ?? 'unknown';
}

export function mimeTypeFor(format: DocFormat): string {
  return MIME_MAP[format];
}

export function isTextFormat(format: DocFormat): boolean {
  return format === 'markdown' || format === 'plaintext';
}
