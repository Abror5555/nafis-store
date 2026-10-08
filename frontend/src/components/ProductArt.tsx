import type { ReactNode } from "react";

/**
 * Generated artwork used when a product has no photo yet.
 *
 * Each craft gets its own motif: a Rishtan-style plate for ceramics, ikat
 * lozenges for textiles and silk, and a girih star lattice for wood and metal.
 * The drawing is deterministic (seeded by the slug), so a product always gets
 * the same picture on the server and in the browser.
 */

type Variant = "plate" | "ikat" | "girih";

const C = {
  glaze: "#FBFCFD",
  cobalt: "#2A44A6",
  indigo: "#1E2A5E",
  ishqor: "#138A8F",
  turquoise: "#4FB3B5",
  madder: "#B42F3C",
  saffron: "#E2A23B",
  porcelain: "#EEF2F7",
  linen: "#F1EEE6",
  walnut: "#5B3F2C",
  walnutLight: "#D8B48A",
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

export function variantFor(categorySlug: string): Variant {
  if (categorySlug === "ceramics") return "plate";
  if (categorySlug === "home-wood") return "girih";
  return "ikat";
}

/* ---------- Plate ---------------------------------------------------------- */

function ring(count: number, render: (angle: number, i: number) => ReactNode) {
  return Array.from({ length: count }, (_, i) => render((360 / count) * i, i));
}

export function PlateMotif({ seed, animate = false }: { seed: string; animate?: boolean }) {
  const r = rng(hash(seed));
  const petals = [6, 8, 10, 12][Math.floor(r() * 4)];
  const leaves = [20, 24, 28][Math.floor(r() * 3)];
  const accent = r() > 0.5 ? C.saffron : C.madder;
  const bandColor = r() > 0.35 ? C.ishqor : C.cobalt;
  const petalColor = bandColor === C.ishqor ? C.cobalt : C.ishqor;
  const ringClass = animate ? "plate-ring" : undefined;
  const delay = (i: number) => (animate ? { animationDelay: `${i * 140}ms` } : undefined);

  return (
    <g>
      <circle cx="200" cy="200" r="176" fill="#D9E1EA" />
      <circle cx="200" cy="200" r="172" fill={C.glaze} />

      <g className={ringClass} style={delay(0)}>
        <circle cx="200" cy="200" r="162" fill={bandColor} />
        <circle cx="200" cy="200" r="140" fill={C.glaze} />
        {ring(leaves, (a) => (
          <ellipse key={a} cx="200" cy="49" rx="4.2" ry="9" fill={C.glaze} transform={`rotate(${round(a)} 200 200)`} />
        ))}
      </g>

      <g className={ringClass} style={delay(1)}>
        {ring(48, (a) => (
          <circle key={a} cx="200" cy="72" r="2.6" fill={petalColor} transform={`rotate(${round(a)} 200 200)`} />
        ))}
      </g>

      <g className={ringClass} style={delay(2)}>
        {ring(petals, (a) => (
          <g key={a} transform={`rotate(${round(a)} 200 200)`}>
            <ellipse cx="200" cy="118" rx="19" ry="44" fill={petalColor} />
            <ellipse cx="200" cy="122" rx="8" ry="27" fill={C.turquoise} />
            <circle cx="200" cy="96" r="3.5" fill={C.glaze} />
          </g>
        ))}
        {ring(petals, (a) => (
          <circle
            key={a}
            cx="200"
            cy="98"
            r="6"
            fill={accent}
            transform={`rotate(${round(a + 180 / petals)} 200 200)`}
          />
        ))}
      </g>

      <g className={ringClass} style={delay(3)}>
        <circle cx="200" cy="200" r="42" fill={bandColor} />
        <circle cx="200" cy="200" r="31" fill={C.glaze} />
        {ring(8, (a) => (
          <ellipse key={a} cx="200" cy="183" rx="5" ry="11" fill={petalColor} transform={`rotate(${a} 200 200)`} />
        ))}
        <circle cx="200" cy="200" r="6" fill={accent} />
      </g>
    </g>
  );
}

/* ---------- Ikat ----------------------------------------------------------- */

const IKAT_PALETTES = [
  { bg: C.indigo, outer: C.madder, mid: C.saffron, inner: C.linen },
  { bg: C.linen, outer: C.indigo, mid: C.madder, inner: C.saffron },
  { bg: C.porcelain, outer: C.ishqor, mid: C.indigo, inner: C.saffron },
  { bg: C.madder, outer: C.linen, mid: C.indigo, inner: C.saffron },
  { bg: "#F4E7C8", outer: C.madder, mid: C.indigo, inner: C.ishqor },
  { bg: C.ishqor, outer: C.linen, mid: C.madder, inner: C.saffron },
];

/** A lozenge whose left and right edges zig-zag, like threads that bled during dyeing. */
function featheredLozenge(cx: number, cy: number, w: number, h: number, next: () => number) {
  const steps = 18;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = cy - h / 2 + t * h;
    const half = (1 - Math.abs(t - 0.5) * 2) * (w / 2);
    const jitter = i === 0 || i === steps ? 0 : (next() - 0.25) * 11;
    left.push(`${round(cx - half - jitter)},${round(y)}`);
    right.unshift(`${round(cx + half + jitter)},${round(y)}`);
  }
  return [...left, ...right].join(" ");
}

function IkatMotif({ seed }: { seed: string }) {
  const r = rng(hash(seed));
  const palette = IKAT_PALETTES[Math.floor(r() * IKAT_PALETTES.length)];
  const columns = 4;
  const colWidth = 400 / columns;
  const motifHeight = [130, 150, 170][Math.floor(r() * 3)];
  const shapes: ReactNode[] = [];

  for (let c = 0; c < columns; c++) {
    const cx = colWidth * c + colWidth / 2;
    const offset = c % 2 === 0 ? 0 : motifHeight / 2;
    for (let y = -motifHeight + offset; y < 400 + motifHeight; y += motifHeight) {
      const key = `${c}-${y}`;
      shapes.push(
        <g key={key}>
          <polygon points={featheredLozenge(cx, y, colWidth * 0.92, motifHeight * 0.96, r)} fill={palette.outer} />
          <polygon points={featheredLozenge(cx, y, colWidth * 0.56, motifHeight * 0.6, r)} fill={palette.mid} />
          <polygon points={featheredLozenge(cx, y, colWidth * 0.22, motifHeight * 0.26, r)} fill={palette.inner} />
        </g>,
      );
    }
  }

  return (
    <g>
      <rect width="400" height="400" fill={palette.bg} />
      {shapes}
    </g>
  );
}

/* ---------- Girih ---------------------------------------------------------- */

function starPoints(cx: number, cy: number, outer: number, inner: number) {
  const points: string[] = [];
  for (let i = 0; i < 16; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    points.push(`${round(cx + radius * Math.cos(angle))},${round(cy + radius * Math.sin(angle))}`);
  }
  return points.join(" ");
}

function GirihMotif({ seed }: { seed: string }) {
  const r = rng(hash(seed));
  const spacing = [100, 133.3][Math.floor(r() * 2)];
  const bg = r() > 0.5 ? C.walnut : "#7A4A2A";
  const stroke = C.walnutLight;
  const items: ReactNode[] = [];
  for (let x = 0; x <= 400 + spacing; x += spacing) {
    for (let y = 0; y <= 400 + spacing; y += spacing) {
      const key = `${x}-${y}`;
      items.push(
        <g key={key}>
          <polygon points={starPoints(x, y, spacing * 0.36, spacing * 0.24)} fill="none" stroke={stroke} strokeWidth="3" />
          <polygon points={starPoints(x, y, spacing * 0.16, spacing * 0.1)} fill={stroke} opacity="0.85" />
          <line x1={x + spacing * 0.36} y1={y} x2={x + spacing * 0.64} y2={y} stroke={stroke} strokeWidth="3" />
          <line x1={x} y1={y + spacing * 0.36} x2={x} y2={y + spacing * 0.64} stroke={stroke} strokeWidth="3" />
          <rect
            x={x + spacing / 2 - spacing * 0.07}
            y={y + spacing / 2 - spacing * 0.07}
            width={spacing * 0.14}
            height={spacing * 0.14}
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            transform={`rotate(45 ${round(x + spacing / 2)} ${round(y + spacing / 2)})`}
          />
        </g>,
      );
    }
  }
  return (
    <g>
      <rect width="400" height="400" fill={bg} />
      {items}
    </g>
  );
}

/* ---------- Public component ---------------------------------------------- */

export default function ProductArt({
  seed,
  category,
  className,
  title,
}: {
  seed: string;
  category: string;
  className?: string;
  title?: string;
}) {
  const variant = variantFor(category);
  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
    >
      {variant === "plate" && (
        <>
          <rect width="400" height="400" fill="#E3EBF2" />
          <g transform="translate(20 20) scale(0.9)">
            <PlateMotif seed={seed} />
          </g>
        </>
      )}
      {variant === "ikat" && <IkatMotif seed={seed} />}
      {variant === "girih" && <GirihMotif seed={seed} />}
    </svg>
  );
}
