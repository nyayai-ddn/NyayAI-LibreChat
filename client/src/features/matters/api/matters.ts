import { api } from "./client";
import type {
  Matter, MatterListItem, Hearing, Action, Note, Order,
  Party, MatterMember, MatterResearch, TimelineEvent, PaginatedResponse,
} from "../types";

export const mattersApi = {
  list: (params?: { status?: string; court_code?: string; practice_area?: string; search?: string; page?: number }) =>
    api.get<PaginatedResponse<MatterListItem>>("/matters", { params }).then((r) => r.data),

  cnrLookup: (cnr: string, court_code: string) =>
    api.get<{
      cnr: string; title: string; court_code: string;
      filing_date: string | null; next_hearing_date: string | null;
      stage: string | null; source: string;
      parties: { name: string; role: string; counsel: string | null; is_our_client: boolean }[];
      prior_hearing_count: number;
    }>("/matters/cnr-lookup", { params: { cnr, court_code } }).then((r) => r.data),

  get: (id: string) =>
    api.get<Matter>(`/matters/${id}`).then((r) => r.data),

  create: (body: { title: string; cnr_number?: string; court_code?: string; practice_area?: string; stage?: string }) =>
    api.post<Matter>("/matters", body).then((r) => r.data),

  update: (id: string, body: Partial<{ title: string; status: string; stage: string; vakalat_filed: boolean; bnss_flag: boolean }>) =>
    api.patch<Matter>(`/matters/${id}`, body).then((r) => r.data),

  archive: (id: string) =>
    api.delete(`/matters/${id}`),

  hardDelete: (id: string) =>
    api.delete(`/matters/${id}/hard`),

  refresh: (id: string) =>
    api.post<Matter>(`/matters/${id}/refresh`).then((r) => r.data),

  timeline: (id: string, since?: string) =>
    api.get<{ matter_id: string; events: TimelineEvent[]; count: number }>(`/matters/${id}/timeline`, { params: { since } }).then((r) => r.data),

  activity: (id: string, page = 1) =>
    api.get<{ matter_id: string; events: { id: string; action: string; user_id: string; resource_type: string; detail: Record<string, unknown>; timestamp: string }[] }>(`/matters/${id}/activity`, { params: { page } }).then((r) => r.data),

  research: (id: string, page = 1) =>
    api.get<PaginatedResponse<MatterResearch>>(`/matters/${id}/research`, { params: { page } }).then((r) => r.data),

  search: (q: string) =>
    api.get<PaginatedResponse<MatterListItem>>("/matters/search", { params: { q } }).then((r) => r.data),

  citations: (id: string) =>
    api.get<{ matter_id: string; citations: { case_name: string; citation: string; count: number; last_cited: string }[]; total: number }>(`/matters/${id}/citations`).then((r) => r.data),

  // Hearings
  listHearings: (matterId: string) =>
    api.get<Hearing[]>(`/matters/${matterId}/hearings`).then((r) => r.data),

  createHearing: (matterId: string, body: Partial<Hearing>) =>
    api.post<Hearing>(`/matters/${matterId}/hearings`, body).then((r) => r.data),

  updateHearing: (matterId: string, hearingId: string, body: Partial<Hearing>) =>
    api.patch<Hearing>(`/matters/${matterId}/hearings/${hearingId}`, body).then((r) => r.data),

  deleteHearing: (matterId: string, hearingId: string) =>
    api.delete(`/matters/${matterId}/hearings/${hearingId}`),

  // Orders
  listOrders: (matterId: string) =>
    api.get<Order[]>(`/matters/${matterId}/orders`).then((r) => r.data),

  // Actions
  listActions: (matterId: string, status?: string) =>
    api.get<Action[]>(`/matters/${matterId}/actions`, { params: { status } }).then((r) => r.data),

  createAction: (matterId: string, body: Partial<Action>) =>
    api.post<Action>(`/matters/${matterId}/actions`, body).then((r) => r.data),

  updateAction: (matterId: string, actionId: string, body: Partial<Action>) =>
    api.patch<Action>(`/matters/${matterId}/actions/${actionId}`, body).then((r) => r.data),

  deleteAction: (matterId: string, actionId: string) =>
    api.delete(`/matters/${matterId}/actions/${actionId}`),

  myActions: (status = "pending") =>
    api.get<PaginatedResponse<Action>>("/users/me/actions", { params: { status } }).then((r) => r.data),

  // Notes
  listNotes: (matterId: string) =>
    api.get<Note[]>(`/matters/${matterId}/notes`).then((r) => r.data),

  createNote: (matterId: string, body: { content: string; hearing_id?: string; is_client_visible?: boolean }) =>
    api.post<Note>(`/matters/${matterId}/notes`, body).then((r) => r.data),

  updateNote: (matterId: string, noteId: string, body: { content?: string; is_client_visible?: boolean }) =>
    api.patch<Note>(`/matters/${matterId}/notes/${noteId}`, body).then((r) => r.data),

  deleteNote: (matterId: string, noteId: string) =>
    api.delete(`/matters/${matterId}/notes/${noteId}`),

  // Parties
  listParties: (matterId: string) =>
    api.get<Party[]>(`/matters/${matterId}/parties`).then((r) => r.data),

  addParty: (matterId: string, body: Partial<Party>) =>
    api.post<Party>(`/matters/${matterId}/parties`, body).then((r) => r.data),

  updateParty: (matterId: string, partyId: string, body: Partial<Party>) =>
    api.patch<Party>(`/matters/${matterId}/parties/${partyId}`, body).then((r) => r.data),

  removeParty: (matterId: string, partyId: string) =>
    api.delete(`/matters/${matterId}/parties/${partyId}`),

  // Members
  listMembers: (matterId: string) =>
    api.get<MatterMember[]>(`/matters/${matterId}/members`).then((r) => r.data),

  addMember: (matterId: string, userId: string, role = "associate") =>
    api.post<MatterMember>(`/matters/${matterId}/members`, { user_id: userId, matter_role: role }).then((r) => r.data),

  removeMember: (matterId: string, userId: string) =>
    api.delete(`/matters/${matterId}/members/${userId}`),
};
