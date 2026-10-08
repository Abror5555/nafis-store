/** A narrow strip of ikat that marks the edge between the page and the footer. */
export default function IkatBand() {
  const colors = ["#B42F3C", "#E2A23B", "#1E2A5E", "#138A8F"];
  const width = 48;
  const count = 40;
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width * count} 28`}
      preserveAspectRatio="xMidYMid slice"
      className="block h-7 w-full"
    >
      <rect width={width * count} height="28" fill="#F1EEE6" />
      {Array.from({ length: count }, (_, i) => {
        const x = i * width + width / 2;
        const color = colors[i % colors.length];
        return (
          <g key={i}>
            <polygon points={`${x - 20},14 ${x - 6},1 ${x + 6},1 ${x + 20},14 ${x + 6},27 ${x - 6},27`} fill={color} />
            <polygon points={`${x - 8},14 ${x},6 ${x + 8},14 ${x},22`} fill="#F1EEE6" />
          </g>
        );
      })}
    </svg>
  );
}
