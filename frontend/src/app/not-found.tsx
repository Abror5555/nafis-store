import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">This page isn&apos;t in the shop</h1>
      <p className="mt-4 text-lg text-muted">
        The product may have sold out and been removed, or the link has a typo.
      </p>
      <Link href="/products" className="btn-primary mt-8 h-12 px-7">
        Browse all products
      </Link>
    </div>
  );
}
