import { clsx } from "clsx";

const colorMap: Record<string, string> = {
  active:          "bg-green-100 text-green-800",
  dormant:         "bg-yellow-100 text-yellow-800",
  closed:          "bg-gray-100 text-gray-700",
  archived:        "bg-gray-200 text-gray-600",
  synced:          "bg-blue-100 text-blue-700",
  sync_failed:     "bg-red-100 text-red-700",
  not_configured:  "bg-gray-100 text-gray-500",
  pending_cnr:     "bg-orange-100 text-orange-700",
  scheduled:       "bg-blue-100 text-blue-700",
  heard:           "bg-green-100 text-green-700",
  adjourned:       "bg-yellow-100 text-yellow-700",
  stayed:          "bg-purple-100 text-purple-700",
  pending:         "bg-yellow-100 text-yellow-800",
  in_progress:     "bg-blue-100 text-blue-800",
  done:            "bg-green-100 text-green-800",
  dropped:         "bg-gray-100 text-gray-600",
  high:            "bg-red-100 text-red-800",
  urgent:          "bg-red-200 text-red-900",
  normal:          "bg-gray-100 text-gray-700",
  low:             "bg-gray-50 text-gray-500",
  criminal:        "bg-red-50 text-red-800",
  civil:           "bg-blue-50 text-blue-800",
  writ:            "bg-purple-50 text-purple-800",
  commercial:      "bg-indigo-50 text-indigo-800",
  family:          "bg-pink-50 text-pink-800",
  arbitration:     "bg-teal-50 text-teal-800",
  other:           "bg-gray-50 text-gray-600",
};

interface Props {
  label: string;
  className?: string;
}

export default function Badge({ label, className }: Props) {
  const color = colorMap[label] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", color, className)}>
      {label.replace(/_/g, " ")}
    </span>
  );
}
