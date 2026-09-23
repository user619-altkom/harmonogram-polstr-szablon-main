---
applyTo: "**/*.{ts,tsx}"
---

# Reguły review dla kodu TypeScript

Stosuj przy code review w GitHubie i w rutynie `skrypty/review-pr.*`. Każdą uwagę zaczynaj od kategorii: BŁĄD (kod daje zły wynik), RYZYKO (działa, ale może się zepsuć) albo STYL (czytelność, konwencje). Pisz po polsku, konkretnie, z nazwą pliku i numerem linii.

1. Każda zmiana logiki obliczeń ma test z liczbą kontrolną (konkretna kwota, konkretna rata). Brak takiego testu to BŁĄD.
2. Zaokrąglanie do grosza dzieje się w jednym miejscu. Drugie `Math.round` na tej samej wielkości to BŁĄD.
3. Brak `any`, `as unknown as`, `@ts-ignore` i `!` na wartościach, które mogą być `undefined`. Zgłaszaj jako RYZYKO.
4. Nazwy domenowe po polsku, bez skrótów: `rataKapitalowa`, `saldoPoSplacie`, a nie `rk`, `saldo2`. Zgłaszaj jako STYL.
5. Funkcje w module domenowym są czyste: bez odczytu plików, bez `Date.now()`, bez `console.log`. Naruszenie to RYZYKO.
6. Porównania granic okresów i dat (`<` a `<=`, pierwszy i ostatni dzień, ostatnia rata) sprawdzaj wprost i pytaj o test brzegowy. Zgłaszaj jako RYZYKO.
7. Route handler w `app/api/` nie liczy: parsuje parametry, woła funkcję z `src/domena/` i zwraca JSON. Obliczenie, zaokrąglenie albo pętla po ratach w route handlerze to BŁĄD.

<!-- Uczestnik: dopisz tutaj reguły ze swojego recenzenta z ćwiczenia 10b (dzień 2). Numeruj dalej, od 8. -->
