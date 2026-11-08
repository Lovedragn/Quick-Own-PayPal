"use client";

import { useState } from "react";
import { Brain, Plus, Trash2, X } from "lucide-react";

export default function MemoryManagerDrawer({
  isOpen,
  onClose,
  memories = [],
  onAddMemory,
  onToggleMemory,
  onDeleteMemory,
  onClearMemories,
}) {
  const [draft, setDraft] = useState("");

  if (!isOpen) return null;

  function handleSubmit(event) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onAddMemory(value);
    setDraft("");
  }

  function clearMemories() {
    if (window.confirm("Forget all saved shopping preferences? This cannot be undone.")) {
      onClearMemories();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[135] bg-black/50 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopping-memory-title"
        className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-700" />
            <div>
              <h2 id="shopping-memory-title" className="font-cal font-bold text-lg text-slate-900">Shopping memory</h2>
              <p className="text-xs text-slate-500">Preferences to reuse in future searches</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close shopping memory" className="w-9 h-9 grid place-items-center rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 border-b border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="new-shopping-memory" className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Add a preference
            </label>
            <textarea
              id="new-shopping-memory"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={240}
              rows={3}
              placeholder="Example: Prefer Sony headphones and keep the budget under ₹12,000."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">{draft.length}/240 characters</span>
              <button type="submit" disabled={!draft.trim() || memories.length >= 20} className="inline-flex items-center gap-1.5 rounded-lg bg-[#12251B] text-white px-3.5 py-2 text-xs font-semibold hover:bg-[#1d3929] disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" /> Save preference
              </button>
            </div>
            {memories.length >= 20 && <p className="text-xs text-amber-700">You can save up to 20 preferences. Delete one to add another.</p>}
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Saved preferences ({memories.length})</h3>
            <button type="button" onClick={clearMemories} disabled={memories.length === 0} className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-40">
              Forget all
            </button>
          </div>

          {memories.length === 0 ? (
            <div className="py-12 text-center">
              <Brain className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800 text-sm">Nothing remembered yet</p>
              <p className="text-xs text-slate-500 mt-1">Add brands, budgets, sizes, or other shopping preferences.</p>
            </div>
          ) : (
            memories.map((memory) => (
              <article key={memory.id} className="rounded-xl border border-slate-200 p-3">
                <p className={`text-sm leading-relaxed ${memory.enabled === false ? "text-slate-400" : "text-slate-800"}`}>{memory.content}</p>
                <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={memory.enabled !== false}
                      onChange={() => onToggleMemory(memory.id)}
                      className="accent-emerald-700"
                    />
                    Use in future searches
                  </label>
                  <button type="button" onClick={() => onDeleteMemory(memory.id)} aria-label="Delete saved preference" title="Delete saved preference" className="w-8 h-8 grid place-items-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 text-[11px] leading-relaxed text-slate-500">
          Memories and conversations stay in this browser on this device. They are sent to the shopping service only when you enable them for a search. Do not save payment details or sensitive personal information here.
        </div>
      </aside>
    </div>
  );
}
