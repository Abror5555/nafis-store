"use client";

import { useEffect, useRef, useState } from "react";

import { CloseIcon, ImageIcon, SendIcon } from "@/components/icons";

import { clock } from "./format";

export type ChatMessage = {
  id: number;
  sender: "customer" | "operator" | "system";
  author_name: string;
  text: string;
  image: string | null;
  created_at: string;
};

const MAX_BYTES = 5 * 1024 * 1024;

/** The message list, shared by the shop's chat bubble and the operator desk. `me` is the side shown on the right. */
export function MessageList({ messages, me, compact = false }: { messages: ChatMessage[]; me: "customer" | "operator"; compact?: boolean }) {
  const end = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1]?.id;
  // Scroll only the chat's own scroll area (marked with data-scroll), never the whole page.
  const scrollToEnd = () => {
    const scroller = end.current?.closest<HTMLElement>("[data-scroll]");
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  };
  useEffect(scrollToEnd, [last]);

  return (
    <div className={`space-y-3 ${compact ? "" : "px-1"}`}>
      {messages.map((m) => {
        if (m.sender === "system") {
          return (
            <p key={m.id} className="text-center text-[12.5px] text-muted">
              {m.text}
            </p>
          );
        }
        const mine = m.sender === me;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
              {!mine && m.author_name && <span className="px-1 text-[12px] text-muted">{m.author_name}</span>}
              {m.image && (
                <a href={m.image} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element -- chat attachments are served from /media */}
                  <img src={m.image} alt="Attached image" onLoad={scrollToEnd} className="max-h-56 w-auto max-w-full object-contain" />
                </a>
              )}
              {m.text && (
                <p
                  className={`whitespace-pre-line rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                    mine ? "rounded-br-sm bg-cobalt text-white" : "rounded-bl-sm bg-tint text-ink"
                  }`}
                >
                  {m.text}
                </p>
              )}
              <span className="px-1 text-[11.5px] text-muted">{clock(m.created_at)}</span>
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

/** Text box with image attach, drag-and-drop and paste (Ctrl+V a screenshot). */
export function Composer({
  onSend,
  disabled,
  placeholder,
  draft,
  onDraftChange,
}: {
  onSend: (text: string, image: File | null) => Promise<void>;
  disabled?: boolean;
  placeholder: string;
  draft?: string;
  onDraftChange?: (text: string) => void;
}) {
  const [ownText, setOwnText] = useState("");
  const text = draft ?? ownText;
  const setText = onDraftChange ?? setOwnText;
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the preview when the image is removed
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function attach(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only images can be attached.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is over 5 MB.");
      return;
    }
    setError(null);
    setImage(file);
  }

  async function submit() {
    if ((!text.trim() && !image) || sending || disabled) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text.trim(), image);
      setText("");
      setImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The message wasn't sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        attach(e.dataTransfer.files[0]);
      }}
    >
      {preview && (
        <div className="mb-2 flex items-center gap-2">
          <span className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
            <img src={preview} alt="Image to send" className="h-16 w-16 rounded-lg border border-line object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"
              aria-label="Remove image"
            >
              <CloseIcon width={14} height={14} />
            </button>
          </span>
          <span className="text-[13px] text-muted">Image ready to send</span>
        </div>
      )}
      {error && <p role="alert" className="mb-2 text-[13px] text-madder">{error}</p>}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={disabled}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-muted hover:border-cobalt hover:text-cobalt disabled:opacity-40"
          aria-label="Attach an image"
          title="Attach an image (you can also paste a screenshot)"
        >
          <ImageIcon />
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Image to attach"
          onChange={(e) => {
            attach(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <label className="sr-only" htmlFor="composer-text">
          Message
        </label>
        <textarea
          id="composer-text"
          rows={1}
          value={text}
          disabled={disabled}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
            if (file) {
              e.preventDefault();
              attach(file);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] border border-line bg-porcelain px-4 py-2.5 text-[15px] leading-snug disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || sending || (!text.trim() && !image)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cobalt text-white disabled:opacity-40"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
