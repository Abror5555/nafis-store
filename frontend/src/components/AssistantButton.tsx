"use client";

import { useAssistant } from "./providers/AssistantProvider";

export default function AssistantButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { setOpen } = useAssistant();
  return (
    <button type="button" className={className} onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}
