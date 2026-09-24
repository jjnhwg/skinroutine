import { useState } from "react";
import type { SaveRoutineResponse } from "./types";
import "./App.css";

const ROUTINE_PRODUCTS = ["Cleanser", "Moisturizer", "Sunscreen"];

function App() {
  // Tracks which products are checked — keyed by product name
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleCheckboxChange(product: string, isChecked: boolean) {
    setChecked((prev) => ({ ...prev, [product]: isChecked }));
    setMessage(null); // Clear old confirmation when user changes selections
  }

  async function handleSave() {
    const checkedProducts = ROUTINE_PRODUCTS.filter((product) => checked[product]);

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/routine/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: checkedProducts }),
      });

      if (!response.ok) {
        throw new Error("Failed to save routine");
      }

      const data: SaveRoutineResponse = await response.json();
      setMessage(data.message);
    } catch {
      setMessage("Something went wrong. Is the Flask server running?");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="app">
      <h1>Today's Skincare Routine</h1>
      <p className="subtitle">Check off what you used today, then save.</p>

      <ul className="checklist">
        {ROUTINE_PRODUCTS.map((product) => (
          <li key={product}>
            <label>
              <input
                type="checkbox"
                checked={checked[product] ?? false}
                onChange={(e) => handleCheckboxChange(product, e.target.checked)}
              />
              {product}
            </label>
          </li>
        ))}
      </ul>

      <button type="button" onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Today's Routine"}
      </button>

      {message && <p className="confirmation">{message}</p>}
    </div>
  );
}

export default App;
