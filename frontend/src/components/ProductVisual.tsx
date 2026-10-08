import ProductArt from "./ProductArt";

/** Shows the uploaded product photo, or generated artwork when there is none. */
export default function ProductVisual({
  name,
  slug,
  image,
  category,
  className = "",
  sizes = "small",
}: {
  name: string;
  slug: string;
  image: string | null;
  category: string;
  className?: string;
  sizes?: "small" | "large";
}) {
  const box = `relative aspect-square overflow-hidden bg-tint ${className}`;
  if (image) {
    return (
      <div className={box}>
        {/* eslint-disable-next-line @next/next/no-img-element -- images come from the Django media proxy */}
        <img
          src={image}
          alt={name}
          loading={sizes === "large" ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className={box}>
      <ProductArt seed={slug} category={category} title={name} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
