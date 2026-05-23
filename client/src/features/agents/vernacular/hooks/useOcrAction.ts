import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '~/hooks/AuthContext';

export type OcrActionName = 'ocr' | 'translate' | 'summary';

type ActionPayload = {
  parent_file_id: string;
  filename: string;
  action: OcrActionName;
  source_lang?: string;
  target_lang?: string;
};

type ActionResult = {
  job_id: string;
  action: string;
  status: string;
  message: string;
};

async function postAction(payload: ActionPayload, token: string): Promise<ActionResult> {
  const resp = await fetch('/api/nyay/ocr/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error ?? `Request failed (${resp.status})`);
  }
  return resp.json();
}

export function useOcrAction(parentFileId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();

  return useMutation({
    mutationFn: (payload: ActionPayload) => postAction(payload, token ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocr-jobs', parentFileId] });
    },
  });
}
