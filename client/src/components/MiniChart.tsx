import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtPrice } from "../lib/format";
import { TOKENS } from "../lib/palette";
import type { Candle } from "../lib/types";

/** Area sparkline / mini price chart with crosshair tooltip. */
export function MiniChart({
  candles, height = 120, positive,
}: { candles: Candle[]; height?: number; positive?: boolean }) {
  const data = candles.map((c) => ({ t: c.t, price: c.c }));
  const up = positive ?? (data.length > 1 && data[data.length - 1].price >= data[0].price);
  const color = up ? TOKENS.bull : TOKENS.bear;
  const id = `mini-${color.replace("#", "")}`;
  const lo = Math.min(...data.map((d) => d.price));
  const hi = Math.max(...data.map((d) => d.price));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="t" hide />
        <YAxis domain={[lo, hi]} hide />
        <Tooltip
          contentStyle={{
            background: TOKENS.card, border: `1px solid ${TOKENS.grid}`, borderRadius: 8, fontSize: 11,
          }}
          labelStyle={{ color: TOKENS.muted }}
          itemStyle={{ color: TOKENS.ink }}
          labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          formatter={(v) => [fmtPrice(Number(v)), "Price"]}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
