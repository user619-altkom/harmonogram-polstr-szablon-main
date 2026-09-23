# Harmonogram na POLSTR, szablon startowy

Szablon repozytorium na projekt końcowy szkolenia z AI w cyklu wytwarzania oprogramowania (dzień 3). Cel projektu: kalkulator harmonogramu spłat kredytu hipotecznego ze zmiennym oprocentowaniem na POLSTR 1M lub WIBOR 3M, budowany od zera w TypeScript i Next.js metodyką spec-kit z GitHub Copilotem, wdrażany z GitHuba na Vercel.

Repozytorium zawiera zainicjalizowany spec-kit dla Copilota (skrypty PowerShell), szkielet Next.js (App Router, TypeScript, Tailwind) z pustym modułem domenowym i testami vitest, dane przykładowe wskaźników, workflow GitHub Actions, reguły review dla Copilota i skrypty rutyny review przez Copilot CLI. Nie zawiera implementacji, ta powstaje w trakcie dnia.

Dokumenty do przeczytania na start:

- [BRIEF.md](BRIEF.md), zgłoszenie z biznesu i zakres MVP
- [KARTA.md](KARTA.md), karta uczestnika z bramkami, komendami, torem Claude Design, krokami Vercel i zasadami awaryjnymi
- [AGENTS.md](AGENTS.md), konwencje projektu dla agenta

## Struktura

- `src/domena/harmonogram.ts`: czyste funkcje obliczeniowe, bez React i bez I/O. Tu trafia cała logika.
- `src/dane/wskazniki.ts`: serie wskaźników zaimportowane z `dane/*.json`.
- `app/api/harmonogram/route.ts`: `GET /api/harmonogram`, parsuje parametry z query string, woła domenę, zwraca JSON. Na razie odpowiada 501 „nie zaimplementowano” z przykładem parametrów.
- `app/page.tsx`: strona główna. Tu wchodzi ekran z Claude Design.
- `tests/`: testy vitest domeny i danych.
- `dane/`: serie POLSTR 1M i WIBOR 3M.
- `.github/`, `.specify/`: skille spec-kit, instrukcje review, workflow Actions.
- `skrypty/`: rutyna review przez Copilot CLI.

## Wymagania

- Windows 10 lub 11 z PowerShell 5.1 (wystarcza, pwsh nie jest potrzebny) albo Git Bash. macOS i Linux też działają.
- Node.js 22 do 26 (`node --version`)
- git
- GitHub CLI `gh` (`gh --version`). Jeśli brak: `winget install GitHub.cli`, potem zamknij terminal i otwórz nowy.
- VS Code z rozszerzeniem GitHub Copilot
- konto na github.com; konto Vercel powstaje w kroku 7 przez logowanie GitHubem
- opcjonalnie GitHub Copilot CLI (`copilot --version`) do rutyny review z terminala

Python ani uv nie są potrzebne, spec-kit jest już zainicjalizowany w repozytorium.

## Jak zacząć

W PowerShell wpisuj komendy pojedynczo, jedna na linię (PowerShell 5.1 odrzuca `&&`). W Git Bash możesz łączyć `&&`.

1. Sprawdź `gh` i zaloguj się na github.com (HTTPS, logowanie w przeglądarce), potem podłącz gita do tego logowania:

   ```
   gh --version
   gh auth login
   gh auth setup-git
   ```

2. Sklonuj szablon. Zdalne repo szablonu nazywa się `szablon`, żeby nazwa `origin` została dla Twojego repo:

   ```
   git clone --origin szablon https://github.com/agentGreg/harmonogram-polstr-szablon.git harmonogram-polstr
   cd harmonogram-polstr
   ```

3. Utwórz swoje prywatne repo na github.com i wypchnij do niego kod:

   ```
   gh repo create harmonogram-polstr --private --source . --remote origin --push
   ```

4. Sprawdź workflow. Po chwili „Testy” powinien być zielony. Jeśli Actions są wyłączone w organizacji, pomiń ten krok:

   ```
   gh run list
   ```

5. Zainstaluj zależności (Next.js waży więcej niż poprzednie szablony, `npm install` trwa 1 do 3 minut), uruchom testy i sprawdzenie typów:

   ```
   npm install
   npm test
   npm run typecheck
   ```

6. Uruchom aplikację lokalnie i sprawdź w przeglądarce http://localhost:3000 oraz http://localhost:3000/api/harmonogram (501 „nie zaimplementowano” jest oczekiwane). Zatrzymaj serwer klawiszami Ctrl+C:

   ```
   npm run dev
   ```

7. Załóż konto Vercel logowaniem GitHubem, zaimportuj repo `harmonogram-polstr` i zrób pierwszy deploy. Pięć kroków z ekranami jest w [KARTA.md](KARTA.md), sekcja „Vercel krok po kroku”. Od tej chwili push do `main` to produkcja, a każdy PR ma adres podglądu.

8. Utwórz gałąź na artefakty spec-kit i przejdź do [KARTA.md](KARTA.md):

   ```
   git switch -c spec-mvp
   ```

Zapas, gdyby `gh repo create` odmówił: utwórz puste prywatne repo `harmonogram-polstr` przez www (bez README, bez .gitignore, bez licencji), potem:

```
git remote add origin https://github.com/<twoj-login>/harmonogram-polstr.git
git push -u origin main
```

## Komendy npm

| Komenda | Co robi |
| --- | --- |
| `npm run dev` | serwer deweloperski Next.js na http://localhost:3000 |
| `npm run build` | produkcyjny build Next.js, ten sam, który uruchamia Vercel |
| `npm start` | uruchomienie zbudowanej aplikacji |
| `npm test` | jednorazowe uruchomienie testów vitest |
| `npm run test:watch` | testy w trybie obserwowania plików |
| `npm run typecheck` | `tsc --noEmit`, sprawdzenie typów bez kompilacji |
| `npm run lint` | ESLint z konfiguracją Next.js |

## Dane

Katalog `dane/` zawiera dwie serie wskaźników w formacie JSON: `polstr-1m.json` (miesięcznie, od lipca 2025) i `wibor-3m.json` (kwartalnie, od 2020). Każdy plik ma pola `wskaznik`, `opis`, `uwaga`, `zrodla` i `wartosci` z listą wpisów `{ "od": "YYYY-MM-DD", "stopa": 0.0355 }`. Stopa jest ułamkiem, nie procentem. Wpis obowiązuje od dnia `od` do dnia przed kolejnym wpisem, a po ostatnim wpisie serii obowiązuje ostatnia znana wartość. Wartości są ilustracyjne i przybliżone, szczegóły w polu `uwaga`. Nie edytuj tych plików w trakcie ćwiczenia, testy je wczytują. W kodzie serie są dostępne przez `seriaWskaznika()` z `src/dane/wskazniki.ts`.

## Spec-kit

Komendy wywołujesz w czacie Copilota w VS Code (tryb Agent) albo w Copilot CLI. Każda komenda to skill z katalogu `.github/skills/speckit-*/SKILL.md`, skrypty pomocnicze leżą w `.specify/scripts/powershell/`, szablony artefaktów w `.specify/templates/`.

Ścieżka podstawowa, w tej kolejności:

- `/speckit-constitution`: spisuje zasady projektu do `.specify/memory/constitution.md`.
- `/speckit-specify`: tworzy specyfikację funkcji w `specs/001-<nazwa>/spec.md` na podstawie opisu w języku naturalnym.
- `/speckit-plan`: tworzy plan techniczny `plan.md` obok specyfikacji.
- `/speckit-tasks`: rozbija plan na listę zadań `tasks.md` z podziałem na fazy.
- `/speckit-implement`: wykonuje zadania z `tasks.md`. W tym projekcie po kilka faz na raz, szczegóły w KARTA.md.
- `/speckit-converge`: porównuje kod z artefaktami i dopisuje brakujące zadania.

Komendy opcjonalne, jeśli zostanie czas:

- `/speckit-clarify`: zadaje pytania doprecyzowujące przed planem.
- `/speckit-analyze`: sprawdza spójność spec, plan i tasks przed implementacją.
- `/speckit-checklist`: generuje checklistę jakości wymagań.
- `/speckit-taskstoissues`: zamienia zadania na issues w GitHubie.

Jeśli PowerShell odmówi uruchomienia skryptów `.ps1`, wykonaj raz: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. Jeśli i to polecenie jest zablokowane, uruchamiaj skrypty przez `powershell -ExecutionPolicy Bypass -File skrypty\review-pr.ps1 <numer PR>`.

## Review

Copilot code review czyta `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` i `AGENTS.md` z gałęzi PR. Reguły review dla plików `.ts` i `.tsx` są w `.github/instructions/review.instructions.md`, dopisuj tam własne. Skrypty `skrypty/review-pr.sh`, `skrypty/review-pr.ps1` (GitHub) i `skrypty/review-mr.ps1` (GitLab) robią to samo z terminala przez Copilot CLI. Tryb na sucho (`--dry-run` w bash, `-DryRun` w PowerShell) pobiera diff i robi review, ale zamiast publikować komentarz wypisuje go na ekran i zapisuje do `.work/review/review-<numer>.md`, co pozwala przećwiczyć rutynę na publicznym PR prowadzącego: `.\skrypty\review-pr.ps1 agentGreg/harmonogram-polstr-szablon 1 -DryRun`.

## Wydanie

Produkcja działa na Vercel i buduje się z GitHuba tym samym `npm run build`, który uruchamia workflow Actions. Push do `main` to nowa wersja produkcyjna, każdy PR ma własny adres podglądu w komentarzu bota Vercel. Kroki i zasada awaryjna w [KARTA.md](KARTA.md).

## Licencja

MIT, szczegóły w [LICENSE](LICENSE).
