import type { Tag } from "../api/types";

interface TagPickerProps {
  tags: Tag[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

/** One-tap lifestyle tags. A hidden tag shows only on days that already have it. */
export function TagPicker({ tags, selected, onChange }: TagPickerProps) {
  const shown = tags.filter((t) => !t.hidden || selected.includes(t.id));
  if (shown.length === 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        No tags yet — add some in <a href="#/settings">Settings</a>.
      </p>
    );
  }
  return (
    <div className="chips" style={{ gap: 8 }}>
      {shown.map((tag) => {
        const on = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={tag.hidden ? "toggle muted-chip" : "toggle"}
            aria-pressed={on}
            title={tag.hidden ? "Hidden tag — kept because this day has it" : undefined}
            onClick={() => onChange(on ? selected.filter((id) => id !== tag.id) : [...selected, tag.id])}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
