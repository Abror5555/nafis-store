"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <h1 className="font-display text-4xl">This page failed to load</h1>
      <p className="mt-4 text-lg text-muted">The server returned an error. Try again, and if it keeps happening, come back later.</p>
      <button type="button" onClick={reset} className="btn-primary mt-8 h-12 px-7">
        Try again
      </button>
    </div>
  );
}
