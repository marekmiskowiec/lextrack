# LexTrack

Prosty tracker czasu w stylu Toggl Track do śledzenia spraw i projektów. Dane trzymane są w PostgreSQL w formie przyjaznej dla Power BI. Plan: `plan.md` w folderze projektu.

## Uruchomienie

```bash
cp .env.example .env.local   # uzupełnij DATABASE_URL i APP_PASSWORD
npm install
npm run db:migrate           # tworzy tabele i widok v_sessions
npm run dev
```

Aplikacja jest chroniona hasłem `APP_PASSWORD` (HTTP Basic, dowolny login). W produkcji brak hasła blokuje aplikację.

## Funkcje (MVP)

- Projekty i klienci (`/projects`), archiwizacja
- Timer start/stop (jeden aktywny naraz), wpisy ręczne, lista sesji z sumami dziennymi
- Eksport CSV: `/export?from=2026-01-01&to=2026-12-31`

## Power BI

W Power BI Desktop: Pobierz dane → Baza danych PostgreSQL → widok `v_sessions`.
Zalecany osobny użytkownik bazy tylko do odczytu:

```sql
create role powerbi login password '...';
grant select on v_sessions, projects, clients to powerbi;
```

Kolumny `v_sessions`: `session_id, project_id, project_name, case_number, client_name, description, billable, source, start_local, end_local, session_date, start_hour, weekday, duration_sec, duration_hours` (czas lokalny Europe/Warsaw).
