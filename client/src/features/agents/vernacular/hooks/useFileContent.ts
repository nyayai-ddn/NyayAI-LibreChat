import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '~/hooks/AuthContext';

async function fetchFileContent(fileId: string, token: string): Promise<string> {
  const resp = await fetch(`/api/files/manager/${fileId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new Error(`Could not load file (${resp.status})`);
  }
  return resp.text();
}

export function useFileContent(fileId: string | null | undefined) {
  const { token } = useAuthContext();

  return useQuery({
    queryKey: ['file-content', fileId],
    queryFn: () => fetchFileContent(fileId!, token ?? ''),
    enabled: !!fileId && !!token,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
