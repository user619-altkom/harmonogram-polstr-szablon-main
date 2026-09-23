# Implementation Plan: Harmonogram spłat kredytu hipotecznego (POLSTR/WIBOR)

**Branch**: `001-harmonogram-splat` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-harmonogram-splat/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Kalkulator harmonogramu spłat kredytu hipotecznego ze zmiennym oprocentowaniem opartym na POLSTR 1M
albo WIBOR 3M, z ratami równymi albo malejącymi i obsługą nadpłat. Logika liczy oprocentowanie
okresu jako wartość wskaźnika plus marża, aktualizuje wskaźnik zgodnie z jego częstotliwością i
udostępnia wynik przez `GET /api/harmonogram`; ekran www pobiera ten wynik i pokazuje go użytkownikowi.
Podejście techniczne: rozbudowa istniejącego szkieletu Next.js App Router bez nowych zależności —
cała logika w `src/domena/harmonogram.ts` (czyste funkcje), dane wskaźników w `src/dane/wskazniki.ts`,
route handler tylko parsuje i woła domenę, a `app/page.tsx` to gotowy komponent React z Claude Design
podłączony do tego samego endpointu.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict), Next.js 16 App Router, React 19

**Primary Dependencies**: brak nowych — tylko `next`, `react`, `react-dom` i Tailwind już obecne w repo

**Storage**: pliki `dane/polstr-1m.json` i `dane/wibor-3m.json`, wczytywane przez import JSON; brak bazy danych

**Testing**: vitest, wyłącznie dla `src/domena/` i `src/dane/` (`tests/*.test.ts`)

**Target Platform**: przeglądarka (ekran) + Vercel serverless/edge (route handler Next.js)

**Project Type**: aplikacja webowa, pojedynczy projekt Next.js (frontend i API w jednym repo)

**Performance Goals**: obliczenie harmonogramu do 360 rat (30 lat spłaty miesięcznej) w czasie
odpowiedzi pojedynczego żądania HTTP, bez zauważalnego opóźnienia dla użytkownika (poniżej 1 s)

**Constraints**: brak nowych zależności; kwoty w groszach jako liczby całkowite z jednym miejscem
zaokrąglania; domena bez I/O i bez odczytu czasu systemowego; route handler bez logiki obliczeniowej

**Scale/Scope**: pojedynczy użytkownik na żądanie (kalkulator, nie system wieloużytkownikowy);
zakres z `spec.md`: 5 historii użytkownika (rata równa, rata malejąca, zmiana wskaźnika, nadpłata,
ekran www)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Architektura Next.js z czystą domeną**: PASS — logika obliczeniowa zostaje w
  `src/domena/harmonogram.ts` jako czyste funkcje, dane wskaźników w `src/dane/wskazniki.ts`, route
  handler `app/api/harmonogram/route.ts` pozostaje cienki (parsuje, woła domenę, zwraca JSON).
- **II. TypeScript strict bez ucieczek**: PASS — rozszerzenie istniejących typów (`ParametryKredytu`,
  nowe typy dla nadpłat i wiersza harmonogramu) bez `any` i bez `@ts-ignore`.
- **III. Test-First (NON-NEGOTIABLE)**: PASS — `tasks.md` (faza `/speckit-tasks`) planuje testy
  vitest w `tests/` przed implementacją każdej historii, z liczbą kontrolną z BRIEF.md jako pierwszym
  testem.
- **IV. Tailwind jako jedyna warstwa stylów**: PASS — ekran (`app/page.tsx`) to dostarczony komponent
  React z Tailwind, bez bibliotek UI.
- **V. Precyzja kwot pieniężnych**: PASS — kwoty w groszach jako liczby całkowite, zaokrąglanie do
  grosza w jednym miejscu (patrz `research.md`, decyzja o zaokrąglaniu i racie wyrównującej).
- **VI. Język polski w dokumentacji i commitach**: PASS — ten plan i pozostałe artefakty są po
  polsku, nazwy domenowe pozostają pełne (np. `rataKapitalowa`, nie skróty).
- **Ograniczenia techniczne i zależności**: PASS — brak nowych zależności npm w tym planie.

Brak naruszeń — sekcja Complexity Tracking pozostaje pusta.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
app/
├── api/harmonogram/route.ts   # route handler: parsuje query string, woła domenę, zwraca JSON
├── page.tsx                   # ekran: gotowy komponent React ('use client') z Claude Design
└── layout.tsx                 # istniejący layout, bez zmian logiki

src/
├── domena/harmonogram.ts      # czyste funkcje: policzHarmonogram i pomocnicze, bez React i I/O
└── dane/wskazniki.ts          # seriaWskaznika(...) z dane/*.json, bez zmian kontraktu

dane/
├── polstr-1m.json             # dane wejściowe, nieedytowane w tej fazie
└── wibor-3m.json              # dane wejściowe, nieedytowane w tej fazie

tests/
└── *.test.ts                  # testy vitest domeny i danych, ekran bez testów jednostkowych
```

**Structure Decision**: Zachowujemy istniejącą strukturę pojedynczego projektu Next.js App Router —
brak osobnego katalogu `backend/`/`frontend/`, bo API (`app/api/harmonogram/route.ts`) i ekran
(`app/page.tsx`) żyją w tym samym projekcie Next.js. Cała nowa logika trafia do już istniejących
plików `src/domena/harmonogram.ts` (rozszerzenie typów i implementacja `policzHarmonogram`) i
`src/dane/wskazniki.ts` (bez zmian kontraktu, `seriaWskaznika` już istnieje).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Brak naruszeń konstytucji w tym planie — tabela pozostaje pusta.
