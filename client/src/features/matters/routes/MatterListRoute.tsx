/**
 * MatterListRoute — renders the LPMS MatterListPage inside LibreChat's layout.
 * Handles auth bridge and shows a loading/error state while firm context resolves.
 */
import { useMatterAuth } from '../hooks/useMatterAuth';
import MatterListPage from '../pages/MatterListPage';

export default function MatterListRoute() {
  const { ready, error } = useMatterAuth();

  if (error && !ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-md">
          <p className="font-semibold text-red-700">Could not connect to Matter Service</p>
          <p className="mt-1 text-sm text-red-500">{error}</p>
          <p className="mt-3 text-xs text-gray-500">
            Ensure matter-service is running on :8200 and is reachable via Nginx.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-400 animate-pulse">Loading matters…</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <MatterListPage />
    </div>
  );
}
