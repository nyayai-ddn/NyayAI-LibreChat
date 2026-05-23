import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '~/hooks/AuthContext';

export type VernacularJob = {
  job_id: string;
  parent_file_id: string;
  user_id: string;
  action: 'ocr' | 'translate' | 'summary';
  filename: string;
  status: 'pending' | 'running' | 'done' | 'error';
  output_file_id: string | null;
  source_lang: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const IN_PROGRESS = new Set<string>(['pending', 'running']);

async function fetchJobs(parentFileId: string, token: string): Promise<VernacularJob[]> {
  const resp = await fetch(`/api/nyay/ocr/jobs/${parentFileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Failed to fetch jobs (${resp.status})`);
  return resp.json();
}

export function useOcrJobs(parentFileId: string | null) {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();
  const seenDone = useRef(new Set<string>());

  const query = useQuery({
    queryKey: ['ocr-jobs', parentFileId],
    queryFn: () => fetchJobs(parentFileId!, token ?? ''),
    enabled: !!parentFileId && !!token,
    refetchInterval: (data) => {
      if (!data) return false;
      return data.some((j) => IN_PROGRESS.has(j.status)) ? 3_000 : false;
    },
    staleTime: 0,
  });

  // Invalidate file list once per completed job so generated files appear in the tree
  useEffect(() => {
    if (!query.data) return;
    let needsInvalidate = false;
    for (const job of query.data) {
      if (job.status === 'done' && !seenDone.current.has(job.job_id)) {
        seenDone.current.add(job.job_id);
        needsInvalidate = true;
      }
    }
    if (needsInvalidate) {
      queryClient.invalidateQueries({ queryKey: ['fm-files-all'] });
    }
  }, [query.data, queryClient]);

  return query;
}
