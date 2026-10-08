import Link from "next/link";

import ApiDown from "@/components/ApiDown";
import AssistantButton from "@/components/AssistantButton";
import { PlateMotif } from "@/components/ProductArt";
import ProductArt from "@/components/ProductArt";
import ProductCard from "@/components/ProductCard";
import { ApiUnavailableError, getCategories, getProducts, getStoreConfig } from "@/lib/api";
import { formatPrice, pluralize } from "@/lib/format";

const HERO_PRODUCT = "rishtan-lagan-plate-32-cm";

export default async function HomePage() {
  let data;
  try {
    data = await Promise.all([
      getCategories(),
      getProducts({ featured: "true" }),
      getProducts({ ordering: "-created_at" }),
      getStoreConfig(),
    ]);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return <ApiDown />;
    throw error;
  }
  const [categories, featured, latest, config] = data;

  const picks = [...featured.results];
  for (const product of latest.results) {
    if (picks.length >= 8) break;
    if (!picks.some((p) => p.id === product.id)) picks.push(product);
  }

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-24 lg:pt-16">
        <div>
          <h1 className="font-display text-[44px] leading-[1.02] tracking-[-0.015em] sm:text-6xl lg:text-[76px]">
            Handmade in Rishtan, Margilan and Bukhara
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-muted">
            Plates glazed with plant-ash turquoise, silk dyed thread by thread before weaving, and suzani stitched over
            months. Sent from Tashkent to anywhere in the world.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/products" className="btn-primary h-12 px-7">
              Shop the collection
            </Link>
            <AssistantButton className="btn-secondary h-12 px-7">Ask for a gift idea</AssistantButton>
          </div>
        </div>

        <figure className="mx-auto w-full max-w-[560px]">
          <Link href={`/products/${HERO_PRODUCT}`} aria-label="Rishtan lagan plate, 32 cm" className="block">
            <svg viewBox="0 0 400 400" className="h-auto w-full" aria-hidden>
              <PlateMotif seed={HERO_PRODUCT} animate />
            </svg>
          </Link>
          <figcaption className="mt-4 text-center text-sm text-muted">
            Lagan plate from Rishtan, painted freehand.{" "}
            <Link href={`/products/${HERO_PRODUCT}`} className="text-cobalt underline underline-offset-4">
              See this plate
            </Link>
          </figcaption>
        </figure>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="crafts-heading" className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="crafts-heading" className="font-display text-3xl sm:text-4xl">
            Shop by craft
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.slug} className="group relative">
                <div className="aspect-square overflow-hidden rounded-md">
                  <ProductArt seed={`category-${category.slug}`} category={category.slug} className="h-full w-full" />
                </div>
                <h3 className="mt-4 font-display text-2xl">
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
                  >
                    {category.name}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-muted">{pluralize(category.product_count, "piece", "pieces")}</p>
                <p className="mt-2 hidden max-w-[34ch] text-[15px] leading-relaxed sm:block">{category.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {picks.length > 0 && (
        <section aria-labelledby="picks-heading" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
          <div className="flex items-end justify-between gap-6">
            <h2 id="picks-heading" className="font-display text-3xl sm:text-4xl">
              Pieces we like right now
            </h2>
            <Link href="/products" className="shrink-0 text-[15px] text-cobalt underline underline-offset-4">
              See all products
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {picks.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="Ordering" className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <dl className="grid gap-8 border-y border-line py-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
          <div className="md:pr-10">
            <dt className="font-medium">Shipping</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-muted">
              Free on orders over {formatPrice(config.free_shipping_threshold)}. Otherwise a flat{" "}
              {formatPrice(config.flat_shipping_rate)} to any country.
            </dd>
          </div>
          <div className="md:px-10">
            <dt className="font-medium">Payment</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-muted">
              {config.payment_methods.includes("card")
                ? "Pay by card at checkout, or in cash when the parcel arrives."
                : "Pay in cash when the parcel arrives."}
            </dd>
          </div>
          <div className="md:pl-10">
            <dt className="font-medium">Made by hand</dt>
            <dd className="mt-2 text-[15px] leading-relaxed text-muted">
              Colours and sizes vary a little from piece to piece. That is how you can tell.
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
