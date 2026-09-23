# Zgłoszenie z biznesu: kalkulator harmonogramu spłat na POLSTR

## Treść zgłoszenia

„Od września 2026 pierwsze banki w Polsce oferują kredyty hipoteczne ze zmiennym oprocentowaniem opartym na POLSTR 1M zamiast WIBOR. Zgodnie z mapą drogową KNF w latach 2026–2027 POLSTR ma być stosowany coraz szerzej, a w 2028 istniejące umowy na WIBOR przejdą jednorazową konwersję. Potrzebujemy kalkulatora harmonogramu spłat, który obsłuży oba wskaźniki, raty równe i malejące oraz nadpłaty. Dane przykładowe wskaźników w załączeniu.”

Załącznik: `dane/polstr-1m.json`, `dane/wibor-3m.json`.

## Zakres MVP (gotowe na 15:00)

### Wejście

- kwota kredytu,
- liczba rat,
- data pierwszej raty (YYYY-MM-DD),
- marża banku w punktach procentowych,
- typ rat: równe albo malejące,
- wskaźnik: POLSTR 1M albo WIBOR 3M, z serią wartości per okres z pliku w `dane/`,
- lista nadpłat: miesiąc, kwota, tryb (obniż ratę albo skróć okres).

### Wyjście

- `GET /api/harmonogram` z parametrami w query string zwraca JSON: tabela rat (numer, data, część kapitałowa, część odsetkowa, rata, saldo po spłacie) i suma odsetek za cały okres,
- ekran www w `app/page.tsx`: formularz parametrów, przycisk „Policz”, rata pierwsza i ostatnia, suma odsetek, tabela rat, eksport CSV po stronie przeglądarki.

### Ekran

Wygląd ekranu projektujesz sam w Claude Design, w czasie gdy agent implementuje logikę (KARTA.md, tor równoległy). Eksport to jeden komponent React z Tailwind, bez bibliotek UI, wklejony jako `app/page.tsx` z dyrektywą `'use client'` w pierwszej linii. Dane pobiera przez `fetch('/api/harmonogram?...')` z parametrami formularza w query string. Podpięcie komponentu do route handlera robi agent w fazie 4. Obliczenia zostają w module domenowym `src/domena/`, route handler `app/api/harmonogram/route.ts` tylko parsuje parametry i woła funkcję.

### Wydanie

Produkcja działa na Vercel i buduje się z GitHuba: każdy push do `main` to nowa wersja produkcyjna, każdy PR ma własny adres podglądu w komentarzu bota Vercel. Zaliczenie to mail do prowadzącego z adresem produkcyjnym i adresem repo (szczegóły w KARTA.md, Bramka 3).

### Reguły

- oprocentowanie okresu = wartość wskaźnika + marża,
- POLSTR 1M zmienia się co miesiąc w dniu raty, WIBOR 3M co kwartał,
- po ostatnim wpisie serii wskaźnika obowiązuje ostatnia znana wartość,
- zaokrąglanie do grosza, rata wyrównująca na końcu tak, aby suma części kapitałowych była równa kwocie kredytu,
- odsetki proste w okresie, bez kapitalizacji w ramach miesiąca.

### Świadome uproszczenie MVP

Wartość wskaźnika na okres bierzemy wprost z danych. Nie składamy dziennych stawek POLSTR wstecz za okres odsetkowy. To temat na gwiazdkę (KARTA.md), nie na MVP.

### Minimalny zestaw testów (vitest, tylko domena)

1. rata równa przy stałej stopie (liczba kontrolna niżej),
2. rata malejąca,
3. zmiana wskaźnika w trakcie spłaty,
4. nadpłata w trybie „obniż ratę” i w trybie „skróć okres”,
5. suma części kapitałowych po zaokrągleniach równa kwocie kredytu.

## Liczba kontrolna

Kwota 400 000 zł, 300 rat równych, POLSTR 1M 3,55 % + marża 2,11 pp = 5,66 % rocznie. Konwencja: odsetki za okres = saldo × stopa roczna / 12, kwoty w groszach jako liczby całkowite, zaokrąglanie do grosza. Rata równa 2 494,72 zł (tolerancja ±0,05 zł), ostatnia rata wyrównująca 2 492,53 zł. Jeśli pierwszy test daje inną liczbę, sprawdź najpierw zamianę procentu na ułamek, dzielenie stopy rocznej przez 12 i miejsce zaokrąglania. W tym teście podaj serię stałą 0,0355 wprost, nie z pliku (plik ma 3,55472 %, co daje ratę 2 495,85 zł).

## Źródła

- https://finwire.pl/artykuly/polstr-skala-185-mld-euro-koniec-wibor-nowe-kredyty-2027
- https://www.knf.gov.pl/dla_rynku/Wskazniki_referencyjne/aktualnosci?articleId=98941&p_id=18
