import { useCallback, useEffect, useState } from "react";
import * as api from "./tags";
import type { Tag } from "./types";

/** Every tag, hidden ones included (pickers filter), plus actions that refresh the list. */
export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);

  const reload = useCallback(async () => {
    try {
      setTags(await api.listTags(true));
    } catch {
      // Tags are optional on a day; the picker just stays empty.
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    tags,
    create: async (name: string) => {
      const tag = await api.createTag(name);
      await reload();
      return tag;
    },
    update: async (id: number, patch: { name?: string; hidden?: boolean }) => {
      const tag = await api.updateTag(id, patch);
      await reload();
      return tag;
    },
  };
}
