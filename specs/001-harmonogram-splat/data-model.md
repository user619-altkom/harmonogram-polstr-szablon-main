# Data Model: Harmonogram spłat kredytu hipotecznego (POLSTR/WIBOR)

Encje domenowe, wywiedzione z `spec.md` (Key Entities) i istniejących typów w `src/domena/harmonogram.ts`
oraz `src/dane/wskazniki.ts`. Wszystkie typy żyją w `src/domena/` i `src/dane/`, bez zależności od React.

## ParametryKredytu

Wejście obliczenia harmonogramu (rozszerzenie istniejącego typu o listę nadpłat).

| Pole | Typ | Opis / walidacja |
|---|---|---|
| `kwotaGr` | `number` (liczba całkowita, grosze) | kwota kredytu, musi być dodatnia |
| `liczbaRat` | `number` (liczba całkowita) | liczba rat, musi być dodatnia |
| `marza` | `number` (ułamek) | marża banku, np. `0.0211` dla 2,11 pp; nieujemna |
| `typRat` | `'rowne' \| 'malejace'` | typ raty |
| `wskaznik` | `'POLSTR_1M' \| 'WIBOR_3M'` | wybrany wskaźnik referencyjny |
| `pierwszaRata` | `string` (`YYYY-MM-DD`) | data pierwszej raty |
| `nadplaty` | `Nadplata[]` | opcjonalna lista nadpłat, domyślnie pusta |

## Nadplata

Pojedyncza nadpłata z listy w `ParametryKredytu.nadplaty`.

| Pole | Typ | Opis / walidacja |
|---|---|---|
| `miesiac` | `number` (liczba całkowita) | numer raty, po której nadpłata jest stosowana (1-indeksowany), musi mieścić się w zakresie `1..liczbaRat` |
| `kwotaGr` | `number` (liczba całkowita, grosze) | kwota nadpłaty, musi być dodatnia i nie większa niż aktualne saldo |
| `tryb` | `'obniz_rate' \| 'skroc_okres'` | sposób rozliczenia nadpłaty (patrz `research.md`) |

## WpisSerii (istniejący typ, bez zmian)

Jeden wpis serii wskaźnika z `dane/*.json`, zwracany przez `seriaWskaznika`.

| Pole | Typ | Opis |
|---|---|---|
| `od` | `string` (`YYYY-MM-DD`) | dzień, od którego obowiązuje wartość |
| `stopa` | `number` (ułamek) | stopa referencyjna, np. `0.0355` dla 3,55 % |

## WierszHarmonogramu

Jeden wiersz wynikowej tabeli rat.

| Pole | Typ | Opis |
|---|---|---|
| `numer` | `number` | numer raty, od 1 |
| `data` | `string` (`YYYY-MM-DD`) | data raty |
| `kapitalGr` | `number` (liczba całkowita, grosze) | część kapitałowa raty |
| `odsetkiGr` | `number` (liczba całkowita, grosze) | część odsetkowa raty |
| `rataGr` | `number` (liczba całkowita, grosze) | `kapitalGr + odsetkiGr` |
| `saldoPoGr` | `number` (liczba całkowita, grosze) | saldo pozostałe po tej racie, `0` dla ostatniej raty |

## WynikHarmonogramu

Wynik `policzHarmonogram`, zwracany przez domenę i serializowany przez route handler.

| Pole | Typ | Opis |
|---|---|---|
| `raty` | `WierszHarmonogramu[]` | pełna tabela rat |
| `sumaOdsetekGr` | `number` (liczba całkowita, grosze) | suma części odsetkowych wszystkich rat |

## Reguły spójności (walidowane w domenie albo w testach)

- Suma `kapitalGr` po wszystkich wierszach `raty` MUSI być równa `ParametryKredytu.kwotaGr` (FR-008,
  SC-002).
- `saldoPoGr` ostatniego wiersza MUSI wynosić `0`.
- Dla `typRat = 'malejace'`: `kapitalGr` jest stałe dla wszystkich wierszy poza ewentualnym
  wyrównaniem w ostatnim wierszu.
- Dla `nadplaty` z trybem `'skroc_okres'` pokrywającej całe pozostałe saldo: `raty.length` jest
  mniejsze niż `ParametryKredytu.liczbaRat`, a ostatni wiersz odpowiada miesiącowi nadpłaty.
