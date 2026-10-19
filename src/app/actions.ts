"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";

const str = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

export async function startTimer(formData: FormData) {
  const projectId = str(formData.get("project_id"));
  const description = str(formData.get("description"));
  await sql.begin(async (tx) => {
    // stop any running timer first (only one may run at a time)
    await tx`update time_entries set stopped_at = now(), updated_at = now()
             where stopped_at is null`;
    await tx`insert into time_entries (project_id, description, started_at, billable)
             values (${projectId}, ${description}, now(),
                     coalesce((select billable from projects where id = ${projectId}), false))`;
  });
  revalidatePath("/");
}

export async function stopTimer() {
  await sql`update time_entries set stopped_at = now(), updated_at = now()
            where stopped_at is null`;
  revalidatePath("/");
}

export async function addManualEntry(formData: FormData) {
  const start = str(formData.get("started_at"));
  const end = str(formData.get("stopped_at"));
  // datetime-local values are interpreted in the app timezone
  const tz = "Europe/Warsaw";
  if (!start || !end) return;
  const projectId = str(formData.get("project_id"));
  await sql`insert into time_entries (project_id, description, started_at, stopped_at, source, billable)
            values (${projectId}, ${str(formData.get("description"))},
                    (${start}::timestamp at time zone ${tz}),
                    (${end}::timestamp at time zone ${tz}), 'manual',
                    coalesce((select billable from projects where id = ${projectId}), false))`;
  revalidatePath("/");
}

export async function deleteEntry(formData: FormData) {
  await sql`delete from time_entries where id = ${String(formData.get("id"))}`;
  revalidatePath("/");
}

export async function createProject(formData: FormData) {
  const name = str(formData.get("name"));
  if (!name) return;
  const clientName = str(formData.get("client"));
  let clientId: string | null = null;
  if (clientName) {
    const [c] = await sql<{ id: string }[]>`
      select id from clients where lower(name) = lower(${clientName}) limit 1`;
    clientId =
      c?.id ??
      (await sql<{ id: string }[]>`insert into clients (name) values (${clientName}) returning id`)[0].id;
  }
  await sql`insert into projects (name, client_id, case_number, color, billable)
            values (${name}, ${clientId}, ${str(formData.get("case_number"))},
                    ${str(formData.get("color")) ?? "#4f46e5"},
                    ${formData.get("billable") === "on"})`;
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function archiveProject(formData: FormData) {
  await sql`update projects set archived = true where id = ${String(formData.get("id"))}`;
  revalidatePath("/projects");
  revalidatePath("/");
}
