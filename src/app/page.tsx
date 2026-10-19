import Link from "next/link";
import { RunningTimer } from "@/components/RunningTimer";
import { fmt } from "@/lib/format";
import { listEntries, listProjects, type Entry } from "@/lib/db";
import { addManualEntry, deleteEntry, startTimer, stopTimer } from "./actions";

export const dynamic = "force-dynamic";

const TZ = "Europe/Warsaw";
const dayKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });
const time = (d: Date) =>
  d.toLocaleTimeString("pl-PL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export default async function Home() {
  const [projects, entries] = await Promise.all([listProjects(), listEntries()]);
  const running = entries.find((e) => !e.stopped_at);
  const days = new Map<string, Entry[]>();
  for (const e of entries.filter((e) => e.stopped_at)) {
    const k = dayKey(e.started_at);
    days.set(k, [...(days.get(k) ?? []), e]);
  }

  return (
    <main className="mx-auto max-w-3xl p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">LexTrack</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/projects" className="underline">Projekty</Link>
          <a href="/export" className="underline">Eksport CSV</a>
        </nav>
      </header>

      <section className="rounded-lg border p-4">
        {running ? (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="font-medium">{running.description ?? "(bez opisu)"}</div>
              <div className="text-sm text-gray-500">{running.project_name ?? "Bez projektu"}</div>
            </div>
            <RunningTimer startedAt={running.started_at.toISOString()} />
            <form action={stopTimer}>
              <button className="rounded bg-red-600 px-4 py-2 text-white">Stop</button>
            </form>
          </div>
        ) : (
          <form action={startTimer} className="flex flex-wrap items-center gap-2">
            <input name="description" placeholder="Nad czym pracujesz?"
                   className="min-w-48 flex-1 rounded border px-3 py-2" />
            <select name="project_id" className="rounded border px-3 py-2">
              <option value="">Bez projektu</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button className="rounded bg-indigo-600 px-4 py-2 text-white">Start</button>
          </form>
        )}
      </section>

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">Dodaj wpis ręcznie</summary>
        <form action={addManualEntry} className="mt-3 flex flex-wrap gap-2">
          <input name="description" placeholder="Opis" className="flex-1 rounded border px-3 py-2" />
          <select name="project_id" className="rounded border px-3 py-2">
            <option value="">Bez projektu</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input type="datetime-local" name="started_at" required className="rounded border px-3 py-2" />
          <input type="datetime-local" name="stopped_at" required className="rounded border px-3 py-2" />
          <button className="rounded border px-4 py-2">Dodaj</button>
        </form>
      </details>

      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <div className="mb-1 flex justify-between border-b pb-1 text-sm font-medium">
            <span>{day}</span>
            <span className="font-mono">{fmt(list.reduce((s, e) => s + (e.duration_sec ?? 0), 0))}</span>
          </div>
          <ul className="divide-y">
            {list.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: e.color ?? "#9ca3af" }} />
                <span className="flex-1">
                  {e.description ?? "(bez opisu)"}
                  <span className="ml-2 text-gray-500">{e.project_name ?? "Bez projektu"}</span>
                </span>
                <span className="text-gray-500">{time(e.started_at)}–{time(e.stopped_at!)}</span>
                <span className="w-20 text-right font-mono">{fmt(e.duration_sec ?? 0)}</span>
                <form action={deleteEntry}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-gray-400 hover:text-red-600" aria-label="Usuń">✕</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
