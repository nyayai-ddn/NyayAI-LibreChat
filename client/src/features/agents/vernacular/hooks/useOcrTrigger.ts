import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '~/hooks/AuthContext';

type TriggerPayload = {
  file_id: string;
  filename: string;
};

type TriggerResult = {
  file_id: string;
  status: string;
  message: string;
};

async function triggerOcr(payload: TriggerPayload, token: string): Promise<TriggerResult> {
  const resp = await fetch('/api/nyay/ocr/trigger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body?.error ?? `OCR trigger failed (${resp.status})`);
  }
  return resp.json();
}

export function useOcrTrigger() {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();

  return useMutation({
    mutationFn: (payload: TriggerPayload) => triggerOcr(payload, token ?? ''),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ocr-status', variables.file_id] });
    },
  });
}
