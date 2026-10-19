# LexTrack: plan aplikacji do śledzenia czasu (w stylu Toggl Track)

Cel v1: jak najprościej mierzyć czas pracy nad sprawami i projektami (start/stop), a dane od pierwszego dnia trzymać tak, żeby Power BI mogło je czytać bez przeróbek.

---

## 1. Zakres MVP (wersja 1)

Tylko to, co potrzebne do codziennego trackowania:

| Funkcja | Opis |
|---|---|
| Logowanie | Jedno konto (Twoje), e-mail + hasło lub magic link. |
| Projekty / sprawy | Dodaj, edytuj, archiwizuj. Pola: nazwa, kolor, klient (opcjonalnie), sygnatura sprawy (opcjonalnie). |
| Klienci | Prosta lista, projekt może mieć klienta. Przydatne w Power BI do grupowania. |
| Timer | Pasek u góry jak w Toggl: opis + wybór projektu + przycisk Start/Stop. Zawsze tylko jeden działający timer. |
| Wpisy ręczne | Dodanie/edycja sesji z godziną startu i końca (gdy zapomnisz włączyć timer). |
| Lista sesji | Widok dnia/tygodnia z sumą czasu na dzień, edycja i usuwanie wpisów. |
| Eksport CSV | Przycisk „Pobierz CSV” z zakresem dat. Zapasowa droga do Power BI. |

Świadomie poza MVP: tagi, raporty w aplikacji, stawki i fakturowanie, zespoły, aplikacja mobilna, integracje z kalendarzem. Statystyki robisz w Power BI, więc aplikacja nie musi na start mieć własnych wykresów.

---

## 2. Roadmapa

**Faza 0: przygotowanie (1–2 wieczory)**
- Repozytorium na GitHubie, projekt Next.js, baza w Supabase, deploy na Vercel.
- Schemat bazy (sekcja 4) i widok `v_sessions` dla Power BI.

**Faza 1: MVP (ok. 1–2 tygodnie po godzinach)**
- Projekty, klienci, timer, wpisy ręczne, lista sesji, eksport CSV.
- Pierwsze połączenie Power BI Desktop z bazą i prosty raport: czas na projekt, czas na dzień.

**Faza 2: wygoda**
- Tagi (np. „rozprawa”, „pisma”, „research”), wznowienie ostatniego wpisu jednym kliknięciem.
- Skróty klawiszowe, aplikacja jako PWA (ikona na telefonie, działa w przeglądarce mobilnej).
- Pole „billable” (do rozliczenia z klientem) i notatki do sesji.

**Faza 3: raporty i rozliczenia**
- Proste podsumowania w samej aplikacji (tydzień/miesiąc).
- Stawki godzinowe per klient/projekt, zestawienie do faktury (PDF/CSV).
- Cele tygodniowe (np. limit godzin na sprawę).

**Faza 4: opcjonalnie**
- Integracja z Google Calendar/Outlook, przypomnienia o niewłączonym timerze.
- API REST/OData do bezpośredniego zasilania Power BI, jeśli baza miałaby być niedostępna z zewnątrz.

---

## 3. Technologie (rekomendacja)

| Warstwa | Wybór | Dlaczego |
|---|---|---|
| Frontend + backend | **Next.js (TypeScript)** | Jeden projekt na interfejs i API, ogromna liczba poradników, łatwy deploy. |
| UI | **Tailwind CSS + shadcn/ui** | Szybko daje czysty wygląd zbliżony do Toggl, gotowe komponenty (dialogi, listy, date pickery). |
| Baza danych | **PostgreSQL w Supabase** (plan darmowy) | Power BI ma wbudowany konektor PostgreSQL, więc raporty czytają dane bezpośrednio. Supabase daje też logowanie i panel do podglądu tabel. |
| Dostęp do bazy | **Drizzle ORM** (lub Prisma) | Typowany schemat i migracje w kodzie. |
| Logowanie | **Supabase Auth** | Gotowe, bez pisania własnego systemu kont. |
| Hosting | **Vercel** (darmowy) | Deploy po każdym pushu na GitHub. |
| Analityka | **Power BI Desktop** | Łączy się z Postgres (Pobierz dane → Baza danych PostgreSQL) albo z CSV. |

Alternatywa, jeśli wolisz mniej usług: Next.js + Postgres w Neon + Auth.js. Odradzam SQLite, bo Power BI wymaga do niego dodatkowego sterownika ODBC i pliku lokalnie.

---

## 4. Model danych

Zasady, które ułatwią Power BI:
- Czas zapisany zawsze w **UTC** (`timestamptz`), konwersja na czas polski w widoku.
- Jedna tabela faktów (sesje) i małe tabele wymiarów (projekty, klienci, tagi), czyli gotowy **model gwiazdy**.
- Czas trwania liczony w bazie, żeby nie liczyć go w DAX.

### Tabele

```sql
create table clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  name        text not null,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  client_id    uuid references clients(id),
  name         text not null,
  case_number  text,                 -- sygnatura sprawy, opcjonalnie
  color        text not null default '#4f46e5',
  billable     boolean not null default false,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table time_entries (           -- jedna sesja = jeden wiersz
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  project_id    uuid references projects(id),   -- null = bez projektu
  description   text,
  started_at    timestamptz not null,
  stopped_at    timestamptz,                    -- null = timer działa
  duration_sec  integer generated always as
                (extract(epoch from (stopped_at - started_at))::int) stored,
  billable      boolean not null default false,
  source        text not null default 'timer',  -- 'timer' | 'manual'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (stopped_at is null or stopped_at > started_at)
);

-- maksymalnie jeden działający timer na użytkownika
create unique index one_running_timer
  on time_entries(user_id) where stopped_at is null;

-- faza 2
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null
);
create table time_entry_tags (
  time_entry_id uuid references time_entries(id) on delete cascade,
  tag_id        uuid references tags(id) on delete cascade,
  primary key (time_entry_id, tag_id)
);
```

### Widok dla Power BI

Power BI czyta ten widok zamiast surowych tabel: same zakończone sesje, czas lokalny i gotowe kolumny do filtrów.

```sql
create view v_sessions as
select
  e.id                                         as session_id,
  e.project_id,
  p.name                                       as project_name,
  p.case_number,
  c.name                                       as client_name,
  e.description,
  e.billable,
  e.source,
  (e.started_at at time zone 'Europe/Warsaw')  as start_local,
  (e.stopped_at at time zone 'Europe/Warsaw')  as end_local,
  (e.started_at at time zone 'Europe/Warsaw')::date as session_date,
  extract(hour from e.started_at at time zone 'Europe/Warsaw')::int as start_hour,
  extract(isodow from e.started_at at time zone 'Europe/Warsaw')::int as weekday,  -- 1 = pon.
  e.duration_sec,
  round(e.duration_sec / 3600.0, 2)            as duration_hours
from time_entries e
left join projects p on p.id = e.project_id
left join clients  c on c.id = p.client_id
where e.stopped_at is not null;
```

Do Power BI warto stworzyć osobnego użytkownika bazy tylko z prawem odczytu (`SELECT` na `v_sessions`, `projects`, `clients`).

---

## 5. Jak podłączyć Power BI

**Droga A: bezpośrednio do bazy (zalecana)**
1. W Supabase: Project Settings → Database → dane połączenia (host, port, nazwa bazy, użytkownik tylko do odczytu).
2. Power BI Desktop → Pobierz dane → Baza danych PostgreSQL → wpisz host i bazę → wybierz `v_sessions`.
3. Tryb **Import** (szybszy, wystarczy przy Twojej skali), odświeżanie przyciskiem „Odśwież”.
4. Utwórz tabelę dat w DAX i połącz ją z `session_date`:
   ```DAX
   Daty = CALENDAR(DATE(2026,1,1), TODAY())
   ```

Uwaga: odświeżanie automatyczne w Power BI Service (w chmurze) dla Postgresa może wymagać bramy danych (on-premises gateway). W Desktop działa od razu.

**Droga B: CSV**
Eksport z aplikacji o tych samych kolumnach co `v_sessions`, zapisany w jednym folderze. W Power BI: Pobierz dane → Folder, wtedy nowe pliki dociągają się przy odświeżeniu.

### Pierwsze miary DAX do nauki
```DAX
Godziny = SUM(v_sessions[duration_hours])
Liczba sesji = COUNTROWS(v_sessions)
Średnia sesja (min) = DIVIDE(SUM(v_sessions[duration_sec]), [Liczba sesji]) / 60
Godziny billable = CALCULATE([Godziny], v_sessions[billable] = TRUE())
Godziny poprz. tydzień = CALCULATE([Godziny], DATEADD(Daty[Date], -7, DAY))
```

Pomysły na raport: godziny per projekt (słupki), godziny per dzień (linia), mapa ciepła dzień tygodnia × godzina startu, udział billable, top 5 spraw w miesiącu.

---

## 6. Następny krok

Założyć repozytorium na GitHubie i podłączyć je do projektu. Wtedy mogę przygotować szkielet Fazy 0 i 1 (Next.js + Supabase + schemat i widok powyżej) jako pull request.
