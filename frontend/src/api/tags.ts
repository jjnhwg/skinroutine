import { apiGet, apiSend } from "./http";
import type { Tag } from "./types";

export function listTags(includeHidden: boolean): Promise<Tag[]> {
  return apiGet<Tag[]>(`/api/tags?include_hidden=${includeHidden}`);
}

export function createTag(name: string): Promise<Tag> {
  return apiSend<Tag>("POST", "/api/tags", { name });
}

export function updateTag(id: number, patch: { name?: string; hidden?: boolean }): Promise<Tag> {
  return apiSend<Tag>("PATCH", `/api/tags/${id}`, patch);
}
