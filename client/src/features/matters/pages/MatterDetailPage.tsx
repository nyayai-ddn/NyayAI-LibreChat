import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { clsx } from "clsx";
import { mattersApi } from "../api/matters";
import { copilotApi } from "../api/copilot";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { PageLoader } from "../components/ui/Spinner";
import ResearchSection from "../sections/ResearchSection";
import DocumentsSection from "../sections/DocumentsSection";
import ActivityFeedSection from "../sections/ActivityFeedSection";
import type {
  Hearing, Action, Note, Order, Party, ActionStatus, ECourtsMeta, Matter,
} from "../types";

// ── Section IDs ───────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "case-info",    label: "Case Info" },
  { id: "parties",      label: "Parties" },
  { id: "case-history", label: "Case History" },
  { id: "research",     label: "Research" },
  { id: "documents",    label: "Documents" },
  { id: "tasks",        label: "Tasks" },
  { id: "notes",        label: "Notes" },
  { id: "activity",     label: "Activity" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Case Info Card ────────────────────────────────────────────────────────────
function CaseInfoCard({ meta, stage, cnr, court_code }: {
  meta: ECourtsMeta | null; stage: string | null; cnr: string | null; court_code: string | null;
}) {
  const fields = [
    { label: "Judge",           value: meta?.judge_names?.join(", ") },
    { label: "Case type",       value: meta?.case_type },
    { label: "Judicial section",value: meta?.judicial_section },
    { label: "Reg number",      value: meta?.registration_number },
    { label: "Filing number",   value: meta?.filing_number },
    { label: "Case category",   value: meta?.case_category },
    { label: "Stage / Status",  value: stage },
    { label: "Decision date",   value: meta?.decision_date ? format(new Date(meta.decision_date), "dd MMM yyyy") : null },
    { label: "Disposal type",   value: meta?.disposal_type },
  ].filter((f) => f.value);

  if (!fields.length && !meta?.ecourts_url) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Case Information</h3>
        {meta?.ecourts_url && (
          <a href={meta.ecourts_url} target="_blank" rel="noreferrer"
            className="text-xs text-green-600 hover:underline flex items-center gap-1">
            View on eCourts ↗
          </a>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-sm">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-gray-500 text-xs uppercase tracking-wide">{label}</dt>
            <dd className="text-gray-800 font-medium mt-0.5">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── Parties Section ───────────────────────────────────────────────────────────
function PartiesSection({ matterId }: { matterId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "petitioner", counsel: "", is_our_client: false });

  const { data, isLoading } = useQuery({
    queryKey: ["parties", matterId],
    queryFn: () => mattersApi.listParties(matterId),
  });

  const addMutation = useMutation({
    mutationFn: () => mattersApi.addParty(matterId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parties", matterId] }); setShowAdd(false); toast.success("Party added"); },
    onError: () => toast.error("Failed to add party"),
  });

  const removeMutation = useMutation({
    mutationFn: (partyId: string) => mattersApi.removeParty(matterId, partyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties", matterId] }),
  });

  const petitioners = data?.filter((p) => ["petitioner", "appellant", "plaintiff", "complainant", "accused"].includes(p.role)) ?? [];
  const respondents  = data?.filter((p) => ["respondent", "defendant", "other"].includes(p.role)) ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Parties & Advocates</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowAdd((v) => !v)}>+ Add party</Button>
      </div>

      {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="grid grid-cols-2 gap-6">
          {[["Petitioners / Appellants", petitioners], ["Respondents / Defendants", respondents]].map(([title, list]) => (
            <div key={title as string}>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-3">{title as string}</p>
              {(list as Party[]).length === 0 ? (
                <p className="text-sm text-gray-400">None recorded</p>
              ) : (
                <div className="space-y-3">
                  {(list as Party[]).map((p) => (
                    <div key={p.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                        {p.counsel && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                              ⚖️ Adv. {p.counsel}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-1.5 mt-1">
                          {p.is_our_client && <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Our client</span>}
                          {p.source === "ecourts" && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">eCourts</span>}
                        </div>
                      </div>
                      <button onClick={() => removeMutation.mutate(p.id)}
                        className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0 mt-0.5">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="petitioner">Petitioner</option>
              <option value="respondent">Respondent</option>
              <option value="appellant">Appellant</option>
              <option value="defendant">Defendant</option>
              <option value="accused">Accused</option>
              <option value="complainant">Complainant</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input label="Counsel (advocate name)" value={form.counsel}
            onChange={(e) => setForm((f) => ({ ...f, counsel: e.target.value }))} />
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_our_client}
                onChange={(e) => setForm((f) => ({ ...f, is_our_client: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-green-500" />
              Our client
            </label>
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" loading={addMutation.isPending} onClick={() => addMutation.mutate()} disabled={!form.name}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Case History with Orders (merged chronological view) ─────────────────────
function CaseHistorySection({ matterId, firmId, meta }: { matterId: string; firmId: string; meta: ECourtsMeta | null }) {
  const qc = useQueryClient();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedHearingId, setExpandedHearingId] = useState<string | null>(null);
  const [analysingOrderId, setAnalysingOrderId] = useState<string | null>(null);
  const [showAddHearing, setShowAddHearing] = useState(false);
  const [hearingForm, setHearingForm] = useState({ date: "", stage: "", court_code: "" });

  const { data: tasksByMatter } = useQuery({
    queryKey: ["actions", matterId, "pending"],
    queryFn: () => mattersApi.listActions(matterId, "pending"),
  });
  const { data: recentResearch } = useQuery({
    queryKey: ["research", matterId],
    queryFn: () => mattersApi.research(matterId),
  });
  const { data: members } = useQuery({
    queryKey: ["members", matterId],
    queryFn: () => mattersApi.listMembers(matterId),
  });

  const assignHearingMutation = useMutation({
    mutationFn: ({ hearingId, userId }: { hearingId: string; userId: string }) =>
      mattersApi.updateHearing(matterId, hearingId, { assigned_to: userId || null }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hearings", matterId] }),
  });

  const handleAnalyseOrder = async (o: Order) => {
    if (!o.ocr_text) { toast.error("No order text available to analyse."); return; }
    setAnalysingOrderId(o.id);
    try {
      const result = await copilotApi.analyseOrder(matterId, firmId, o.ocr_text, o.order_date ?? "");
      if (result.actions_created !== undefined) {
        toast.success(`AI analysis complete — ${result.actions_created} task${result.actions_created !== 1 ? "s" : ""} created`);
        qc.invalidateQueries({ queryKey: ["actions", matterId] });
        qc.invalidateQueries({ queryKey: ["orders", matterId] });
        qc.invalidateQueries({ queryKey: ["matter", matterId] });
      } else {
        toast.error(result.detail || "Analysis failed. Ensure ANTHROPIC_API_KEY is set and copilot service is running.");
      }
    } catch {
      toast.error("AI Copilot service unavailable. Start it on port 8220.");
    } finally {
      setAnalysingOrderId(null);
    }
  };

  const { data: hearings } = useQuery({ queryKey: ["hearings", matterId], queryFn: () => mattersApi.listHearings(matterId) });
  const { data: orders }   = useQuery({ queryKey: ["orders",   matterId], queryFn: () => mattersApi.listOrders(matterId) });
  const { data: notes }    = useQuery({ queryKey: ["notes",    matterId], queryFn: () => mattersApi.listNotes(matterId) });

  const addHearingMutation = useMutation({
    mutationFn: () => mattersApi.createHearing(matterId, hearingForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hearings", matterId] }); setShowAddHearing(false); toast.success("Hearing added"); },
  });
  const deleteHearingMutation = useMutation({
    mutationFn: (hid: string) => mattersApi.deleteHearing(matterId, hid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hearings", matterId] }),
  });

  // Merge all event types into one chronological list
  type HistoryEvent =
    | { kind: "hearing"; date: string; data: Hearing }
    | { kind: "order";   date: string; data: Order }
    | { kind: "note";    date: string; data: Note }
    | { kind: "milestone"; date: string; label: string; sub?: string; icon: string; color: string };

  const events: HistoryEvent[] = [];

  // Milestones from ecourts_metadata
  if (meta?.decision_date) {
    events.push({ kind: "milestone", date: meta.decision_date,
      label: `${meta.disposal_type || "Disposed"} — Final Status`,
      icon: "⚖️", color: "bg-red-100 text-red-700 border-red-200" });
  }

  // Orders
  orders?.forEach((o) => {
    if (o.order_date) events.push({ kind: "order", date: o.order_date, data: o });
  });

  // Hearings
  hearings?.forEach((h) => {
    events.push({ kind: "hearing", date: h.date, data: h });
  });

  // Notes (show in history)
  notes?.forEach((n) => {
    events.push({ kind: "note", date: n.created_at.slice(0, 10), data: n });
  });

  // Sort chronologically descending (newest first, like eCourtsIndia)
  events.sort((a, b) => b.date.localeCompare(a.date));

  const totalCount = (hearings?.length ?? 0) + (orders?.length ?? 0) + (notes?.length ?? 0) + (meta?.decision_date ? 1 : 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-800">Case History with Orders</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {orders?.length ?? 0} orders · {hearings?.length ?? 0} hearings · {notes?.length ?? 0} notes
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowAddHearing((v) => !v)}>+ Add hearing</Button>
      </div>

      {/* Add hearing form */}
      {showAddHearing && (
        <div className="mb-5 p-3 bg-gray-50 rounded-lg grid grid-cols-3 gap-3">
          <Input label="Date *" type="date" value={hearingForm.date}
            onChange={(e) => setHearingForm((f) => ({ ...f, date: e.target.value }))} />
          <Input label="Stage" value={hearingForm.stage}
            onChange={(e) => setHearingForm((f) => ({ ...f, stage: e.target.value }))} placeholder="For orders" />
          <div className="flex items-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowAddHearing(false)}>Cancel</Button>
            <Button size="sm" loading={addHearingMutation.isPending}
              onClick={() => addHearingMutation.mutate()} disabled={!hearingForm.date}>Add</Button>
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          <p className="text-3xl mb-2">📋</p>
          <p>No case history yet. Create or refresh from eCourts to import orders and hearings.</p>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {events.map((ev, i) => {
          const isLast = i === events.length - 1;

          if (ev.kind === "milestone") {
            return (
              <div key={`milestone-${ev.date}`} className="flex gap-4 mb-1">
                <div className="flex flex-col items-center w-10 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border ${ev.color}`}>
                    {ev.icon}
                  </div>
                  {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-5 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wide bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">
                    Final Status
                  </span>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{ev.label}</p>
                  <p className="text-xs text-gray-400">{format(new Date(ev.date), "dd MMM yyyy")}</p>
                </div>
              </div>
            );
          }

          if (ev.kind === "order") {
            const o = ev.data as Order;
            const expanded = expandedOrderId === o.id;
            return (
              <div key={`order-${o.id}`} className="flex gap-4 mb-1">
                <div className="flex flex-col items-center w-10 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-green-100 border border-green-200 text-green-700 flex items-center justify-center text-sm font-bold">
                    📄
                  </div>
                  {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-5">
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedOrderId(expanded ? null : o.id)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 text-left">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800 text-sm">
                            {format(new Date(o.order_date!), "dd MMM yyyy")}
                          </span>
                          <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded">
                            {o.order_type || "Order"}
                          </span>
                          {o.bnss_flag && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">⚠️ BNS/BNSS</span>
                          )}
                        </div>
                        {o.ai_summary && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{o.ai_summary}</p>
                        )}
                      </div>
                      <span className="text-gray-400 ml-2 flex-shrink-0">{expanded ? "▲" : "▼"}</span>
                    </button>
                    {expanded && (
                      <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                        {o.ocr_text ? (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order Text</p>
                              <Button size="sm" variant="secondary"
                                loading={analysingOrderId === o.id}
                                onClick={() => handleAnalyseOrder(o)}>
                                🤖 Analyse with AI
                              </Button>
                            </div>
                            <div className="max-h-80 overflow-y-auto text-xs leading-relaxed text-gray-700 bg-white border border-gray-200 rounded p-3 whitespace-pre-wrap">
                              {o.ocr_text.replace(/\$[^$]*\$/g, "").replace(/\\[a-z{()[\]]+/g, "").replace(/\n{3,}/g, "\n\n").trim()}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400 text-center py-2">
                            Order text not available. Refresh from eCourts to pull order content.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          if (ev.kind === "hearing") {
            const h = ev.data as Hearing;
            const isFuture = h.date >= new Date().toISOString().slice(0, 10);
            const briefOpen = expandedHearingId === h.id;
            return (
              <div key={`hearing-${h.id}`} className="flex gap-4 mb-1">
                <div className="flex flex-col items-center w-10 flex-shrink-0">
                  <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-sm ${
                    isFuture ? "bg-blue-500 border-blue-600 text-white" : "bg-blue-100 border-blue-200 text-blue-700"
                  }`}>
                    🏛️
                  </div>
                  {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-5">
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="p-3.5 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${isFuture ? "text-green-700" : "text-gray-800"}`}>
                            {format(new Date(h.date), "dd MMM yyyy")}
                          </span>
                          <Badge label={h.status} />
                          {h.source === "ecourts" && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">eCourts</span>
                          )}
                          {isFuture && (
                            <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-medium">Upcoming</span>
                          )}
                        </div>
                        {h.stage && <p className="text-sm text-gray-600 mt-0.5">{h.stage}</p>}
                        {h.post_hearing_note && (
                          <p className="text-xs text-gray-500 mt-1 bg-yellow-50 rounded px-2 py-1">{h.post_hearing_note}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Assign to team member */}
                        <select
                          value={h.assigned_to ?? ""}
                          onChange={(e) => assignHearingMutation.mutate({ hearingId: h.id, userId: e.target.value })}
                          className="text-xs border border-gray-200 rounded px-1.5 py-1 max-w-[130px]"
                          title="Assign to advocate">
                          <option value="">Unassigned</option>
                          {(members ?? []).map((m) => (
                            <option key={m.user_id} value={m.user_id}>{m.name || m.user_id.slice(0, 8)}</option>
                          ))}
                        </select>
                        {isFuture && (
                          <button onClick={() => setExpandedHearingId(briefOpen ? null : h.id)}
                            className={`text-xs px-2 py-1 rounded border transition-colors ${
                              briefOpen ? "bg-green-500 text-white border-green-500" : "border-green-200 text-green-600 hover:bg-green-50"
                            }`}>
                            📋 Brief
                          </button>
                        )}
                        <button onClick={() => deleteHearingMutation.mutate(h.id)}
                          className="text-gray-300 hover:text-red-400 text-xs">Remove</button>
                      </div>
                    </div>

                    {/* Pre-hearing brief panel */}
                    {briefOpen && (
                      <div className="border-t border-gray-100 p-4 bg-gradient-to-b from-green-50 to-white space-y-4">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Pre-Hearing Brief — {format(new Date(h.date), "dd MMM yyyy")}</p>

                        {/* Last order summary */}
                        {orders?.find((o) => o.order_date) && (
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-xs font-medium text-gray-500 mb-1">📄 Last Court Order</p>
                            {(() => {
                              const latestOrder = orders?.sort((a, b) => (b.order_date ?? "").localeCompare(a.order_date ?? ""))[0];
                              return latestOrder ? (
                                <p className="text-sm text-gray-700">{latestOrder.ai_summary || latestOrder.ocr_text?.slice(0, 300) || "No summary"}</p>
                              ) : null;
                            })()}
                          </div>
                        )}

                        {/* Outstanding tasks */}
                        <div className="bg-white rounded-lg border border-gray-200 p-3">
                          <p className="text-xs font-medium text-gray-500 mb-1.5">✅ Outstanding Tasks</p>
                          {(tasksByMatter?.length ?? 0) === 0 ? (
                            <p className="text-sm text-gray-400">No pending tasks.</p>
                          ) : (
                            <div className="space-y-1">
                              {tasksByMatter?.slice(0, 5).map((t) => (
                                <div key={t.id} className="flex items-center gap-2 text-sm">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.priority === "urgent" ? "bg-red-500" : t.priority === "high" ? "bg-orange-400" : "bg-gray-300"}`} />
                                  <span className="text-gray-700">{t.title}</span>
                                  {t.due_date && (
                                    <span className={`text-xs ml-auto flex-shrink-0 ${new Date(t.due_date) < new Date() ? "text-red-500" : "text-gray-400"}`}>
                                      {format(new Date(t.due_date), "dd MMM")}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Recent research */}
                        {(recentResearch?.total ?? 0) > 0 && (
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <p className="text-xs font-medium text-gray-500 mb-1.5">🔍 Recent Research</p>
                            <div className="space-y-1">
                              {recentResearch?.items.slice(0, 3).map((r) => (
                                <p key={r.id} className="text-xs text-gray-600 truncate">• {r.query}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          if (ev.kind === "note") {
            const n = ev.data as Note;
            return (
              <div key={`note-${n.id}`} className="flex gap-4 mb-1">
                <div className="flex flex-col items-center w-10 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-yellow-100 border border-yellow-200 text-yellow-700 flex items-center justify-center text-sm">
                    📝
                  </div>
                  {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-1" />}
                </div>
                <div className="flex-1 pb-5">
                  <div className="border border-gray-100 rounded-xl p-3.5">
                    <p className="text-sm text-gray-700">{n.content.slice(0, 200)}</p>
                    <p className="text-xs text-gray-400 mt-1">{format(new Date(n.created_at), "dd MMM yyyy")}</p>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

// ── Tasks Section ─────────────────────────────────────────────────────────────
function TasksSection({ matterId }: { matterId: string }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "">("");
  const [form, setForm] = useState({ title: "", due_date: "", priority: "normal" });

  const { data } = useQuery({
    queryKey: ["actions", matterId, statusFilter],
    queryFn: () => mattersApi.listActions(matterId, statusFilter || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () => mattersApi.createAction(matterId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["actions", matterId] }); setShowAdd(false); toast.success("Task created"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ActionStatus }) =>
      mattersApi.updateAction(matterId, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["actions", matterId] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">Tasks ({data?.length ?? 0})</h3>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ActionStatus | "")}
            className="text-xs rounded border border-gray-200 px-2 py-1">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowAdd((v) => !v)}>+ Add task</Button>
      </div>

      {showAdd && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg grid grid-cols-3 gap-3">
          <div className="col-span-3"><Input label="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <Input label="Due date" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-gray-700">Priority</label>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" loading={createMutation.isPending} onClick={() => createMutation.mutate()} disabled={!form.title}>Add</Button>
          </div>
        </div>
      )}

      {!data?.length && <p className="text-sm text-gray-400">No tasks.</p>}
      <div className="space-y-2">
        {data?.map((a: Action) => (
          <div key={a.id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-lg">
            <input type="checkbox" checked={a.status === "done"}
              onChange={(e) => updateMutation.mutate({ id: a.id, status: e.target.checked ? "done" : "pending" })}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-500 cursor-pointer" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${a.status === "done" ? "line-through text-gray-400" : "text-gray-800"}`}>{a.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge label={a.priority} />
                <Badge label={a.status} />
                {a.due_date && (
                  <span className={`text-xs ${new Date(a.due_date) < new Date() && a.status !== "done" ? "text-red-600 font-medium" : "text-gray-400"}`}>
                    Due {format(new Date(a.due_date), "dd MMM")}
                  </span>
                )}
                {a.source_order_id && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded">AI extracted</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Notes Section ─────────────────────────────────────────────────────────────
function NotesSection({ matterId }: { matterId: string }) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  const { data } = useQuery({ queryKey: ["notes", matterId], queryFn: () => mattersApi.listNotes(matterId) });

  const createMutation = useMutation({
    mutationFn: () => mattersApi.createNote(matterId, { content, is_client_visible: isVisible }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes", matterId] }); qc.invalidateQueries({ queryKey: ["timeline", matterId] }); setContent(""); toast.success("Note saved"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => mattersApi.deleteNote(matterId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes", matterId] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Notes ({data?.length ?? 0})</h3>
      <div className="mb-4">
        <textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note about this matter…" rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none" />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-green-500" />
            Client visible
          </label>
          <Button size="sm" disabled={!content.trim()} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Save note
          </Button>
        </div>
      </div>

      {!data?.length && <p className="text-sm text-gray-400">No notes yet.</p>}
      <div className="space-y-3">
        {data?.map((n: Note) => (
          <div key={n.id} className="p-3 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.content}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{format(new Date(n.created_at), "dd MMM yyyy, HH:mm")}</span>
                {n.is_client_visible && <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Client visible</span>}
              </div>
              <button onClick={() => deleteMutation.mutate(n.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Filed Documents ───────────────────────────────────────────────────────────
function FiledDocsSection({ meta }: { meta: ECourtsMeta | null }) {
  if (!meta?.filed_documents?.length) return null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4">Filed Documents ({meta.filed_documents.length})</h3>
      <div className="space-y-2">
        {meta.filed_documents.map((d, i) => (
          <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg text-sm">
            <div>
              <p className="font-medium text-gray-800">{d.document}</p>
              {d.advocate && <p className="text-xs text-gray-500">Adv. {d.advocate}</p>}
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>Doc #{d.sr_no}</p>
              {d.date && <p>{d.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MatterDetailPage() {
  const { matterId } = useParams<{ matterId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("case-info");

  const { data: matter, isLoading } = useQuery({
    queryKey: ["matter", matterId],
    queryFn: () => mattersApi.get(matterId!),
    enabled: !!matterId,
  });

  const refreshMutation = useMutation({
    mutationFn: () => mattersApi.refresh(matterId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matter", matterId] });
      qc.invalidateQueries({ queryKey: ["parties", matterId] });
      qc.invalidateQueries({ queryKey: ["hearings", matterId] });
      qc.invalidateQueries({ queryKey: ["orders", matterId] });
      qc.invalidateQueries({ queryKey: ["timeline", matterId] });
      toast.success("Refreshed from eCourts");
    },
    onError: () => toast.error("eCourts refresh failed"),
  });

  // Intersection observer to highlight active tab as user scrolls
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-20% 0px -70% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [matter]);

  if (isLoading) return <PageLoader />;
  if (!matter) return <div className="p-6 text-gray-500">Matter not found.</div>;

  const meta = matter.ecourts_metadata as unknown as ECourtsMeta | null;
  const cnrClean = matter.cnr_number?.replace(/-/g, "");

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky header + tab bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-6 pt-4 pb-0">
          {/* Back + refresh */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate("/matters")} className="text-sm text-green-600 hover:underline flex items-center gap-1">
              ← All matters
            </button>
            <div className="flex items-center gap-2">
              {matter.cnr_number && (
                <Button size="sm" variant="secondary" loading={refreshMutation.isPending}
                  onClick={() => refreshMutation.mutate()}>
                  ↻ Refresh from eCourts
                </Button>
              )}
            </div>
          </div>

          {/* Title + badges */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{matter.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge label={matter.status} />
                <Badge label={matter.practice_area} />
                {matter.court_code && (
                  <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 uppercase">
                    {matter.court_code}
                  </span>
                )}
                {matter.cnr_number && (
                  <span className="text-xs font-mono text-gray-500">{matter.cnr_number}</span>
                )}
                <Badge label={matter.ecourts_sync_status} />
                {matter.bnss_flag && <span className="text-xs font-medium bg-orange-100 text-orange-700 px-2 py-0.5 rounded">⚠️ BNS/BNSS</span>}
              </div>
            </div>

            {/* Next hearing / decision date */}
            <div className="text-right flex-shrink-0">
              {matter.next_hearing_date ? (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Next hearing</p>
                  <p className="text-lg font-semibold text-gray-800">{format(new Date(matter.next_hearing_date), "dd MMM yyyy")}</p>
                  {matter.cause_list_position && <p className="text-xs text-gray-500">{matter.cause_list_position}</p>}
                </div>
              ) : meta?.decision_date ? (
                <div>
                  <p className="text-xs text-red-500 uppercase tracking-wide">Disposed</p>
                  <p className="text-base font-semibold text-red-600">{format(new Date(meta.decision_date), "dd MMM yyyy")}</p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Last order summary pill */}
          {matter.last_order_summary && (
            <div className="mt-2 text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <span className="font-medium text-blue-700">Last order: </span>
              {matter.last_order_summary}
            </div>
          )}

          {/* Anchor tab bar */}
          <div className="flex gap-0 mt-3 -mb-px overflow-x-auto">
            {SECTIONS.map(({ id, label }) => (
              <button key={id} onClick={() => scrollTo(id)}
                className={clsx(
                  "px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0",
                  activeSection === id
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">

          <div id="case-info" className="scroll-mt-40">
            <CaseInfoCard meta={meta} stage={matter.stage} cnr={matter.cnr_number} court_code={matter.court_code} />
            {!meta && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center text-gray-400 text-sm">
                <p>No detailed case info. {matter.cnr_number ? "Click ↻ Refresh from eCourts to pull full case data." : "Add a CNR number to enable eCourts sync."}</p>
              </div>
            )}
          </div>

          <div id="parties" className="scroll-mt-40">
            <PartiesSection matterId={matterId!} />
          </div>

          <div id="case-history" className="scroll-mt-40">
            <CaseHistorySection matterId={matterId!} firmId={matter.firm_id} meta={meta} />
          </div>

          <div id="research" className="scroll-mt-40">
            <ResearchSection matter={matter as Matter} />
          </div>

          <div id="documents" className="scroll-mt-40">
            <DocumentsSection matterId={matterId!} firmId={matter.firm_id} />
          </div>

          <div id="tasks" className="scroll-mt-40">
            <TasksSection matterId={matterId!} />
          </div>

          <div id="notes" className="scroll-mt-40">
            <NotesSection matterId={matterId!} />
          </div>

          {/* Filed documents (only if eCourts data present) */}
          {meta?.filed_documents?.length ? (
            <div className="scroll-mt-40">
              <FiledDocsSection meta={meta} />
            </div>
          ) : null}

          <div id="activity" className="scroll-mt-40">
            <ActivityFeedSection matterId={matterId!} />
          </div>

        </div>
      </div>
    </div>
  );
}
