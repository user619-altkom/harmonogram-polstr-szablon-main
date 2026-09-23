<!--
Sync Impact Report
Wersja: brak → 1.0.0
Typ zmiany: MAJOR (pierwsza ratyfikacja, ustanowienie wszystkich zasad)
Zmodyfikowane zasady: brak (nowy dokument)
Dodane sekcje:
  - I. Architektura Next.js z czystą domeną
  - II. TypeScript strict bez ucieczek
  - III. Test-First (NON-NEGOTIABLE)
  - IV. Tailwind jako jedyna warstwa stylów
  - V. Precyzja kwot pieniężnych
  - VI. Język polski w dokumentacji i commitach
  - Ograniczenia techniczne i zależności
  - Proces pracy i przeglądu
  - Governance
Usunięte sekcje: brak
Odroczone TODO: brak
Uwaga: ta notatka jest materiałem roboczym do przeglądu i powinna zostać usunięta przed commitem finalnej wersji konstytucji.
-->

# Harmonogram POLSTR Constitution

## Core Principles

### I. Architektura Next.js z czystą domeną
Projekt używa Next.js App Router z TypeScript. Cała logika obliczeniowa (harmonogram spłat,
raty, oprocentowanie) MUSI mieszkać w `src/domena/` jako czyste funkcje: bez importów React,
bez wywołań I/O, bez odczytu czasu systemowego (`Date.now()` i podobne). Dane wskaźników
MUSZĄ być wczytywane w `src/dane/` z plików `dane/*.json` przez import. Route handlery
(np. `app/api/harmonogram/route.ts`) MUSZĄ pozostać cienkie: parsują parametry, wołają
domenę, zwracają JSON, bez własnej logiki obliczeniowej. Rationale: rozdzielenie czystej
logiki od warstwy sieciowej i UI pozwala testować domenę bez frameworka i bez mocków I/O.

### II. TypeScript strict bez ucieczek
Kod MUSI być zgodny z `tsconfig.json` w trybie strict. Użycie `any` oraz `@ts-ignore` jest
zabronione. Jeśli typowanie wydaje się niemożliwe bez nich, należy przeprojektować typ lub
zapytać, zanim zostanie dodany wyjątek. Rationale: silne typowanie zapobiega błędom w
obliczeniach finansowych, gdzie pomyłka typu jest kosztowna.

### III. Test-First (NON-NEGOTIABLE)
Dla logiki domenowej i danych obowiązuje TDD: najpierw pisany jest test w `tests/` z
oczekiwanym wynikiem (liczbą kontrolną), dopiero potem implementacja. Test MUSI czerwienić
się przed napisaniem kodu. Testy vitest obejmują wyłącznie `src/domena/` i `src/dane/` — nie
testujemy przez nie UI ani route handlerów. Każda zmiana logiki obliczeń MUSI mieć
towarzyszący test z liczbą kontrolną. Rationale: obliczenia finansowe wymagają
weryfikowalnej poprawności, a TDD wymusza tę weryfikację przed napisaniem kodu.

### IV. Tailwind jako jedyna warstwa stylów
Ekrany (`app/page.tsx` i pochodne) używają wyłącznie Tailwind do stylowania. Nie wprowadza
się bibliotek komponentów UI (np. MUI, Chakra, Ant Design). Rationale: szablon zakłada
minimalny, kontrolowany zestaw zależności frontendowych.

### V. Precyzja kwot pieniężnych
Kwoty pieniężne MUSZĄ być reprezentowane w groszach jako liczby całkowite, albo — jeśli
używane są liczby zmiennoprzecinkowe — miejsce i sposób zaokrąglania MUSI być jawnie
udokumentowane i zaokrąglanie MUSI następować w dokładnie jednym miejscu w kodzie.
Rationale: rozproszone zaokrąglenia w obliczeniach finansowych prowadzą do niespójnych
wyników między ratami.

### VI. Język polski w dokumentacji i commitach
Dokumenty, komentarze w kodzie, nazwy domenowe i komunikaty commitów MUSZĄ być po polsku,
bez skracania nazw domenowych (np. `rataKapitalowa`, nie `rk`). Komunikaty commitów są
jednolinijkowe i opisowe. Rationale: spójność językowa ułatwia review i utrzymanie w
zespole posługującym się polskim jako językiem roboczym.

## Ograniczenia techniczne i zależności

Nie dodaje się nowych zależności (pakietów npm) bez wyraźnego uzasadnienia. Jeśli zależność
wydaje się potrzebna, PR MUSI zawierać jednozdaniowe uzasadnienie, a decyzja o jej dodaniu
czeka na potwierdzenie przed scaleniem. Pliki w `dane/` nie są edytowane bez wyraźnego
polecenia, ponieważ testy wczytują je jako dane referencyjne. Katalogi `.specify/` i
`.github/skills/` nie są edytowane poza tym, co robią oficjalne skille spec-kit.

## Proces pracy i przeglądu

Praca odbywa się w małych commitach, jeden PR na fazę zdefiniowaną w `tasks.md`. Po
zakończeniu fazy praca zatrzymuje się do przeglądu diffu; kolejna faza nie zaczyna się bez
wyraźnego polecenia. Przed zgłoszeniem gotowości PR-u MUSZĄ przejść lokalnie: `npm test`,
`npm run typecheck` i `npm run build` — środowisko wdrożeniowe (Vercel) buduje produkcję tym
samym `next build`, więc czerwony build lokalny oznacza czerwony deploy. Reguły review dla
plików `.ts`/`.tsx` są zdefiniowane w `.github/instructions/review.instructions.md` i
obowiązują przy każdym code review.

## Governance

Ta konstytucja ma pierwszeństwo przed innymi praktykami i szablonami w tym repozytorium.
Każda poprawka wymaga: opisu zmiany, aktualizacji numeru wersji zgodnie z zasadami
semantycznego wersjonowania poniżej oraz zaktualizowania daty ostatniej zmiany.

Wersjonowanie:
- MAJOR: usunięcie lub redefinicja zasady w sposób niekompatybilny wstecznie.
- MINOR: dodanie nowej zasady lub istotne rozszerzenie wytycznych.
- PATCH: doprecyzowania, poprawki językowe, zmiany niesemantyczne.

Zgodność z konstytucją jest weryfikowana przy każdym code review i przy planowaniu fazy
(`/speckit-plan`, `/speckit-tasks`). Odstępstwa muszą być uzasadnione w PR; w razie
wątpliwości należy zapytać zamiast zgadywać, zgodnie z `AGENTS.md`.

**Version**: 1.0.0 | **Ratified**: 2026-09-23 | **Last Amended**: 2026-09-23
