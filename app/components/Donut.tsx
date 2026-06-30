import type { CategorySlice } from "../../src/analytics";
import { CATEGORY_COLOURS, inr } from "../format";

interface DonutProps {
  slices: readonly CategorySlice[];
  size?: number;
}

const TAU = Math.PI * 2;

/** Point on a circle at the given fraction of the way round, from 12 o'clock. */
function pointAt(fraction: number, radius: number, centre: number): [number, number] {
  const angle = fraction * TAU - Math.PI / 2;
  return [centre + radius * Math.cos(angle), centre + radius * Math.sin(angle)];
}

/** A dependency free SVG donut of spend by category. */
export function Donut({ slices, size = 220 }: DonutProps) {
  const centre = size / 2;
  const radius = size / 2 - 6;
  const inner = radius * 0.62;
  const total = slices.reduce((sum, s) => sum + s.total, 0);

  if (total <= 0) {
    return <p className="muted">No spending to chart yet.</p>;
  }

  let cursor = 0;
  const arcs = slices.map((slice) => {
    const start = cursor;
    const end = cursor + slice.share;
    cursor = end;
    const [x0, y0] = pointAt(start, radius, centre);
    const [x1, y1] = pointAt(end, radius, centre);
    const [ix1, iy1] = pointAt(end, inner, centre);
    const [ix0, iy0] = pointAt(start, inner, centre);
    const large = slice.share > 0.5 ? 1 : 0;
    const d = [
      `M ${x0} ${y0}`,
      `A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`,
      `L ${ix1} ${iy1}`,
      `A ${inner} ${inner} 0 ${large} 0 ${ix0} ${iy0}`,
      "Z",
    ].join(" ");
    return { d, colour: CATEGORY_COLOURS[slice.category], key: slice.category };
  });

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        {arcs.map((arc) => (
          <path key={arc.key} d={arc.d} fill={arc.colour} stroke="#0b1020" strokeWidth={1.5} />
        ))}
        <text x={centre} y={centre - 6} textAnchor="middle" className="donut-total">
          {inr(total)}
        </text>
        <text x={centre} y={centre + 14} textAnchor="middle" className="donut-label">
          spent
        </text>
      </svg>
      <ul className="legend">
        {slices.map((s) => (
          <li key={s.category}>
            <span className="swatch" style={{ background: CATEGORY_COLOURS[s.category] }} />
            <span className="legend-name">{s.category}</span>
            <span className="legend-value">{inr(s.total)}</span>
            <span className="legend-share">{Math.round(s.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
