import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL ?? "", { max: 5, prepare: false });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export type Project = {
  id: string;
  name: string;
  color: string;
  case_number: string | null;
  client_name: string | null;
  billable: boolean;
};

export type Entry = {
  id: string;
  project_id: string | null;
  project_name: string | null;
  color: string | null;
  description: string | null;
  started_at: Date;
  stopped_at: Date | null;
  duration_sec: number | null;
};

export async function listProjects(includeArchived = false): Promise<Project[]> {
  return sql<Project[]>`
    select p.id, p.name, p.color, p.case_number, p.billable, c.name as client_name
    from projects p left join clients c on c.id = p.client_id
    where ${includeArchived ? sql`true` : sql`not p.archived`}
    order by p.name`;
}

export async function listEntries(limit = 200): Promise<Entry[]> {
  return sql<Entry[]>`
    select e.id, e.project_id, p.name as project_name, p.color, e.description,
           e.started_at, e.stopped_at, e.duration_sec
    from time_entries e left join projects p on p.id = e.project_id
    order by e.started_at desc limit ${limit}`;
}
