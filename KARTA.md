# Karta uczestnika: Harmonogram na POLSTR

Pracujesz sam, w swoim prywatnym repo, w VS Code z Copilotem (tryb Agent) albo w Copilot CLI. Metodyka: spec-kit. Stos: Next.js, domena w czystym TypeScript, Tailwind, vitest, produkcja na Vercel z GitHuba. Zasada dnia: implementacja faza po fazie, PR na fazę, review przed kolejną fazą. W PowerShell wpisuj komendy pojedynczo, jedna na linię.

## Bramki

### Bramka 0, do 12:10: repo i produkcja działają

- [ ] szablon sklonowany, `gh repo create harmonogram-polstr --private --source . --remote origin --push` wykonane
- [ ] `gh run list` pokazuje zielony workflow „Testy” (jeśli Actions są wyłączone w organizacji, pomiń)
- [ ] lokalnie `npm install`, `npm test`, `npm run typecheck` zielone, `npm run dev` pokazuje szkielet na http://localhost:3000
- [ ] konto Vercel przez „Continue with GitHub”, import repo `harmonogram-polstr`, pierwszy deploy zielony, adres `https://harmonogram-polstr-….vercel.app` pokazuje szkielet
- [ ] sprawdź, że przy tworzeniu PR w www lista Reviewers zawiera Copilota; jeśli nie, powiedz prowadzącemu, użyjesz rutyny `skrypty/review-pr.ps1`

### Bramka 1, do 14:00: artefakty spec-kit i pierwszy PR

- [ ] `.specify/memory/constitution.md` wypełniony
- [ ] `specs/001-*/spec.md`, `plan.md`, `tasks.md` w repo
- [ ] PR #1 z artefaktami, Copilot jako recenzent, komentarz bota Vercel z adresem podglądu, review przeczytane, PR scalony

### Bramka 2, do 15:00: MVP na produkcji

- [ ] implementacja faza po fazie, każda faza w osobnym PR
- [ ] testy zielone lokalnie i w Actions, `npm run build` przechodzi
- [ ] co najmniej jeden PR z implementacją scalony po review Copilota
- [ ] liczba kontrolna z BRIEF.md się zgadza (rata 2 494,72 zł, tolerancja ±0,05 zł)
- [ ] MVP z ekranem scalony do main, `git tag v0.1.0`, potem `git push --tags`
- [ ] produkcja na Vercel pokazuje ekran z wynikiem na liczbie kontrolnej

### Bramka 3, do 15:45: karta zmiany i zaliczenie

- [ ] karta zmiany od prowadzącego wdrożona w kolejności: test, poprawka, PR, review, scalenie
- [ ] `git tag v0.2.0`, potem `git push --tags`, produkcja odświeżona
- [ ] mail do prowadzącego na adres podany na sali, temat „Harmonogram POLSTR: imię i nazwisko”, treść: adres produkcyjny, adres repo, jedno zdanie o tym, co poprawiłeś po review Copilota

## Vercel krok po kroku

1. Wejdź na vercel.com i zaloguj się przez „Continue with GitHub”. Plan Hobby, bez karty. Jeśli Vercel poprosi o weryfikację maila, podaj adres, który możesz odczytać na sali.
2. „Add New Project”.
3. „Import” przy repo `harmonogram-polstr`. Przy pierwszym imporcie Vercel instaluje swoją aplikację na Twoim koncie GitHub, wybierz dostęp tylko do tego repo.
4. „Deploy”. Vercel sam wykrywa Next.js, nic nie zmieniaj w ustawieniach builda.
5. Po 1 do 2 minut dostajesz adres produkcyjny `https://harmonogram-polstr-….vercel.app`. Od teraz push do `main` to produkcja, a każdy PR dostaje komentarz bota z adresem podglądu.

## Komendy spec-kit z przykładowymi promptami

Najpierw gałąź, potem skille: `git switch -c spec-mvp` przed `/speckit-constitution`. Spec-kit w tej wersji nie tworzy gałęzi sam, artefakty trafią do `.specify/memory/` i `specs/001-<nazwa>/`. Prompty wpisujesz w czacie Copilota. Skill widzi pliki repo, więc możesz odwoływać się do BRIEF.md po nazwie. Skille spec-kit zadają do 3 pytań z tabelą opcji: odpowiadaj krótko, wybieraj opcję zgodną z BRIEF; na pytanie o checklistę odpowiedz yes.

`/speckit-constitution` Zasady projektu: Next.js App Router, domena w `src/domena/` w czystym TypeScript bez React i bez I/O, TypeScript strict, testy vitest tylko dla domeny i danych, TDD (najpierw test, potem kod), Tailwind do stylów, brak nowych zależności bez uzasadnienia w PR, kwoty w groszach jako liczby całkowite albo jedna jawna decyzja o miejscu zaokrąglania, dokumenty i komunikaty commitów po polsku.

`/speckit-specify` Wklej pełną treść sekcji „Treść zgłoszenia” i „Zakres MVP” z BRIEF.md, razem z podsekcjami „Ekran” i „Wydanie”. Dopisz: liczba kontrolna z BRIEF.md jest kryterium akceptacji; ekran www to osobna, ostatnia historia użytkownika, jego wygląd dostarczę jako gotowy komponent React.

`/speckit-plan` Next.js App Router, bez nowych zależności. Moduły: domena (`src/domena/`, czyste funkcje, bez I/O), dane (`src/dane/`, serie wskaźników z dane/), route handler `app/api/harmonogram/route.ts` (parsuje query string, woła domenę, zwraca JSON), strona `app/page.tsx` (ekran dostarczony jako eksport z Claude Design, komponent `'use client'`). Testy vitest tylko domeny i danych, w tests/; ekran bez testów jednostkowych.

`/speckit-tasks` Faza Setup ma być pusta, szkielet projektu już istnieje; pierwsza historia to obliczenie harmonogramu rat równych przy stałej stopie, z testem na liczbie kontrolnej z BRIEF; ostatnia historia to ekran w app/page.tsx podłączony do route handlera. Spec-kit generuje w tasks.md Fazę 1 Setup, Fazę 2 Foundational i Fazę 3 z pierwszą historią użytkownika, sprawdź, czy tak wyszło.

Po `/speckit-tasks` otwórz PR #1 z artefaktami:

```
git add -A
git commit -m "spec: konstytucja, specyfikacja, plan, zadania"
git push -u origin spec-mvp
gh pr create --fill --reviewer "@copilot"
```

Review Copilota przychodzi po ok. 3 minutach, zobaczysz je w przeglądarce (`gh pr view --web`), a `gh pr view` pokaże Copilota dopiero po nadejściu review. Na PR z samymi plikami .md Copilot często nie ma uwag i to jest w porządku. Bot Vercel dopisze komentarz z adresem podglądu. Po review: `gh pr merge --squash --delete-branch`, potem `git switch main` i `git pull`.

`/speckit-implement` Wykonaj tylko fazy 1 do 3 z tasks.md, zatrzymaj się i pokaż diff. Po review i scaleniu: „Wykonaj tylko fazę 4 z tasks.md, zatrzymaj się i pokaż diff”, i tak dalej.

## Tor równoległy: ekran w Claude Design (od 14:00)

Czas, gdy agent implementuje fazy 1 do 3, nie jest czasem patrzenia w terminal. Otwórz Claude Design (claude.ai/design) na koncie szkoleniowym, jak w cw00 pierwszego dnia, i zaprojektuj ekran kalkulatora. Prompt do wklejenia:

> Komponent React z Tailwind, jeden plik, bez bibliotek UI: ekran kalkulatora harmonogramu spłat kredytu hipotecznego dla doradcy w oddziale banku. Formularz: kwota kredytu (PLN), liczba rat, data pierwszej raty, marża (pp), wskaźnik (POLSTR 1M albo WIBOR 3M), typ rat (równe albo malejące), lista nadpłat (miesiąc, kwota, tryb: obniż ratę albo skróć okres), przycisk „Policz”. Komponent pobiera dane z GET /api/harmonogram z parametrami formularza w query string (kwota, liczbaRat, marza, wskaznik, typRat, pierwszaRata) i wyświetla pole raty: rata pierwsza i ostatnia, suma odsetek, tabela rat (nr, data, kapitał, odsetki, rata, saldo), przycisk „Eksport CSV” budujący plik w przeglądarce. Kwoty z separatorem tysięcy i dwoma miejscami po przecinku. Styl prosty i czytelny, bez logotypów.

Popraw jedną rzecz po pierwszej wersji, jak w cw00. Wyeksportuj jako komponent React i wklej jako `app/page.tsx` z dyrektywą `'use client'` w pierwszej linii (instrukcja krok po kroku jest w komentarzu na górze tego pliku). Gdy fazy 1 do 3 są scalone, faza 4 to podpięcie ekranu. Prompt dla agenta: „Podłącz wklejony komponent w app/page.tsx do route handlera /api/harmonogram, zachowaj wygląd, nie dodawaj zależności.” Sprawdź w przeglądarce na liczbie kontrolnej z BRIEF.md, potem PR jak przy każdej fazie; adres podglądu z komentarza bota Vercel pokaż koledze obok.

## Komendy git i gh na każdą fazę

Nazwa gałęzi: `faza-<n>-<nazwa>`, np. dla fazy 3:

```
git switch -c faza-3-rowne-raty
git add -A
git commit -m "faza 3: raty równe przy stałej stopie z testem"
git push -u origin faza-3-rowne-raty
gh pr create --fill --reviewer "@copilot"
gh pr view --web
gh pr merge --squash --delete-branch
```

Jeśli `--reviewer "@copilot"` przy tworzeniu nie zadziała: `gh pr edit <numer> --add-reviewer "@copilot"`, a w ostateczności w przeglądarce: PR, panel Reviewers, „Copilot”. Rutyna review z terminala: `.\skrypty\review-pr.ps1 <numer PR>`, tryb na sucho z `-DryRun`.

## Gwiazdki (po MVP, dla chętnych)

- okresowo stała stopa przez 5 lat, potem zmienna (Rekomendacja S),
- rekompensata za nadpłatę z art. 40 ustawy o kredycie hipotecznym,
- składanie dziennych stawek POLSTR wstecz za okres odsetkowy,
- RRSO,
- test E2E przez Playwright MCP na adresie podglądu z PR (jak w cw16b),
- hook pre-commit uruchamiający testy,
- własny skill „odbiór” sprawdzający kryteria odbioru.

## Zasady awaryjne

Zakres: jeśli o 14:45 nie masz zielonych testów, zmniejsz zakres do rat równych bez nadpłat i idź do review z tym, co masz. Mały zakres z review i scaleniem jest lepszy niż duży bez.

Vercel: jeśli do 12:10 nie masz konta albo deployu, pracuj lokalnie na `npm run dev`. O 15:30 zrób repo publicznym komendą `gh repo edit --visibility public --accept-visibility-change-consequences` i wyślij prowadzącemu adres repo. Prowadzący zrobi deploy u siebie przez „Import Third-Party Git Repository”.

## Podgląd z PR za logowaniem

Adresy podglądu z komentarza bota Vercel są w planie Hobby chronione logowaniem do Vercel. Ty je zobaczysz, kolega obok nie. Jeśli chcesz pokazać podgląd innym, wyłącz ochronę raz: w projekcie Vercel Settings, Deployment Protection, Vercel Authentication na „Disabled”. Adres produkcyjny jest publiczny bez zmian. Wzór działającego szkieletu: https://harmonogram-polstr-szablon.vercel.app
