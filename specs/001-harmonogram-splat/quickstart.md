# Quickstart: walidacja harmonogramu spłat

## Wymagania wstępne

- `npm install` wykonane
- Node.js zgodny z `engines.node` w `package.json`

## Test domeny na liczbie kontrolnej (Phase 3 z tasks.md)

1. `npm test` — uruchamia vitest dla `src/domena/` i `src/dane/`.
2. Test `policzHarmonogram` dla kwoty 400 000 zł, 300 rat równych, wskaźnika o stałej wartości 3,55 %
   podanej wprost w teście (nie z pliku `dane/polstr-1m.json`, który ma inną wartość), marży 2,11 pp,
   MUSI dać pierwszą ratę `249472` gr (tolerancja ±5 gr) i ostatnią ratę wyrównującą `249253` gr —
   liczba kontrolna z BRIEF.md.
3. Test sumy części kapitałowych: dla dowolnego poprawnego harmonogramu suma `kapitalGr` wszystkich
   wierszy równa się `kwotaGr` (SC-002).

## Walidacja end-to-end przez API (po podłączeniu route handlera)

1. `npm run dev`.
2. W przeglądarce albo `curl`:
   `GET http://localhost:3000/api/harmonogram?kwota=400000&liczbaRat=300&marza=2.11&wskaznik=POLSTR_1M&typRat=rowne&pierwszaRata=2026-10-01`
3. Oczekiwany wynik: JSON z tabelą 300 wierszy, pierwsza rata ok. `2494.72` zł, suma odsetek za cały
   okres większa od zera. Uwaga: dane w `dane/polstr-1m.json` różnią się od liczby kontrolnej (patrz
   `research.md` i uwaga w pliku danych), więc dokładna wartość pierwszej raty przez API może się
   różnić od liczby kontrolnej z testu domeny — to oczekiwane, liczba kontrolna dotyczy stałej stopy
   podanej wprost, nie serii z pliku.

## Walidacja ekranu (User Story 5, po fazie 4)

1. `npm run dev`, otworzyć `http://localhost:3000`.
2. Wypełnić formularz parametrami z kroku 2 powyżej, kliknąć „Policz”.
3. Sprawdzić, że pierwsza i ostatnia rata oraz suma odsetek na ekranie odpowiadają odpowiedzi API.
4. Kliknąć eksport CSV i sprawdzić, że pobrany plik zawiera te same wiersze co tabela na ekranie.

## Bramka jakości przed PR

`npm test`, `npm run typecheck`, `npm run build` — wszystkie MUSZĄ przejść lokalnie przed otwarciem PR
(patrz `AGENTS.md`).
