/**
 * useMatterAuth — bridges LibreChat's auth context into the Matter Management
 * feature module.
 *
 * On mount:
 *  1. Reads the current JWT token from LibreChat's AuthContext.
 *  2. Stores it in localStorage['nyayai_token'] so all LPMS API calls
 *     (which use the axios interceptor reading that key) work unchanged.
 *  3. Calls GET /api/v1/auth/me on matter-service, which:
 *       - Accepts the LibreChat JWT (HS256, shared JWT_SECRET)
 *       - Resolves company_slug → firm UUID
 *       - Auto-creates the firm if this is first access
 *       - Returns { firm_id, user_id, firm_role }
 *  4. Stores the resolved UUIDs in localStorage so LPMS components that
 *     need them (e.g. DocumentsSection → firm_id) work correctly.
 *
 * Re-runs when the LibreChat token changes (e.g. after silent refresh).
 */
import { useEffect, useState } from 'react';
import { useAuthContext } from '~/hooks/AuthContext';

interface MatterAuthState {
  ready:    boolean;
  firmId:   string | null;
  userId:   string | null;
  firmRole: string;
  error:    string | null;
}

export function useMatterAuth(): MatterAuthState {
  const { token } = useAuthContext();
  const [state, setState] = useState<MatterAuthState>({
    ready:    false,
    firmId:   localStorage.getItem('nyayai_firm_id'),
    userId:   localStorage.getItem('nyayai_user_id'),
    firmRole: 'partner',
    error:    null,
  });

  useEffect(() => {
    if (!token) return;

    // Always keep nyayai_token in sync with LibreChat's token
    localStorage.setItem('nyayai_token', token);

    // Resolve firm context from matter-service
    let cancelled = false;
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`/auth/me returned ${r.status}`);
        return r.json();
      })
      .then((data: { firm_id: string; user_id: string; firm_role: string; name: string }) => {
        if (cancelled) return;
        localStorage.setItem('nyayai_firm_id', data.firm_id);
        localStorage.setItem('nyayai_user_id', data.user_id);
        setState({ ready: true, firmId: data.firm_id, userId: data.user_id, firmRole: data.firm_role, error: null });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.error('[useMatterAuth] Failed to resolve firm context:', err.message);
        // If we already have cached values, stay usable
        const cached = localStorage.getItem('nyayai_firm_id');
        setState((s) => ({ ...s, ready: !!cached, error: err.message }));
      });

    return () => { cancelled = true; };
  }, [token]);

  return state;
}
