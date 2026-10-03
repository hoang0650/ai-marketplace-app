import type { HireMilestoneDraft, HireStatus } from '@/api/types';

const DAY = 86_400_000;

export type MilestoneRow = { title: string; amount: string; due: string };

export function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Splits the agreed amount evenly over `count` phases, due dates spread up to the desired deadline. */
export function splitMilestones(
  total: number,
  count: number,
  desiredDeadline: string | null,
  title: (n: number) => string,
): MilestoneRow[] {
  const n = Math.min(10, Math.max(1, count));
  const each = Math.floor((total / n) * 100) / 100;
  const deadline = desiredDeadline ? new Date(desiredDeadline).getTime() : 0;
  const span = deadline > Date.now() + n * DAY ? deadline - Date.now() : n * 7 * DAY;
  return Array.from({ length: n }, (_, i) => ({
    title: title(i + 1),
    amount: String(i === n - 1 ? round2(total - each * (n - 1)) : each),
    due: ymd(new Date(Date.now() + Math.round((span * (i + 1)) / n))),
  }));
}

export function rowsTotal(rows: MilestoneRow[]): number {
  return round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
}

/** Null when a row is incomplete (empty title, non-positive amount or bad date). */
export function toDrafts(rows: MilestoneRow[]): HireMilestoneDraft[] | null {
  const out: HireMilestoneDraft[] = [];
  for (const r of rows) {
    const amount = round2(Number(r.amount));
    if (!r.title.trim() || !(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(r.due.trim())) return null;
    const due = new Date(`${r.due.trim()}T23:59:00`);
    if (Number.isNaN(due.getTime())) return null;
    out.push({ title: r.title.trim(), amount, dueAt: due.toISOString() });
  }
  return out;
}

export function hireStatusColor(
  status: HireStatus | string,
  colors: { tint: string; danger: string; success: string; textSecondary: string },
) {
  if (status === 'completed') return colors.success;
  if (status === 'terminated' || status === 'declined' || status === 'cancelled') return colors.danger;
  if (status === 'active' || status === 'quoted') return colors.tint;
  return colors.textSecondary;
}
