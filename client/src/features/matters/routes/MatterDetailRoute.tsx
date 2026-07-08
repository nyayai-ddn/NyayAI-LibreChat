/**
 * MatterDetailRoute — renders the LPMS MatterDetailPage inside LibreChat's layout.
 */
import { useMatterAuth } from '../hooks/useMatterAuth';
import MatterDetailPage from '../pages/MatterDetailPage';

export default function MatterDetailRoute() {
  const { ready, error } = useMatterAuth();

  if (error && !ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center max-w-md">
          <p className="font-semibold text-red-700">Could not connect to Matter Service</p>
          <p className="mt-1 text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-gray-400 animate-pulse">Loading matter…</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <MatterDetailPage />
    </div>
  );
}
