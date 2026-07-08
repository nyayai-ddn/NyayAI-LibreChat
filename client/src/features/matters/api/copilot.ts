import { api } from "./client";
import type { MatterResearch } from "../types";
import type { PaginatedResponse } from "../types";

export const copilotApi = {
  /** Returns the stream URL — caller uses EventSource / fetch stream */
  researchStreamUrl: (matterId: string, query: string): string => {
    const token = localStorage.getItem("nyayai_token") ?? "";
    const params = new URLSearchParams({ matter_id: matterId, query, token });
    return `/copilot/research/stream?${params}`;
  },

  /** POST to start research — returns SSE stream via fetch */
  research: (matterId: string, query: string, signal?: AbortSignal) =>
    fetch("/copilot/research", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}`,
      },
      body: JSON.stringify({ matter_id: matterId, query }),
      signal,
    }),

  /** Generate chronology for a matter */
  chronology: (matterId: string) =>
    fetch(`/copilot/chronology/${matterId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}` },
    }).then((r) => r.json()),

  /** Generate a research brief for this matter */
  brief: (matterId: string) =>
    fetch(`/copilot/brief/${matterId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}` },
    }).then((r) => r.json()),

  /** Trigger order intelligence for a specific order (dev shortcut) */
  analyseOrder: (matterId: string, firmId: string, orderText: string, orderDate: string) =>
    fetch("/copilot/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": "internal-sync-secret",
      },
      body: JSON.stringify({ matter_id: matterId, firm_id: firmId, order_text: orderText, order_date: orderDate }),
    }).then((r) => r.json()),
};

export const documentsApi = {
  list: (matterId: string) =>
    api.get<{
      id: string; filename: string; doc_type: string; mime_type: string;
      size_bytes: number; ocr_status: string; created_at: string; s3_key: string;
    }[]>(`/api/v1/matters/${matterId}/documents`).then((r) => r.data),

  getUploadUrl: (params: { matter_id: string; filename: string; doc_type: string; mime_type: string }) =>
    fetch("/documents/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}`,
      },
      body: JSON.stringify(params),
    }).then((r) => r.json()),

  confirm: (documentId: string, body: { matter_id: string; filename: string; doc_type: string; mime_type: string; s3_key: string }) =>
    fetch(`/documents/${documentId}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}`,
      },
      body: JSON.stringify(body),
    }).then((r) => r.json()),

  getDownloadUrl: (documentId: string, s3Key: string) =>
    fetch(`/documents/${documentId}/download-url?s3_key=${encodeURIComponent(s3Key)}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("nyayai_token") ?? ""}` },
    }).then((r) => r.json()),
};
