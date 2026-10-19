import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "session_id", "project_name", "case_number", "client_name", "description",
  "billable", "source", "start_local", "end_local", "session_date",
  "start_hour", "weekday", "duration_sec", "duration_hours",
] as const;

const cell = (v: unknown) => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /export?from=2026-01-01&to=2026-12-31 (both optional, on session_date)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rows = await sql`
    select session_id, project_name, case_number, client_name, description,
           billable, source,
           to_char(start_local, 'YYYY-MM-DD HH24:MI:SS') as start_local,
           to_char(end_local, 'YYYY-MM-DD HH24:MI:SS') as end_local,
           to_char(session_date, 'YYYY-MM-DD') as session_date,
           start_hour, weekday, duration_sec, duration_hours
    from v_sessions
    where (${from}::date is null or session_date >= ${from}::date)
      and (${to}::date is null or session_date <= ${to}::date)
    order by start_local`;
  const csv = [
    COLUMNS.join(","),
    ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(",")),
  ].join("\n");
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lextrack-sessions.csv"',
    },
  });
}
