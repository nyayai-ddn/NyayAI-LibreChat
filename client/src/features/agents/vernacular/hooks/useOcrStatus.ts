import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '~/hooks/AuthContext';

export type OcrStatus = 'pending' | 'uploading' | 'processing' | 'translating' | 'done' | 'error';

export type OcrStatusData = {
  file_id: string;
  status: OcrStatus;
  detected_language: string | null;
  detected_language_label: string | null;
  page_count: number | null;
  extracted_file_id: string | null;
  translated_file_id: string | null;
  summary_file_id: string | null;
  error: string | null;
};

const IN_PROGRESS: OcrStatus[] = ['pending', 'uploading', 'processing', 'translating'];

async function fetchOcrStatus(fileId: string, token: string): Promise<OcrStatusData> {
  const resp = await fetch(`/api/nyay/ocr/status/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    if (resp.status === 404) {
      return {
        file_id: fileId,
        status: 'pending',
        detected_language: null,
        detected_language_label: null,
        page_count: null,
        extracted_file_id: null,
        translated_file_id: null,
        summary_file_id: null,
        error: null,
      };
    }
    throw new Error(`Status fetch failed (${resp.status})`);
  }
  return resp.json();
}

export function useOcrStatus(fileId: string | null, enabled = false) {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();

  const query = useQuery({
    queryKey: ['ocr-status', fileId],
    queryFn: () => fetchOcrStatus(fileId!, token ?? ''),
    enabled: !!fileId && !!token && enabled,
    refetchInterval: (data) => {
      if (!data) return false;
      return IN_PROGRESS.includes(data.status) ? 3_000 : false;
    },
    staleTime: 0,
  });

  const prevStatus = query.data?.status;
  if (prevStatus === 'done') {
    queryClient.invalidateQueries({ queryKey: ['fm-files-all'] });
  }

  return query;
}
