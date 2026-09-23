# Konwencje projektu dla agenta

Ten plik czyta Copilot w czacie, w CLI i w code review. Trzymaj się poniższych zasad bez pytania, a przy wątpliwościach zapytaj zamiast zgadywać.

## Język i komunikacja

- Dokumenty, komentarze w kodzie, nazwy domenowe i komunikaty commitów po polsku, bez skrótów w nazwach (`rataKapitalowa`, nie `rk`).
- Komunikaty commitów jednolinijkowe, opisowe, np. „faza 3: raty równe przy stałej stopie z testem”.
- Odpowiadaj zwięźle. Nie streszczaj tego, co pokazuje diff.

## Kod

- Next.js App Router, TypeScript strict (tsconfig.json), bez `any`, bez `@ts-ignore`.
- Domena w `src/domena/` to czyste funkcje: bez React, bez I/O, bez `Date.now()`. Cała logika obliczeń mieszka tam.
- Dane wskaźników w `src/dane/`, wczytywane z `dane/*.json` przez import JSON.
- Route handler `app/api/harmonogram/route.ts` jest cienki: parsuje parametry z query string, woła domenę, zwraca JSON. Nie liczy.
- Ekran w `app/page.tsx` to komponent `'use client'` z Tailwind, dane pobiera z `/api/harmonogram`. Bez bibliotek UI.
- Kwoty w groszach jako liczby całkowite albo jedna jawna decyzja o miejscu zaokrąglania. Zaokrąglaj w jednym miejscu.
- Testy w vitest, w katalogu `tests/`, tylko dla domeny i danych. Najpierw test, potem implementacja. Każda zmiana logiki obliczeń ma test z liczbą kontrolną.

## Proces

- Małe commity, jeden PR na fazę z `tasks.md`. Po zakończeniu fazy zatrzymaj się i pokaż diff. Nie zaczynaj kolejnej fazy bez polecenia.
- Nie dodawaj zależności bez zapytania. Jeśli zależność wydaje się potrzebna, uzasadnij to jednym zdaniem i poczekaj na decyzję.
- Nie edytuj plików w `dane/` bez wyraźnego polecenia. Testy je wczytują.
- Nie edytuj `.specify/` ani `.github/skills/` poza tym, co robią skille spec-kit.
- Przed zgłoszeniem gotowości uruchom `npm test`, `npm run typecheck` i `npm run build` i pokaż wynik. Vercel buduje produkcję tym samym `next build`, więc czerwony build lokalnie to czerwony deploy.
