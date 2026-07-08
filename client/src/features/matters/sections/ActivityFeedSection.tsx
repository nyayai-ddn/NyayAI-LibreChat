import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { mattersApi } from "../api/matters";
import { PageLoader } from "../components/ui/Spinner";

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  "matter.created":       { icon: "✨", label: "Matter created",        color: "bg-green-100 text-green-700" },
  "matter.updated":       { icon: "✏️", label: "Matter updated",        color: "bg-blue-100 text-blue-700" },
  "matter.refreshed":     { icon: "↻",  label: "Refreshed from eCourts", color: "bg-cyan-100 text-cyan-700" },
  "hearing.created":      { icon: "🏛️", label: "Hearing added",         color: "bg-blue-100 text-blue-700" },
  "hearing.updated":      { icon: "🏛️", label: "Hearing updated",       color: "bg-blue-50 text-blue-600" },
  "hearing.deleted":      { icon: "🗑️", label: "Hearing removed",       color: "bg-red-100 text-red-600" },
  "action.created":       { icon: "✅", label: "Task created",           color: "bg-green-100 text-green-700" },
  "action.updated":       { icon: "✅", label: "Task updated",           color: "bg-green-50 text-green-600" },
  "note.created":         { icon: "📝", label: "Note added",             color: "bg-yellow-100 text-yellow-700" },
  "note.deleted":         { icon: "🗑️", label: "Note deleted",           color: "bg-red-50 text-red-600" },
  "party.added":          { icon: "👤", label: "Party added",            color: "bg-purple-100 text-purple-700" },
  "party.removed":        { icon: "👤", label: "Party removed",          color: "bg-red-50 text-red-600" },
  "matter.member_added":  { icon: "👥", label: "Member added",           color: "bg-indigo-100 text-indigo-700" },
  "matter.member_removed":{ icon: "👥", label: "Member removed",         color: "bg-red-50 text-red-600" },
  "research.saved":       { icon: "🔍", label: "Research saved",         color: "bg-indigo-100 text-indigo-700" },
  "matter.archived":      { icon: "📦", label: "Matter archived",        color: "bg-gray-100 text-gray-600" },
  "matter.deleted":       { icon: "🗑️", label: "Matter deleted",         color: "bg-red-100 text-red-700" },
};

function getConfig(action: string) {
  return ACTION_CONFIG[action] ?? { icon: "•", label: action.replace(".", " "), color: "bg-gray-100 text-gray-600" };
}

function DetailBadges({ detail }: { detail: Record<string, unknown> }) {
  if (!detail || !Object.keys(detail).length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {Object.entries(detail)
        .filter(([k]) => !["ecourts_populated"].includes(k))
        .slice(0, 4)
        .map(([k, v]) => (
          <span key={k} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
            {k}: {String(v).slice(0, 40)}
          </span>
        ))}
    </div>
  );
}

export default function ActivityFeedSection({ matterId }: { matterId: string }) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["activity", matterId, page],
    queryFn: () => mattersApi.activity(matterId, page),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Activity Feed</h3>

      {isLoading && <PageLoader />}
      {!isLoading && !data?.events.length && (
        <p className="text-sm text-gray-400 text-center py-4">No activity recorded yet.</p>
      )}

      <div className="space-y-1">
        {data?.events.map((ev) => {
          const cfg = getConfig(ev.action);
          return (
            <div key={ev.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${cfg.color}`}>
                {cfg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-800">{cfg.label}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {format(new Date(ev.timestamp), "dd MMM, HH:mm")}
                  </span>
                </div>
                <DetailBadges detail={ev.detail} />
              </div>
            </div>
          );
        })}
      </div>

      {data?.events && data.events.length === 25 && (
        <button onClick={() => setPage((p) => p + 1)}
          className="mt-3 text-xs text-green-600 hover:underline w-full text-center">
          Load more
        </button>
      )}
    </div>
  );
}
