import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { mattersApi } from "../api/matters";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { PageLoader } from "../components/ui/Spinner";
import type { PracticeArea, MatterStatus } from "../types";
import { format } from "date-fns";

const PRACTICE_AREAS: PracticeArea[] = ["criminal", "civil", "writ", "commercial", "family", "arbitration", "other"];

// ── CNR Fetch Preview type ────────────────────────────────────────────────────
type ECourtPreview = {
  title: string; stage: string | null; filing_date: string | null;
  next_hearing_date: string | null; prior_hearing_count: number;
  order_count: number; judge_names: string[]; case_type: string | null;
  judicial_section: string | null; registration_number: string | null;
  decision_date: string | null; case_category: string | null;
  ecourts_url: string | null;
  parties: { name: string; role: string }[];
  source: string;
};

// ── Create Matter Modal ───────────────────────────────────────────────────────
function CreateMatterModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", cnr_number: "", court_code: "", practice_area: "civil" as PracticeArea });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [preview, setPreview] = useState<ECourtPreview | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleCnrLookup = async () => {
    if (!form.cnr_number || !form.court_code) {
      toast.error("Enter a CNR number and select the court first.");
      return;
    }
    setLookupLoading(true); setLookupError(null); setPreview(null);
    try {
      const data = await mattersApi.cnrLookup(form.cnr_number, form.court_code) as unknown as ECourtPreview;
      setPreview(data);
      if (!form.title) setForm((f) => ({ ...f, title: data.title }));
      toast.success(data.source === "ecourts_stub" ? "Dev stub data loaded" : "eCourts data fetched");
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { detail?: string } } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setLookupError(
        status === 404 ? (detail || "CNR not found — fill in details manually.") :
        status === 422 ? (detail || "Invalid CNR format.") :
        "eCourts unavailable — create the matter manually."
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: () => mattersApi.create(form),
    onSuccess: (matter) => {
      qc.invalidateQueries({ queryKey: ["matters"] });
      toast.success("Matter created");
      onClose();
      navigate(`/matters/${matter.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      if (typeof msg === "string" && msg.includes("limit")) toast.error(msg);
      else toast.error("Failed to create matter");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">New Matter</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Court *</label>
              <select value={form.court_code}
                onChange={(e) => { setForm((f) => ({ ...f, court_code: e.target.value })); setPreview(null); }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
                <option value="">— select —</option>
                <option value="sc">Supreme Court</option>
                <option value="dlhc">Delhi HC</option>
                <option value="ukhc">Uttarakhand HC</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">CNR number</label>
              <div className="flex gap-1 mt-1">
                <input value={form.cnr_number}
                  onChange={(e) => { setForm((f) => ({ ...f, cnr_number: e.target.value })); setPreview(null); setLookupError(null); }}
                  placeholder="DLHC01-051766-2005"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                <Button size="sm" variant="secondary" loading={lookupLoading} onClick={handleCnrLookup} type="button" className="flex-shrink-0">
                  Fetch
                </Button>
              </div>
            </div>
          </div>

          {preview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-medium">eCourts data fetched</span>
                {preview.source === "ecourts_stub" && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">stub</span>}
                {preview.ecourts_url && (
                  <a href={preview.ecourts_url} target="_blank" rel="noreferrer"
                    className="ml-auto text-xs text-blue-600 hover:underline">View on eCourts ↗</a>
                )}
              </div>
              <p className="font-medium text-gray-800">{preview.title}</p>
              <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-600">
                {preview.case_type && <span>Type: {preview.case_type}</span>}
                {preview.stage && <span>Status: {preview.stage}</span>}
                {preview.judge_names[0] && <span>Judge: {preview.judge_names[0]}</span>}
                {preview.judicial_section && <span>Section: {preview.judicial_section}</span>}
                {preview.registration_number && <span>Reg: {preview.registration_number}</span>}
                {preview.decision_date && <span className="text-red-600">Disposed: {preview.decision_date}</span>}
              </div>
              <p className="text-xs text-gray-500">
                {preview.parties.length} parties · {preview.prior_hearing_count} hearings · {preview.order_count} orders will be imported
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {preview.parties.map((p, i) => (
                  <span key={i} className="bg-white border border-blue-200 rounded px-1.5 py-0.5 text-xs text-gray-600">
                    {p.name} ({p.role})
                  </span>
                ))}
              </div>
            </div>
          )}

          {lookupError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">{lookupError}</div>
          )}

          <Input label="Case title *" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="State v. Accused — Bail Application" required />

          <div>
            <label className="text-sm font-medium text-gray-700">Practice area</label>
            <select value={form.practice_area}
              onChange={(e) => setForm((f) => ({ ...f, practice_area: e.target.value as PracticeArea }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
              {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()} disabled={!form.title}>
            Create matter
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MatterListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MatterStatus | "">("");
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSearching = search.trim().length >= 2;
  const { data, isLoading } = useQuery({
    queryKey: ["matters", search, statusFilter, page],
    queryFn: () =>
      isSearching
        ? mattersApi.search(search.trim())
        : mattersApi.list({ status: statusFilter || undefined, page }),
  });

  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((m) => selected.has(m.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((m) => m.id)));
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => mattersApi.hardDelete(id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matters"] });
      setSelected(new Set());
      toast.success("Deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const refreshMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => mattersApi.refresh(id)));
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      toast.success(`Refreshed ${ok} matter${ok !== 1 ? "s" : ""}${fail ? ` (${fail} failed)` : ""}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matters"] });
      setSelected(new Set());
    },
  });

  const handleDelete = () => {
    if (!window.confirm(`Permanently delete ${selected.size} matter(s) and all their data? This cannot be undone.`)) return;
    deleteMutation.mutate(Array.from(selected));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matters</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? 0} cases</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>+ New matter</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative max-w-xs">
          <Input placeholder="Search title, CNR…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {isSearching && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-green-500 font-medium pointer-events-none">
              FTS
            </span>
          )}
        </div>
        <select value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as MatterStatus | ""); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="dormant">Dormant</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-green-700">{selected.size} selected</span>
          <Button size="sm" variant="secondary" onClick={() => setSelected(new Set())}>Deselect all</Button>
          <Button size="sm" variant="secondary"
            loading={refreshMutation.isPending}
            onClick={() => refreshMutation.mutate(Array.from(selected))}>
            ↻ Refresh from eCourts
          </Button>
          <Button size="sm" variant="danger" loading={deleteMutation.isPending} onClick={handleDelete}>
            Delete permanently
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? <PageLoader /> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="pl-4 py-3 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 text-green-500 focus:ring-green-500" />
                </th>
                {["Case", "Court / CNR", "Practice area", "Status", "Next hearing", "Sync"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No matters found. Create your first matter to get started.
                  </td>
                </tr>
              )}
              {items.map((m) => (
                <tr key={m.id}
                  className={`transition-colors ${selected.has(m.id) ? "bg-green-50" : "hover:bg-gray-50"}`}>
                  <td className="pl-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)}
                      className="h-4 w-4 rounded border-gray-300 text-green-500 focus:ring-green-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/matters/${m.id}`)}>
                    <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 cursor-pointer" onClick={() => navigate(`/matters/${m.id}`)}>
                    <div>{m.court_code?.toUpperCase() ?? "—"}</div>
                    {m.cnr_number && <div className="text-xs text-gray-400 font-mono">{m.cnr_number}</div>}
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/matters/${m.id}`)}>
                    <Badge label={m.practice_area} />
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/matters/${m.id}`)}>
                    <Badge label={m.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 cursor-pointer" onClick={() => navigate(`/matters/${m.id}`)}>
                    {m.next_hearing_date ? (
                      <span className={m.next_hearing_date <= new Date().toISOString().slice(0, 10) ? "text-red-600 font-medium" : ""}>
                        {format(new Date(m.next_hearing_date), "dd MMM yyyy")}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => navigate(`/matters/${m.id}`)}>
                    <Badge label={m.ecourts_sync_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data && data.total > data.page_size && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
              <span>Page {data.page} of {Math.ceil(data.total / data.page_size)}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={!data.has_next} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateMatterModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
