# Kontrakt: `GET /api/harmonogram`

Route handler w `app/api/harmonogram/route.ts`. Parsuje parametry z query string, woła
`policzHarmonogram` z `src/domena/harmonogram.ts` i zwraca JSON. Bez logiki obliczeniowej w tym pliku.

## Żądanie

`GET /api/harmonogram?kwota=<liczba>&liczbaRat=<int>&marza=<liczba>&wskaznik=<POLSTR_1M|WIBOR_3M>&typRat=<rowne|malejace>&pierwszaRata=<YYYY-MM-DD>&nadplaty=<JSON>`

| Parametr | Format | Opis |
|---|---|---|
| `kwota` | liczba dodatnia, złote | kwota kredytu, np. `400000` |
| `liczbaRat` | liczba całkowita dodatnia | liczba rat, np. `300` |
| `marza` | liczba nieujemna, punkty procentowe | marża banku, np. `2.11` |
| `wskaznik` | `POLSTR_1M` \| `WIBOR_3M` | wybrany wskaźnik referencyjny |
| `typRat` | `rowne` \| `malejace` | typ raty |
| `pierwszaRata` | `YYYY-MM-DD` | data pierwszej raty |
| `nadplaty` | JSON, zakodowany w query string, opcjonalny | tablica obiektów `{ "miesiac": number, "kwota": number, "tryb": "obniz_rate" \| "skroc_okres" }`; `kwota` w złotych. Domyślnie pusta lista, gdy parametr pominięty. |

## Odpowiedź 200

```json
{
  "raty": [
    {
      "numer": 1,
      "data": "2026-10-01",
      "kapital": 833.33,
      "odsetki": 1886.67,
      "rata": 2494.72,
      "saldoPo": 399166.67
    }
  ],
  "sumaOdsetek": 348_301.11
}
```

Kwoty w odpowiedzi JSON są w złotych z dwoma miejscami po przecinku (przeliczenie z groszy na złote
robi route handler przy serializacji, tak jak dziś parsowanie robi przeliczenie odwrotne).

## Odpowiedź błędu (400)

Zgodnie z istniejącym kodem: `{ "blad": "<opis>", "przyklad": "<przykładowe query string>" }`.
Dotyczy brakujących albo niepoprawnych parametrów wymienionych w tabeli powyżej, w tym niepoprawnego
JSON-u w `nadplaty` albo nadpłaty spoza zakresu `1..liczbaRat`.

## Kryterium akceptacji (liczba kontrolna z BRIEF.md)

`GET /api/harmonogram?kwota=400000&liczbaRat=300&marza=2.11&wskaznik=POLSTR_1M&typRat=rowne&pierwszaRata=2026-10-01`
ze wskaźnikiem o stałej wartości 3,55 % (patrz `quickstart.md` — w teście domeny wartość podawana jest
wprost, nie z pliku) MUSI zwrócić pierwszą ratę `2494.72` (tolerancja ±0,05) i ostatnią ratę `2492.53`.
