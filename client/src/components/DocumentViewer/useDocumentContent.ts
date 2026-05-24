import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '~/hooks/AuthContext';

async function fetchContent(fileId: string, token: string): Promise<ArrayBuffer> {
  const resp = await fetch(`/api/files/manager/${fileId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Could not load file (${resp.status})`);
  return resp.arrayBuffer();
}

export function useDocumentContent(fileId: string | null | undefined) {
  const { token } = useAuthContext();

  return useQuery({
    queryKey: ['doc-content', fileId],
    queryFn: () => fetchContent(fileId!, token ?? ''),
    enabled: !!fileId && !!token,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
