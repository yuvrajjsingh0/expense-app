import type { MonthlyTotal } from "../../src/analytics";
import { inr } from "../format";

interface BarsProps {
  months: readonly MonthlyTotal[];
}

/** Grouped monthly debit and credit bars, drawn as plain SVG. */
export function Bars({ months }: BarsProps) {
  if (months.length === 0) return <p className="muted">No dated transactions yet.</p>;

  const width = 520;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 28, left: 48 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(...months.flatMap((m) => [m.debit, m.credit]), 1);
  const groupW = plotW / months.length;
  const barW = Math.min(28, groupW / 3);

  const y = (value: number) => pad.top + plotH - (value / max) * plotH;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" className="bars">
      {/* y axis gridlines */}
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={pad.top + plotH * (1 - f)}
            y2={pad.top + plotH * (1 - f)}
            stroke="#1e293b"
          />
          <text x={8} y={pad.top + plotH * (1 - f) + 4} className="axis">
            {inr(max * f)}
          </text>
        </g>
      ))}
      {months.map((m, i) => {
        const x = pad.left + i * groupW + groupW / 2;
        return (
          <g key={m.month}>
            <rect
              x={x - barW - 2}
              y={y(m.debit)}
              width={barW}
              height={pad.top + plotH - y(m.debit)}
              fill="#f97316"
              rx={3}
            >
              <title>{`Spent ${inr(m.debit)}`}</title>
            </rect>
            <rect
              x={x + 2}
              y={y(m.credit)}
              width={barW}
              height={pad.top + plotH - y(m.credit)}
              fill="#22c55e"
              rx={3}
            >
              <title>{`Received ${inr(m.credit)}`}</title>
            </rect>
            <text x={x} y={height - 10} textAnchor="middle" className="axis">
              {m.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
