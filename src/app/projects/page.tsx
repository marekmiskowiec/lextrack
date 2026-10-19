import Link from "next/link";
import { listProjects } from "@/lib/db";
import { archiveProject, createProject } from "../actions";

export const dynamic = "force-dynamic";

export default async function Projects() {
  const projects = await listProjects();
  return (
    <main className="mx-auto max-w-3xl p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projekty i sprawy</h1>
        <Link href="/" className="text-sm underline">← Timer</Link>
      </header>

      <form action={createProject} className="flex flex-wrap items-center gap-2 rounded-lg border p-4">
        <input name="name" required placeholder="Nazwa projektu / sprawy" className="min-w-48 flex-1 rounded border px-3 py-2" />
        <input name="client" placeholder="Klient" className="rounded border px-3 py-2" />
        <input name="case_number" placeholder="Sygnatura" className="rounded border px-3 py-2" />
        <input type="color" name="color" defaultValue="#4f46e5" className="h-10 w-12" />
        <label className="text-sm"><input type="checkbox" name="billable" /> płatne</label>
        <button className="rounded bg-indigo-600 px-4 py-2 text-white">Dodaj</button>
      </form>

      <ul className="divide-y">
        {projects.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 font-medium">{p.name}</span>
            <span className="text-gray-500">{[p.client_name, p.case_number].filter(Boolean).join(" · ")}</span>
            <form action={archiveProject}>
              <input type="hidden" name="id" value={p.id} />
              <button className="text-gray-500 underline">Archiwizuj</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
