"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { type ChatMessage, Composer, MessageList } from "@/components/panel/ChatThread";
import { errorMessage, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

import { ChatIcon, CloseIcon, HeadsetIcon, SendIcon } from "./icons";
import { useAssistant } from "./providers/AssistantProvider";
import { useAuth } from "./providers/AuthProvider";
import ProductVisual from "./ProductVisual";

type Turn = { role: "user" | "assistant"; content: string; products?: Product[] };
type Mode = "assistant" | "operator";
type Conversation = { token: string; status: "waiting" | "open" | "closed"; operator_name: string; customer_name: string };

const STARTERS = ["A gift under $50", "Something in silk", "Plates for serving plov"];
const TOKEN_KEY = "nafis-support-chat";
const SEEN_KEY = "nafis-support-seen";

function storage(key: string, value?: string | null) {
  try {
    if (value === undefined) return window.localStorage.getItem(key);
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage unavailable: the chat still works until the page is closed
  }
  return null;
}

/* ------------------------------------------------------------------ AI / search assistant */

function AssistantPane({ onHuman }: { onHuman: () => void }) {
  const { setOpen } = useAssistant();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function ask(message: string) {
    const text = message.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((t) => [...t, { role: "user", content: text }]);
    setBusy(true);
    try {
      const response = await fetch("/api/assistant/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 429) throw new Error("You've asked a lot of questions. Try again in a little while.");
      if (!response.ok) throw new Error(errorMessage(data));
      setTurns((t) => [...t, { role: "assistant", content: data.reply, products: data.products }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant isn't reachable right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
        {turns.length === 0 && (
          <div>
            <p className="text-[15px] leading-relaxed">
              Tell me who it&apos;s for, a budget or a material, and I&apos;ll pick a few pieces.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-cobalt hover:text-cobalt"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "flex justify-end" : ""}>
            <div
              className={
                turn.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-cobalt px-4 py-2.5 text-[15px] text-white"
                  : "max-w-[95%] text-[15px] leading-relaxed"
              }
            >
              <p className="whitespace-pre-line">{turn.content}</p>
              {turn.products && turn.products.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {turn.products.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/products/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-lg border border-line p-2 hover:border-cobalt"
                      >
                        <ProductVisual name={p.name} slug={p.slug} image={p.image} category={p.category.slug} className="w-14 shrink-0 rounded" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block text-sm text-muted">
                            {formatPrice(p.price)}
                            {!p.in_stock && <span className="text-madder"> (sold out)</span>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {busy && <p className="text-sm text-muted">Looking through the shop…</p>}
        {error && <p className="text-sm text-madder">{error}</p>}
      </div>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={onHuman}
          className="mb-3 flex w-full items-center gap-3 rounded-xl bg-porcelain px-3 py-2.5 text-left hover:bg-tint"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ishqor text-white">
            <HeadsetIcon width={18} height={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-medium">Talk to a person</span>
            <span className="block text-[12.5px] text-muted">An operator answers, and you can send photos or screenshots</span>
          </span>
        </button>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <label htmlFor="assistant-input" className="sr-only">
            Your question
          </label>
          <input
            ref={inputRef}
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            placeholder="Ask about a gift, size or material"
            className="h-11 flex-1 rounded-full border border-line bg-porcelain px-4 text-[15px]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-cobalt text-white disabled:opacity-40"
            aria-label="Send question"
          >
            <SendIcon />
          </button>
        </form>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Live chat with an operator */

function OperatorPane({
  token,
  setToken,
  conversation,
  messages,
  onPoll,
}: {
  token: string | null;
  setToken: (token: string | null) => void;
  conversation: Conversation | null;
  messages: ChatMessage[];
  onPoll: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.first_name ?? "");
  const [contact, setContact] = useState(user?.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function start(text: string, image: File | null) {
    if (!name.trim()) throw new Error("Add your name above so the operator knows who they're talking to.");
    setStarting(true);
    setError(null);
    const body = new FormData();
    body.append("name", name.trim());
    body.append("contact", contact.trim());
    if (text) body.append("text", text);
    if (image) body.append("image", image);
    try {
      const response = await fetch("/api/support/conversations/", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (response.status === 429) throw new Error("Too many new chats from this connection. Try again later.");
      if (!response.ok) throw new Error(errorMessage(data));
      setToken(data.conversation.token);
    } finally {
      setStarting(false);
    }
  }

  async function reply(text: string, image: File | null) {
    const body = new FormData();
    if (text) body.append("text", text);
    if (image) body.append("image", image);
    const response = await fetch(`/api/support/conversations/${token}/messages/`, { method: "POST", body });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorMessage(data));
    await onPoll();
  }

  async function end() {
    if (!token) return;
    await fetch(`/api/support/conversations/${token}/close/`, { method: "POST" }).catch(() => undefined);
    await onPoll();
  }

  if (!token) {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="space-y-4 px-5 py-4">
          <p className="text-[15px] leading-relaxed">
            Our operators reply in a few minutes, 8:00 to 23:00 Tashkent time. Attach a screenshot of something you saw and
            we&apos;ll find the closest piece we have.
          </p>
          <div>
            <label htmlFor="support-name" className="field-label">
              Your name
            </label>
            <input id="support-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="field" autoComplete="given-name" />
          </div>
          <div>
            <label htmlFor="support-contact" className="field-label">
              Email or phone <span className="font-normal text-muted">(optional, so we can follow up)</span>
            </label>
            <input id="support-contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} className="field" />
          </div>
          {error && <p role="alert" className="text-sm text-madder">{error}</p>}
        </div>
        <div className="mt-auto border-t border-line p-3">
          <Composer onSend={start} disabled={starting} placeholder="Write your question" />
        </div>
      </div>
    );
  }

  const status =
    conversation?.status === "closed"
      ? "This chat has ended."
      : conversation?.operator_name
        ? `${conversation.operator_name} is answering`
        : "Waiting for an operator…";

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-line bg-porcelain px-5 py-2 text-[13px]">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${conversation?.status === "open" ? "bg-ishqor" : conversation?.status === "closed" ? "bg-muted" : "bg-saffron"}`}
          />
          {status}
        </span>
        {conversation?.status !== "closed" && (
          <button type="button" onClick={end} className="text-muted underline underline-offset-4 hover:text-madder">
            End chat
          </button>
        )}
      </div>
      <div data-scroll className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        <MessageList messages={messages} me="customer" />
      </div>
      <div className="border-t border-line p-3">
        {conversation?.status === "closed" ? (
          <button type="button" onClick={() => setToken(null)} className="btn-primary h-11 w-full">
            Start a new chat
          </button>
        ) : (
          <Composer onSend={reply} placeholder="Message or screenshot" />
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Widget */

export default function AssistantWidget() {
  const { open, setOpen } = useAssistant();
  const [mode, setMode] = useState<Mode>("assistant");
  const [token, setTokenState] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(false);
  const lastId = useRef(0);

  // Restore an ongoing chat after a reload or on another page.
  useEffect(() => {
    const saved = storage(TOKEN_KEY);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved chat after mount
      setTokenState(saved);
      setMode("operator");
    }
  }, []);

  const setToken = (next: string | null) => {
    storage(TOKEN_KEY, next);
    setTokenState(next);
    setMessages([]);
    setConversation(null);
    lastId.current = 0;
  };

  const poll = useCallback(async () => {
    if (!token) return;
    const response = await fetch(`/api/support/conversations/${token}/?after=${lastId.current}`).catch(() => null);
    if (!response) return;
    if (response.status === 404) {
      storage(TOKEN_KEY, null);
      setTokenState(null);
      return;
    }
    if (!response.ok) return;
    const data = (await response.json()) as { conversation: Conversation; messages: ChatMessage[] };
    setConversation(data.conversation);
    if (data.messages.length) {
      lastId.current = data.messages[data.messages.length - 1].id;
      setMessages((current) => {
        const known = new Set(current.map((m) => m.id));
        return [...current, ...data.messages.filter((m) => !known.has(m.id))];
      });
      const seen = Number(storage(SEEN_KEY) ?? 0);
      if (data.messages.some((m) => m.sender === "operator" && m.id > seen)) setUnread(true);
    }
  }, [token]);

  // Poll quickly while the chat is on screen, slowly in the background (for the unread dot).
  useEffect(() => {
    if (!token) return;
     
    poll();
    const visible = open && mode === "operator";
    const timer = window.setInterval(poll, visible ? 3000 : 20000);
    return () => window.clearInterval(timer);
  }, [token, open, mode, poll]);

  useEffect(() => {
    if (open && mode === "operator" && messages.length) {
      storage(SEEN_KEY, String(messages[messages.length - 1].id));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- messages on screen count as read
      setUnread(false);
    }
  }, [open, mode, messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 hidden h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm text-porcelain shadow-[0_10px_30px_rgba(24,33,58,0.25)] ring-1 ring-porcelain/25 hover:bg-cobalt sm:flex"
      >
        <ChatIcon />
        {token ? "Your chat with us" : "Ask about a product"}
        {unread && (
          <span className="ml-1 flex h-5 items-center rounded-full bg-saffron px-2 text-[12px] font-medium text-ink">New reply</span>
        )}
      </button>
    );
  }

  return (
    <section
      aria-label={mode === "assistant" ? "Shopping assistant" : "Chat with an operator"}
      className="panel-in fixed inset-x-3 bottom-3 z-50 flex h-[min(640px,calc(100dvh-24px))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_60px_rgba(24,33,58,0.25)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl">{mode === "assistant" ? "Shop assistant" : "Talk to us"}</h2>
          <p className="text-xs text-muted">
            {mode === "assistant" ? "Answers come from what is in stock today." : "A real person from the Nafis team."}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {mode === "operator" && (
            <button
              type="button"
              onClick={() => setMode("assistant")}
              className="rounded-full px-3 py-1.5 text-[13px] text-cobalt hover:bg-tint"
            >
              Assistant
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-tint"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </header>

      {mode === "assistant" ? (
        <AssistantPane onHuman={() => setMode("operator")} />
      ) : (
        <OperatorPane token={token} setToken={setToken} conversation={conversation} messages={messages} onPoll={poll} />
      )}
    </section>
  );
}
