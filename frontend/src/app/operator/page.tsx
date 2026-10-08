"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SearchIcon } from "@/components/icons";
import { type ChatMessage, Composer, MessageList } from "@/components/panel/ChatThread";
import { initials, money, relative } from "@/components/panel/format";
import { Badge } from "@/components/panel/ui";
import { usePanelData, useSend } from "@/components/panel/usePanelData";
import { useAuth } from "@/components/providers/AuthProvider";

type ListItem = {
  id: number;
  customer_name: string;
  customer_contact: string;
  status: "waiting" | "open" | "closed";
  operator_name: string;
  is_mine: boolean;
  is_registered: boolean;
  created_at: string;
  last_message_at: string;
  last_message: { sender: string; text: string; has_image: boolean } | null;
};

type Detail = {
  conversation: ListItem;
  customer: { name: string; contact: string; registered: boolean; orders: number; previous_chats: number };
  messages: ChatMessage[];
};

type Fact = {
  id: number;
  name: string;
  slug: string;
  category: string;
  seller: string;
  price: string;
  stock: number;
  origin: string;
  materials: string;
  dimensions: string;
  summary: string;
  is_active: boolean;
};

const BOXES = [
  { key: "waiting", label: "Waiting" },
  { key: "mine", label: "My chats" },
  { key: "closed", label: "Closed" },
] as const;

function factLine(p: Fact) {
  const parts = [`${p.name}: ${money(Number(p.price))}`, p.stock ? `${p.stock} in stock` : "sold out right now"];
  if (p.materials) parts.push(p.materials);
  if (p.dimensions) parts.push(p.dimensions);
  return `${parts.join(", ")}. ${typeof window !== "undefined" ? window.location.origin : ""}/products/${p.slug}`;
}

export default function OperatorInbox() {
  const { user, authFetch } = useAuth();
  const send = useSend();
  const [box, setBox] = useState<(typeof BOXES)[number]["key"]>("waiting");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const lastId = useRef(0);

  const lists = {
    waiting: usePanelData<ListItem[]>("/api/operator/conversations/?box=waiting", { pollMs: 5000 }),
    mine: usePanelData<ListItem[]>("/api/operator/conversations/?box=mine", { pollMs: 5000 }),
    closed: usePanelData<ListItem[]>(box === "closed" ? "/api/operator/conversations/?box=closed" : null),
  };
  const items = lists[box].data ?? [];
  const waitingCount = lists.waiting.data?.length ?? 0;

  useEffect(() => {
    document.title = waitingCount ? `(${waitingCount}) Chats | Operator desk` : "Chats | Operator desk";
  }, [waitingCount]);

  const loadDetail = useCallback(
    async (id: number, fresh: boolean) => {
      const after = fresh ? 0 : lastId.current;
      const response = await authFetch(`/api/operator/conversations/${id}/${after ? `?after=${after}` : ""}`);
      if (!response.ok) return;
      const body = (await response.json()) as Detail;
      setDetail((current) => {
        const messages = fresh || !current || current.conversation.id !== id ? body.messages : [...current.messages, ...body.messages];
        lastId.current = messages[messages.length - 1]?.id ?? 0;
        return { ...body, messages };
      });
    },
    [authFetch],
  );

  useEffect(() => {
    if (activeId === null) return;
    lastId.current = 0;
    loadDetail(activeId, true);
    const timer = window.setInterval(() => loadDetail(activeId, false), 3000);
    return () => window.clearInterval(timer);
  }, [activeId, loadDetail]);

  const refreshLists = () => {
    lists.waiting.reload();
    lists.mine.reload();
  };

  async function claim() {
    if (!detail) return;
    setActionError(null);
    try {
      await send(`/api/operator/conversations/${detail.conversation.id}/claim/`, "POST");
      await loadDetail(detail.conversation.id, true);
      setBox("mine");
      refreshLists();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't take this chat.");
      refreshLists();
    }
  }

  async function closeChat() {
    if (!detail) return;
    await send(`/api/operator/conversations/${detail.conversation.id}/close/`, "POST");
    await loadDetail(detail.conversation.id, true);
    refreshLists();
  }

  async function sendMessage(text: string, image: File | null) {
    if (!detail) return;
    const body = new FormData();
    if (text) body.append("text", text);
    if (image) body.append("image", image);
    await send(`/api/operator/conversations/${detail.conversation.id}/messages/`, "POST", body);
    await loadDetail(detail.conversation.id, false);
    if (detail.conversation.status === "waiting") {
      setBox("mine");
      refreshLists();
    }
  }

  const conversation = detail?.conversation;
  const canWrite = conversation && conversation.status !== "closed" && (conversation.is_mine || conversation.status === "waiting");

  return (
    <div className="-mx-4 -my-8 grid h-[calc(100dvh-56px)] grid-cols-1 overflow-hidden bg-surface sm:-mx-6 lg:-mx-10 lg:-my-10 lg:h-dvh lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      {/* Queue */}
      <aside className={`flex min-h-0 flex-col border-r border-line ${activeId !== null ? "hidden lg:flex" : "flex"}`}>
        <div className="border-b border-line px-5 pb-3 pt-6">
          <h1 className="font-display text-3xl">Chats</h1>
          <p className="mt-1 text-sm text-muted">Hello, {user?.first_name}. New chats appear here on their own.</p>
          <div role="tablist" aria-label="Chat lists" className="mt-4 grid grid-cols-3 gap-1 rounded-lg bg-porcelain p-1">
            {BOXES.map((b) => {
              const n = b.key === "waiting" ? waitingCount : b.key === "mine" ? lists.mine.data?.length ?? 0 : null;
              return (
                <button
                  key={b.key}
                  type="button"
                  role="tab"
                  aria-selected={box === b.key}
                  onClick={() => setBox(b.key)}
                  className={`h-8 rounded-md text-[13px] ${box === b.key ? "bg-surface font-medium shadow-[0_1px_2px_rgba(24,33,58,0.12)]" : "text-muted"}`}
                >
                  {b.label}
                  {n ? <span className={`ml-1 ${b.key === "waiting" ? "text-madder" : ""}`}>{n}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted">
              {box === "waiting" ? "Nobody is waiting. Nice work." : box === "mine" ? "You have no open chats." : "No closed chats yet."}
            </li>
          )}
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setActionError(null);
                }}
                className={`flex w-full gap-3 border-b border-line px-5 py-3.5 text-left hover:bg-porcelain ${activeId === c.id ? "bg-tint" : ""}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/8 text-sm font-medium">
                  {initials(c.customer_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{c.customer_name}</span>
                    <span className="shrink-0 text-[12px] text-muted">{relative(c.status === "waiting" ? c.created_at : c.last_message_at)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">
                    {c.last_message?.has_image && "Image. "}
                    {c.last_message?.text || (c.last_message?.has_image ? "" : "No messages yet")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Thread */}
      <section className={`min-h-0 flex-col ${activeId === null ? "hidden lg:flex" : "flex"}`} aria-label="Conversation">
        {!conversation ? (
          <div className="flex flex-1 items-center justify-center p-10 text-center text-muted">
            Choose a chat on the left. Waiting customers are listed oldest first.
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
              <button type="button" onClick={() => setActiveId(null)} className="text-sm text-cobalt lg:hidden">
                Back
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium">{conversation.customer_name}</p>
                <p className="truncate text-[13px] text-muted">{conversation.customer_contact || "No contact details"}</p>
              </div>
              {conversation.status === "waiting" && (
                <button type="button" onClick={claim} className="btn-primary h-10 px-5">
                  Take this chat
                </button>
              )}
              {conversation.status === "open" && conversation.is_mine && (
                <button type="button" onClick={closeChat} className="btn-secondary h-10 px-5">
                  Close chat
                </button>
              )}
              {conversation.status === "closed" && <Badge>Closed</Badge>}
            </header>
            {actionError && <p role="alert" className="border-b border-line bg-madder/5 px-5 py-2 text-sm text-madder">{actionError}</p>}
            <div data-scroll className="min-h-0 flex-1 overflow-y-auto bg-porcelain/60 px-5 py-5">
              <MessageList messages={detail.messages} me="operator" />
            </div>
            <div className="border-t border-line bg-surface p-4">
              {canWrite ? (
                <Composer
                  onSend={sendMessage}
                  draft={draft}
                  onDraftChange={setDraft}
                  placeholder={conversation.status === "waiting" ? "Reply to take this chat" : "Write a reply, paste a screenshot or attach a photo"}
                />
              ) : (
                <p className="text-center text-sm text-muted">
                  {conversation.status === "closed" ? "This chat is closed." : "Another operator is handling this chat."}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* Customer and product facts */}
      <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-line bg-porcelain/40 xl:flex">
        {detail && (
          <div className="border-b border-line p-5">
            <h2 className="text-sm text-muted">Customer</h2>
            <p className="mt-2 font-medium">{detail.customer.name}</p>
            <ul className="mt-2 space-y-1 text-[14px]">
              <li>{detail.customer.registered ? "Has an account" : "Guest, no account"}</li>
              <li>{detail.customer.orders} orders placed</li>
              <li>{detail.customer.previous_chats} earlier chats</li>
            </ul>
          </div>
        )}
        <ProductFacts onInsert={(line) => setDraft((d) => (d ? `${d}\n${line}` : line))} canInsert={!!canWrite} />
      </aside>
    </div>
  );
}

function ProductFacts({ onInsert, canInsert }: { onInsert: (line: string) => void; canInsert: boolean }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setQuery(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  const { data } = usePanelData<{ results: Fact[] }>(`/api/operator/products/?page_size=8&search=${encodeURIComponent(query)}`);

  return (
    <div className="p-5">
      <h2 className="text-sm text-muted">Product facts</h2>
      <div className="relative mt-2">
        <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search silk, plate, Bukhara"
          aria-label="Search products"
          className="h-10 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-sm"
        />
      </div>
      <ul className="mt-3 space-y-2">
        {data?.results.map((p) => (
          <li key={p.id} className="rounded-lg border border-line bg-surface p-3 text-[13px]">
            <p className="font-medium text-[14px]">{p.name}</p>
            <p className="mt-0.5 text-muted">
              {money(Number(p.price))}, {p.stock ? `${p.stock} in stock` : <span className="text-madder">sold out</span>}, {p.seller}
            </p>
            {(p.materials || p.dimensions) && (
              <p className="mt-0.5 text-muted">{[p.materials, p.dimensions].filter(Boolean).join(", ")}</p>
            )}
            {canInsert && (
              <button type="button" onClick={() => onInsert(factLine(p))} className="mt-2 text-cobalt underline underline-offset-4">
                Add to reply
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
