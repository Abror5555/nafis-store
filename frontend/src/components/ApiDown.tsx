export default function ApiDown() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <h1 className="font-display text-4xl">The shop can&apos;t load products right now</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        The product API didn&apos;t respond. If you are running the project locally, start the Django server with{" "}
        <code className="rounded bg-tint px-1.5 py-0.5 text-[15px] text-ink">python manage.py runserver</code> and reload
        this page.
      </p>
    </div>
  );
}
