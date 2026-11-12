'use client';
import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TableRegion } from './shared';
export interface ChartPoint {
  label: string;
  value: number;
}
export function TrendChart({
  data,
  label,
  unit = '',
  kind = 'area',
}: {
  data: ChartPoint[];
  label: string;
  unit?: string;
  kind?: 'area' | 'bar' | 'line';
}) {
  const id = useId().replace(/:/g, '');
  const children = (
    <>
      <CartesianGrid vertical={false} stroke="#E5E9E1" strokeDasharray="3 5" />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tick={{ fill: '#53675E', fontSize: 11 }}
        dy={8}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={38}
        tick={{ fill: '#53675E', fontSize: 11 }}
        domain={kind === 'line' ? ['auto', 'auto'] : [0, 'auto']}
        allowDecimals={unit !== 'sessões'}
      />
      <Tooltip
        contentStyle={{ borderRadius: 8, border: '1px solid #D7DED2', fontSize: 12 }}
        formatter={(value) => [`${value} ${unit}`, label]}
      />
    </>
  );
  return (
    <div className="chart-block">
      <div
        className="chart"
        role="img"
        aria-label={`${label}. ${data.length} pontos; valores disponíveis na tabela abaixo.`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {kind === 'bar' ? (
            <BarChart data={data} margin={{ top: 12, right: 8, bottom: 12, left: 0 }}>
              {children}
              <Bar
                dataKey="value"
                fill="#172C29"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                isAnimationActive={false}
              />
            </BarChart>
          ) : kind === 'line' ? (
            <LineChart data={data} margin={{ top: 12, right: 12, bottom: 12, left: 0 }}>
              {children}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#236349"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#236349' }}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 12, left: 0 }}>
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9F078" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#C9F078" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              {children}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#236349"
                strokeWidth={2.5}
                fill={`url(#${id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="chart-details">
        <summary>Ver dados em tabela</summary>
        <TableRegion label={`Dados: ${label}`}>
          <table className="data-table">
            <caption className="sr-only">{label}</caption>
            <thead>
              <tr>
                <th scope="col">Período</th>
                <th scope="col">
                  {label} {unit && `(${unit})`}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((point, i) => (
                <tr key={`${point.label}-${i}`}>
                  <td>{point.label}</td>
                  <td>{point.value.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableRegion>
      </details>
    </div>
  );
}
