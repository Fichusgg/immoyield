'use client';

import * as React from 'react';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { brl } from './format';
import { cn } from '@/lib/utils';

interface Slice {
  name: string;
  value: number;
}

interface DataSet {
  key: string;
  label: string;
  slices: Slice[];
}

interface Props {
  /** One or more datasets. If more than one, a tab toggle is rendered. */
  datasets: DataSet[];
  /** Optional centered total label/value drawn over the donut. */
  totalLabel?: string;
  className?: string;
}

const PALETTE = ['#4A7C59', '#3D6B4F', '#A8C5B2', '#D0CEC8', '#9CA3AF', '#6B7280'];

export function DonutChart({ datasets, totalLabel, className }: Props) {
  const [activeKey, setActiveKey] = React.useState(datasets[0]?.key ?? '');
  const active = datasets.find((d) => d.key === activeKey) ?? datasets[0];
  const total = active?.slices.reduce((s, x) => s + x.value, 0) ?? 0;

  return (
    <div className={cn('flex flex-col', className)}>
      {datasets.length > 1 && (
        <div className="mb-3 flex gap-1 self-start rounded-md bg-[#F0EFEB] p-1">
          {datasets.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setActiveKey(d.key)}
              className={cn(
                'rounded px-3 py-1 text-[11px] font-medium transition-colors',
                activeKey === d.key
                  ? 'bg-[#FAFAF8] text-[#1C2B20] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#6B7280]'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={active?.slices}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="92%"
              paddingAngle={1}
              stroke="#FAFAF8"
              strokeWidth={2}
            >
              {active?.slices.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              cursor={false}
              content={({ active: a, payload }) => {
                if (!a || !payload?.length) return null;
                const p = payload[0];
                const v = (p.value as number) ?? 0;
                const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                return (
                  <div
                    className="border border-[#E2E0DA] bg-[#FAFAF8] px-3 py-2"
                    style={{ boxShadow: '0 10px 30px rgba(28,43,32,0.08)' }}
                  >
                    <p className="text-xs font-medium text-[#1C2B20]">{p.name}</p>
                    <p className="font-mono text-xs text-[#6B7280]">
                      {brl(v)} · {pct}%
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {totalLabel && (
            <p className="text-[10px] font-semibold tracking-[0.12em] text-[#9CA3AF] uppercase">
              {totalLabel}
            </p>
          )}
          <p className="font-mono text-lg font-bold text-[#1C2B20] tabular-nums">{brl(total)}</p>
        </div>
      </div>

      {/* Legend */}
      <ul className="mt-3 space-y-1.5">
        {active?.slices.map((s, i) => {
          const p = total > 0 ? ((s.value / total) * 100).toFixed(1) : '0';
          return (
            <li key={s.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-[#6B7280]">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                {s.name}
              </span>
              <span className="font-mono tabular-nums text-[#1C2B20]">
                {brl(s.value)} <span className="ml-1 text-[#9CA3AF]">{p}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
