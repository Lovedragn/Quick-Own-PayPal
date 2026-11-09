"use client";

import { useMemo, useState } from "react";
import {
  Clock3,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatHistoryDrawer({
  isOpen,
  onClose,
  conversations = [],
  activeConversationId,
  onOpenConversation,
  onCreateConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearHistory,
  isAuthenticated = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.updatedAt || b.createdAt || 0) -
          new Date(a.updatedAt || a.createdAt || 0),
      ),
    [conversations],
  );

  if (!isOpen) return null;

  function beginRename(conversation) {
    setEditingId(conversation.id);
    setEditTitle(conversation.title || "Shopping conversation");
  }

  function saveRename(event, id) {
    event.preventDefault();
    const title = editTitle.trim();
    if (title) onRenameConversation(id, title);
    setEditingId(null);
    setEditTitle("");
  }

  function clearHistory() {
    if (window.confirm("Delete all saved shopping conversations? This cannot be undone.")) {
      onClearHistory();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/50 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-history-title"
        className="w-full max-w-lg h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 id="chat-history-title" className="font-cal font-bold text-lg text-slate-900">
              Shopping conversations
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {conversations.length} saved {conversations.length === 1 ? "conversation" : "conversations"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close chat history" className="w-9 h-9 grid place-items-center rounded-none hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 py-3 flex items-center gap-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              onCreateConversation();
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-none bg-[#12251B] text-white px-3 py-2.5 text-sm font-semibold hover:bg-[#1d3929] transition-colors"
          >
            <Plus className="w-4 h-4" /> New conversation
          </button>
          <button
            type="button"
            onClick={clearHistory}
            disabled={conversations.length === 0}
            className="px-3 py-2.5 rounded-none border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Clear all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {sortedConversations.length === 0 ? (
            <div className="py-16 text-center">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800">No conversations yet</p>
              <p className="text-xs text-slate-500 mt-1">Your product searches will appear here.</p>
            </div>
          ) : (
            sortedConversations.map((conversation) => {
              const turns = Array.isArray(conversation.turns) ? conversation.turns : [];
              const latestTurn = turns[turns.length - 1];
              const isActive = conversation.id === activeConversationId;
              const isEditing = editingId === conversation.id;

              return (
                <article
                  key={conversation.id}
                  className={`rounded-none border p-3.5 transition-colors ${isActive ? "border-emerald-600 bg-emerald-50/60 shadow-xs" : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"}`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenConversation(conversation.id, latestTurn?.id);
                        onClose();
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      {isEditing ? (
                        <span className="text-sm text-slate-400">Editing title…</span>
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 truncate">
                              {conversation.title || "Shopping conversation"}
                            </span>
                            {isActive && (
                              <span className="shrink-0 text-[10px] uppercase tracking-wide font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-none border border-emerald-300">
                                Active
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-slate-600 mt-1 line-clamp-2">
                            {latestTurn?.query || "New conversation"}
                          </span>
                          <span className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                            <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {turns.length} {turns.length === 1 ? "search" : "searches"}</span>
                            <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" /> {formatDate(conversation.updatedAt || conversation.createdAt)}</span>
                          </span>
                        </>
                      )}
                    </button>
                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => beginRename(conversation)} title="Rename conversation" aria-label="Rename conversation" className="w-8 h-8 grid place-items-center rounded-none text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const title = conversation.title || "this conversation";
                            if (window.confirm(`Delete "${title}"? This cannot be undone.`)) {
                              onDeleteConversation(conversation.id);
                            }
                          }}
                          title="Delete conversation"
                          aria-label="Delete conversation"
                          className="w-8 h-8 grid place-items-center rounded-none text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <form onSubmit={(event) => saveRename(event, conversation.id)} className="mt-2 flex gap-2">
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        maxLength={64}
                        className="min-w-0 flex-1 border border-slate-300 rounded-none px-2.5 py-2 text-sm outline-none focus:border-emerald-500"
                        aria-label="Conversation title"
                      />
                      <button type="submit" className="px-3 rounded-none bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="px-2 rounded-none border border-slate-200 text-xs hover:bg-slate-50 transition-colors">Cancel</button>
                    </form>
                  )}
                  {turns.length > 1 && (
                    <details className="mt-3 border-t border-slate-100 pt-2">
                      <summary className="cursor-pointer select-none text-xs font-semibold text-slate-600 hover:text-slate-900">
                        View earlier searches ({turns.length - 1})
                      </summary>
                      <div className="mt-2 space-y-1.5">
                        {[...turns].slice(0, -1).reverse().map((turn) => (
                          <button
                            key={turn.id}
                            type="button"
                            onClick={() => {
                              onOpenConversation(conversation.id, turn.id);
                              onClose();
                            }}
                            className="w-full rounded-none border border-slate-200 px-2.5 py-2 text-left hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
                          >
                            <span className="block truncate text-xs font-medium text-slate-800">
                              {turn.query || (turn.imageSearch ? "Image search" : "Untitled search")}
                            </span>
                            <span className="mt-1 block text-[10px] text-slate-400">
                              {turn.resultCount || 0} results · {formatDate(turn.createdAt)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </article>
              );
            })
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-500">
          {isAuthenticated
            ? "Conversation history is saved to your account."
            : "Conversation history is saved in this browser on this device."}
        </div>
      </aside>
    </div>
  );
}
