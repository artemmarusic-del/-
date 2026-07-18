import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlucoseReading } from "../types";

export default function GlucoseChart({
  readings,
  targetMin,
  targetMax,
}: {
  readings: GlucoseReading[];
  targetMin: number;
  targetMax: number;
}) {
  const data = [...readings]
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .map((r) => ({
      time: new Date(r.measuredAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      value: r.value,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-slate-400">
        Пока нет измерений глюкозы за этот период
      </div>
    );
  }

  const maxValue = Math.max(targetMax + 2, ...data.map((d) => d.value));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={30} />
        <YAxis domain={[0, Math.ceil(maxValue)]} tick={{ fontSize: 11 }} width={30} />
        <ReferenceArea y1={targetMin} y2={targetMax} fill="#2b9c7c" fillOpacity={0.12} />
        <Tooltip
          formatter={(value: number) => [`${value} ммоль/л`, "Глюкоза"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Line type="monotone" dataKey="value" stroke="#1e7d64" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
