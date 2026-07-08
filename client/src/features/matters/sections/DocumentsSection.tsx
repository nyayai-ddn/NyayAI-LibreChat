import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { format } from "date-fns";
import Button from "../components/ui/Button";
import { PageLoader } from "../components/ui/Spinner";
import { documentsApi } from "../api/copilot";
import { mattersApi } from "../api/matters";

const DOC_TYPES = ["pleading", "order", "annexure", "evidence", "research", "other"];
const MIME_MAP: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "image/jpeg": "JPG",
  "image/png": "PNG",
};

function bytesToSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Doc {
  id: string; filename: string; doc_type: string; mime_type: string;
  size_bytes: number; ocr_status: string; created_at: string; s3_key: string;
}

export default function DocumentsSection({ matterId, firmId }: { matterId: string; firmId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("pleading");
  const [filter, setFilter] = useState("");

  // Documents are stored in matter-service via the document-service pipeline
  // In dev (no S3), list from matter-service directly
  const { data, isLoading } = useQuery({
    queryKey: ["documents", matterId],
    queryFn: async () => {
      try {
        const r = await fetch(`/api/v1/matters/${matterId}/documents`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}` },
        });
        if (r.ok) return r.json() as Promise<Doc[]>;
        return [] as Doc[];
      } catch {
        return [] as Doc[];
      }
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Single-step direct upload — service handles S3 server-side (no browser CORS issues)
      const form = new FormData();
      form.append("file", file);
      form.append("matter_id", matterId);
      form.append("doc_type", docType);

      const resp = await fetch("/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}` },
        body: form,
      });

      const result = await resp.json();

      if (!resp.ok) {
        toast.error(result.detail ?? `Upload failed (${resp.status})`);
        return;
      }

      toast.success(`${file.name} uploaded — OCR processing in background`);
      qc.invalidateQueries({ queryKey: ["documents", matterId] });
    } catch (err: unknown) {
      toast.error("Upload failed — document-service may be down. Check /tmp/nyayai-document-service.log");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownload = async (doc: Doc) => {
    try {
      const result = await documentsApi.getDownloadUrl(doc.id, doc.s3_key);
      if (result.download_url) {
        window.open(result.download_url, "_blank");
      }
    } catch {
      toast.error("Download unavailable");
    }
  };

  const filtered = (data ?? []).filter(
    (d) => !filter || d.doc_type === filter
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Documents ({data?.length ?? 0})</h3>
          <p className="text-xs text-gray-400 mt-0.5">PDFs and Word docs linked to this matter</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="text-xs rounded border border-gray-200 px-2 py-1.5">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button size="sm" variant="secondary" loading={uploading}
            onClick={() => fileRef.current?.click()}>
            + Upload
          </Button>
          <input ref={fileRef} type="file" className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleUpload} />
        </div>
      </div>

      {/* Filter bar */}
      {(data?.length ?? 0) > 0 && (
        <div className="flex gap-1.5 mb-3 flex-wrap">
          <button onClick={() => setFilter("")}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filter ? "bg-green-500 text-white border-green-500" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
            All
          </button>
          {DOC_TYPES.map((t) => (
            <button key={t} onClick={() => setFilter(f => f === t ? "" : t)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filter === t ? "bg-green-500 text-white border-green-500" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {isLoading && <PageLoader />}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          <p className="text-3xl mb-2">📁</p>
          <p className="font-medium text-gray-600 mb-1">No documents yet</p>
          <p className="text-xs">Upload pleadings, orders, or annexures to store them with this matter.</p>
          <p className="text-xs mt-1 text-amber-600">
            Requires document-service running on :8230 and S3/LocalStack configured.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((doc) => (
          <div key={doc.id}
            className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                doc.mime_type?.includes("pdf") ? "bg-red-100 text-red-700" :
                doc.mime_type?.includes("word") ? "bg-blue-100 text-blue-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {MIME_MAP[doc.mime_type] ?? "FILE"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.filename}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{doc.doc_type}</span>
                  <span className="text-xs text-gray-400">{bytesToSize(doc.size_bytes)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    doc.ocr_status === "done" ? "bg-green-50 text-green-700" :
                    doc.ocr_status === "pending" ? "bg-yellow-50 text-yellow-700" :
                    "bg-red-50 text-red-700"
                  }`}>
                    OCR: {doc.ocr_status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(doc.created_at), "dd MMM yyyy")}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownload(doc)}
              className="text-xs text-green-600 hover:underline flex-shrink-0 ml-3">
              Download ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
