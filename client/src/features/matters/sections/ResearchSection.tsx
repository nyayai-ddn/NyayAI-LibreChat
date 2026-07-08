import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { clsx } from "clsx";
import { mattersApi } from "../api/matters";
import { copilotApi } from "../api/copilot";
import Button from "../components/ui/Button";
import { PageLoader } from "../components/ui/Spinner";
import type { Matter, MatterResearch } from "../types";

interface Props { matter: Matter }

// ── Chat message ──────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  citations?: { case_name: string; citation: string }[];
}

// ── Extract citations from markdown response ──────────────────────────────────
function extractCitations(text: string) {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const results: { case_name: string; citation: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ case_name: m[1], citation: m[2] });
  }
  return results;
}

// ── Format markdown-ish response ─────────────────────────────────────────────
function ResponseText({ text }: { text: string }) {
  // Convert citation links to highlighted spans and basic markdown
  const formatted = text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-medium border border-indigo-100">⚖️ $1</span>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, '<br />');
  return (
    <div
      className="text-sm text-gray-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: `<p>${formatted}</p>` }}
    />
  );
}

// ── Research history item ─────────────────────────────────────────────────────
function HistoryItem({ item, onReplay }: { item: MatterResearch; onReplay: (q: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between p-3.5 hover:bg-gray-50 text-left gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{item.query}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span>{format(new Date(item.created_at), "dd MMM yyyy, HH:mm")}</span>
            {item.skill_used && <span className="bg-gray-100 px-1.5 py-0.5 rounded">{item.skill_used}</span>}
            {item.citations && (item.citations as unknown[]).length > 0 && (
              <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                {(item.citations as unknown[]).length} citations
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onReplay(item.query); }}
            className="text-xs text-green-600 hover:underline">
            Re-run ↺
          </button>
          <span className="text-gray-400 text-sm">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && item.response_summary && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <ResponseText text={item.response_summary} />
          {item.citations && (item.citations as { case_name: string; citation: string }[]).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Cases cited</p>
              <div className="flex flex-wrap gap-1.5">
                {(item.citations as { case_name: string; citation: string }[]).map((c, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-lg">
                    ⚖️ {c.case_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ResearchSection({ matter }: Props) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [chronology, setChronology] = useState<string | null>(null);
  const [chronologyLoading, setChronologyLoading] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "history" | "citations">("chat");
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["research", matter.id],
    queryFn: () => mattersApi.research(matter.id),
  });

  const { data: citationsData } = useQuery({
    queryKey: ["citations", matter.id],
    queryFn: () => mattersApi.citations(matter.id),
    enabled: activeTab === "citations",
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const meta = matter.ecourts_metadata as Record<string, unknown> | null;

  const handleSubmit = async (q = query) => {
    if (!q.trim() || streaming) return;
    const userMsg: Message = { role: "user", content: q };
    setMessages((m) => [...m, userMsg]);
    setQuery("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages((m) => [...m, assistantMsg]);

    abortRef.current = new AbortController();
    let fullText = "";

    try {
      const resp = await copilotApi.research(matter.id, q, abortRef.current.signal);
      if (!resp.ok || !resp.body) {
        setMessages((m) => [
          ...m.slice(0, -1),
          { role: "assistant", content: `Error: ${resp.status} — is the AI Copilot service running on port 8220?` },
        ]);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // SSE lines: "data: <text>\n\n"
        chunk.split("\n").forEach((line) => {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            fullText += line.slice(6);
            setMessages((m) => [
              ...m.slice(0, -1),
              { role: "assistant", content: fullText, streaming: true },
            ]);
          }
        });
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        fullText = "Research service unavailable. Make sure the AI Copilot service is running:\n```\ncd ai-copilot-service\nuvicorn app.main:app --port 8220 --reload\n```";
      }
    } finally {
      const citations = extractCitations(fullText);
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "assistant", content: fullText, streaming: false, citations },
      ]);
      setStreaming(false);
      refetchHistory();
    }
  };

  const handleChronology = async () => {
    setChronologyLoading(true);
    try {
      const result = await copilotApi.chronology(matter.id);
      setChronology(result.chronology || "Could not generate chronology.");
    } catch {
      setChronology("Chronology service unavailable.");
    } finally {
      setChronologyLoading(false);
    }
  };

  const handleBrief = async () => {
    setBriefLoading(true);
    try {
      const result = await copilotApi.brief(matter.id);
      setBrief(result.brief || "Could not generate brief.");
    } catch {
      setBrief("Brief generation unavailable.");
    } finally {
      setBriefLoading(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">AI Legal Research</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBrief}
              disabled={briefLoading}
              className="text-xs text-green-600 hover:underline flex items-center gap-1 disabled:opacity-50">
              {briefLoading ? "Generating…" : "📄 Research brief"}
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={handleChronology}
              disabled={chronologyLoading}
              className="text-xs text-green-600 hover:underline flex items-center gap-1 disabled:opacity-50">
              {chronologyLoading ? "Generating…" : "📋 Chronology"}
            </button>
          </div>
        </div>

        {/* Matter context pill */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-lg">
            🏛️ {matter.court_code?.toUpperCase() || "Court not set"}
          </span>
          {matter.practice_area && (
            <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-lg">
              {matter.practice_area}
            </span>
          )}
          {matter.stage && (
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
              Stage: {matter.stage}
            </span>
          )}
          {matter.bnss_flag && (
            <span className="bg-orange-100 text-orange-700 border border-orange-200 px-2 py-1 rounded-lg font-medium">
              ⚠️ BNSS 2023 applies
            </span>
          )}
          {matter.last_order_summary && (
            <span className="bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-lg max-w-xs truncate">
              Last order: {matter.last_order_summary.slice(0, 60)}…
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-4 mt-3">
          {([
            { id: "chat",      label: "💬 Chat" },
            { id: "history",   label: `📚 History (${history?.total ?? 0})` },
            { id: "citations", label: `⚖️ Citations (${citationsData?.total ?? 0})` },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
              className={clsx("text-sm font-medium pb-1 border-b-2 transition-colors",
                activeTab === id ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat tab */}
      {activeTab === "chat" && (
        <>
          {/* Messages */}
          <div className="p-4 space-y-4 min-h-48 max-h-[28rem] overflow-y-auto bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <p className="text-3xl mb-2">⚖️</p>
                <p className="font-medium text-gray-600 mb-1">Ask anything about this matter</p>
                <p className="text-xs">Responses are grounded in Indian case law and specific to this court and stage.</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    "What are the grounds for interim injunction?",
                    "What is the procedure for filing a rejoinder?",
                    "Summarise the legal position on this issue",
                  ].map((s) => (
                    <button key={s} onClick={() => handleSubmit(s)}
                      className="text-xs bg-white border border-gray-200 hover:border-green-300 hover:text-green-600 rounded-lg px-3 py-1.5 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={clsx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={clsx(
                  "max-w-[85%] rounded-xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-green-500 text-white text-sm"
                    : "bg-white border border-gray-200 shadow-sm"
                )}>
                  {msg.role === "user" ? (
                    <p className="text-sm">{msg.content}</p>
                  ) : (
                    <>
                      <ResponseText text={msg.content} />
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 bg-green-500 animate-pulse ml-1 rounded" />
                      )}
                      {!msg.streaming && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex flex-wrap gap-1">
                            {msg.citations.map((c, j) => (
                              <span key={j} className="text-xs bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                ⚖️ {c.case_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Ask a legal question about this matter… (Enter to send, Shift+Enter for newline)"
                rows={2}
                disabled={streaming}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none disabled:opacity-50"
              />
              {streaming ? (
                <Button variant="danger" size="sm" onClick={handleStop} className="flex-shrink-0 self-end">
                  Stop
                </Button>
              ) : (
                <Button size="sm" onClick={() => handleSubmit()} disabled={!query.trim()} className="flex-shrink-0 self-end">
                  Ask →
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="p-4 space-y-2 max-h-[32rem] overflow-y-auto">
          {!history?.items.length && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>No research history yet. Ask a question in the Chat tab.</p>
            </div>
          )}
          {history?.items.map((item) => (
            <HistoryItem key={item.id} item={item} onReplay={(q) => { setActiveTab("chat"); handleSubmit(q); }} />
          ))}
        </div>
      )}

      {/* Citations tab */}
      {activeTab === "citations" && (
        <div className="p-4 max-h-[32rem] overflow-y-auto">
          {!citationsData?.citations.length && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>No citations yet. Run research queries to build your citation index.</p>
            </div>
          )}
          {citationsData?.citations && citationsData.citations.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Case Name</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Citation</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 uppercase tracking-wide w-16">Times</th>
                </tr>
              </thead>
              <tbody>
                {citationsData.citations.map((c, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-2 font-medium text-gray-800">{c.case_name}</td>
                    <td className="py-2.5 px-2 text-gray-500 text-xs font-mono">{c.citation}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {c.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Research brief modal */}
      {brief && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Research Brief</h3>
              <button onClick={() => setBrief(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed bg-gray-50 rounded-lg p-4">
                {brief}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(brief)}>Copy</Button>
              <Button size="sm" onClick={() => setBrief(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Chronology modal */}
      {chronology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Matter Chronology</h3>
              <button onClick={() => setChronology(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono text-xs leading-relaxed bg-gray-50 rounded-lg p-4">
                {chronology}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => {
                navigator.clipboard.writeText(chronology);
              }}>Copy</Button>
              <Button size="sm" onClick={() => setChronology(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
