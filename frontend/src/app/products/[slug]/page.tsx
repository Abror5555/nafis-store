import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AddToCart from "@/components/AddToCart";
import ApiDown from "@/components/ApiDown";
import ProductCard from "@/components/ProductCard";
import ProductVisual from "@/components/ProductVisual";
import { LivePrice, PurchaseProvider } from "@/components/PurchaseProvider";
import { ApiUnavailableError, getProduct, getProducts } from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    if (!product) return { title: "Product not found" };
    return { title: product.name, description: product.summary };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return <ApiDown />;
    throw error;
  }
  if (!product) notFound();

  const related = (await getProducts({ category: product.category.slug })).results
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const details = [
    { label: "Made in", value: product.origin },
    { label: "Materials", value: product.materials },
    { label: "Size", value: product.dimensions },
  ].filter((d) => d.value);

  const lowStock = product.in_stock && product.stock <= 3;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/products" className="hover:text-cobalt">
              Shop
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-cobalt">
              {product.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <ProductVisual
          name={product.name}
          slug={product.slug}
          image={product.image}
          category={product.category.slug}
          className="rounded-lg"
          sizes="large"
        />

        <PurchaseProvider>
        <div className="lg:pt-4">
          <h1 className="font-display text-4xl leading-[1.08] sm:text-5xl">{product.name}</h1>
          <LivePrice unitPrice={product.price} />
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">{product.summary}</p>

          <p className="mt-6 text-[15px]">
            {!product.in_stock ? (
              <span className="text-madder">Sold out</span>
            ) : lowStock ? (
              <span className="text-madder">Only {product.stock} left</span>
            ) : (
              <span className="text-ishqor-text">In stock, ships in 3 to 5 days</span>
            )}
          </p>

          <div className="mt-6">
            <AddToCart product={product} />
          </div>

          {details.length > 0 && (
            <dl className="mt-10 divide-y divide-line border-y border-line text-[15px]">
              {details.map((d) => (
                <div key={d.label} className="grid grid-cols-[120px_1fr] gap-4 py-3">
                  <dt className="text-muted">{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-8 max-w-[62ch] space-y-4 text-[16px] leading-[1.7]">
            {product.description.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
        </PurchaseProvider>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-24">
          <h2 id="related-heading" className="font-display text-3xl">
            More {product.category.name.toLowerCase()}
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
