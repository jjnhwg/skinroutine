import { useEffect, useState } from "react";
import { ApiError } from "../api/http";
import type { Tag } from "../api/types";
import { useTags } from "../api/useTags";
import { useToast } from "./Toast";

const MAX_NAME = 40;

function TagRow({
  tag,
  onRename,
  onToggleHidden,
}: {
  tag: Tag;
  onRename: (name: string) => Promise<void>;
  onToggleHidden: () => void;
}) {
  const [name, setName] = useState(tag.name);

  useEffect(() => setName(tag.name), [tag.name]);

  async function commit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === tag.name) {
      setName(tag.name);
      return;
    }
    await onRename(trimmed);
  }

  return (
    <li className="tag-row">
      <input
        type="text"
        aria-label={`Rename ${tag.name}`}
        maxLength={MAX_NAME}
        value={name}
        className={tag.hidden ? "muted" : undefined}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
        }}
      />
      {tag.is_default && <span className="chip">default</span>}
      <button
        type="button"
        className="btn small ghost"
        aria-label={`${tag.hidden ? "Show" : "Hide"} ${tag.name}`}
        onClick={onToggleHidden}
      >
        {tag.hidden ? "Show" : "Hide"}
      </button>
    </li>
  );
}

/** Settings section: rename, hide/show and add lifestyle tags. Tags are never deleted. */
export function TagSettings() {
  const { tags, create, update } = useTags();
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>, done: string) {
    setError("");
    try {
      await action();
      toast(done);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Couldn't save — is the server running?");
      return false;
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    if (await run(() => create(name), `Added ${name}`)) setNewName("");
  }

  return (
    <div className="card">
      <h2>Tags</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        One-tap habits for the end of each day. Hidden tags stay on past days but aren't offered.
      </p>
      <ul className="tag-list">
        {tags.map((tag) => (
          <TagRow
            key={tag.id}
            tag={tag}
            onRename={async (name) => {
              await run(() => update(tag.id, { name }), "Tag renamed");
            }}
            onToggleHidden={() =>
              void run(
                () => update(tag.id, { hidden: !tag.hidden }),
                tag.hidden ? `Showing ${tag.name}` : `Hid ${tag.name}`,
              )
            }
          />
        ))}
      </ul>
      <form className="row" style={{ marginTop: 12 }} onSubmit={add}>
        <input
          type="text"
          className="grow"
          aria-label="New tag"
          placeholder="e.g. Swam in a pool"
          maxLength={MAX_NAME}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn">
          Add tag
        </button>
      </form>
      {error && (
        <div className="warn" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
