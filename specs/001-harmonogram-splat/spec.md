# Feature Specification: Harmonogram spłat kredytu hipotecznego (POLSTR/WIBOR)

**Feature Branch**: `001-harmonogram-splat`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Wklej pełną treść sekcji „Treść zgłoszenia” i „Zakres MVP” z BRIEF.md, razem z podsekcjami „Ekran” i „Wydanie”. Dopisz: liczba kontrolna z BRIEF.md jest kryterium akceptacji; ekran www to osobna, ostatnia historia użytkownika, jego wygląd dostarczę jako gotowy komponent React."

## Treść zgłoszenia

„Od września 2026 pierwsze banki w Polsce oferują kredyty hipoteczne ze zmiennym oprocentowaniem
opartym na POLSTR 1M zamiast WIBOR. Zgodnie z mapą drogową KNF w latach 2026–2027 POLSTR ma być
stosowany coraz szerzej, a w 2028 istniejące umowy na WIBOR przejdą jednorazową konwersję.
Potrzebujemy kalkulatora harmonogramu spłat, który obsłuży oba wskaźniki, raty równe i malejące oraz
nadpłaty. Dane przykładowe wskaźników w załączeniu.”

Załącznik: `dane/polstr-1m.json`, `dane/wibor-3m.json`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rata równa przy stałej stopie (Priority: P1)

Użytkownik wprowadza kwotę kredytu, liczbę rat równych, datę pierwszej raty, marżę i wskaźnik ze
stałą wartością okresową, po czym otrzymuje pełny harmonogram spłat z ratą stałą (poza wyrównaniem
na końcu) oraz sumą odsetek za cały okres.

**Why this priority**: To najprostszy i najczęstszy przypadek kredytu hipotecznego ze zmiennym
oprocentowaniem — bez tego nie ma sensu liczyć żadnych wariantów bardziej złożonych. Liczba kontrolna
z BRIEF.md odnosi się właśnie do tego scenariusza.

**Independent Test**: Można przetestować niezależnie, wywołując obliczenie harmonogramu dla kwoty
400 000 zł, 300 rat równych, wskaźnika o stałej wartości 3,55% i marży 2,11 pp, i porównując wynik
z liczbą kontrolną.

**Acceptance Scenarios**:

1. **Given** kwota kredytu 400 000 zł, 300 rat równych, wskaźnik o stałej wartości 3,55%, marża
   2,11 pp, **When** system liczy harmonogram, **Then** pierwsza rata wynosi 2 494,72 zł (tolerancja
   ±0,05 zł), a ostatnia rata wyrównująca wynosi 2 492,53 zł.
2. **Given** dowolny poprawny zestaw parametrów rat równych, **When** system liczy harmonogram,
   **Then** suma części kapitałowych wszystkich rat po zaokrągleniach jest równa kwocie kredytu.

---

### User Story 2 - Rata malejąca (Priority: P2)

Użytkownik wybiera typ rat „malejące” i otrzymuje harmonogram, w którym część kapitałowa jest stała
w każdym okresie, a rata maleje wraz ze spadkiem salda.

**Why this priority**: Raty malejące to drugi standardowy wariant kredytu hipotecznego w Polsce i
wymagane wprost w zgłoszeniu.

**Independent Test**: Można przetestować niezależnie, licząc harmonogram dla tych samych parametrów
wejściowych co w User Story 1, ale z typem rat „malejące”, i sprawdzając, że część kapitałowa jest
stała, a rata maleje w każdym kolejnym okresie.

**Acceptance Scenarios**:

1. **Given** kwota kredytu, liczba rat, wskaźnik i marża, typ rat „malejące”, **When** system liczy
   harmonogram, **Then** każda rata ma taką samą część kapitałową (poza ewentualnym wyrównaniem na
   końcu), a część odsetkowa i całkowita rata maleją w kolejnych okresach.

---

### User Story 3 - Zmiana wskaźnika w trakcie spłaty (Priority: P3)

Użytkownik wybiera wskaźnik POLSTR 1M albo WIBOR 3M z serią wartości z pliku w `dane/`. System
przelicza oprocentowanie okresu jako wartość wskaźnika z danego okresu plus marża, aktualizując
wskaźnik zgodnie z jego częstotliwością, i stosuje ostatnią znaną wartość po zakończeniu serii danych.

**Why this priority**: Obsługa zmiennego oprocentowania w czasie to sedno zgłoszenia biznesowego —
bez tego kalkulator liczyłby tylko kredyt o stałej stopie.

**Independent Test**: Można przetestować niezależnie, licząc harmonogram na tyle rat, by objąć co
najmniej dwie różne wartości wskaźnika z serii, i sprawdzając, że oprocentowanie okresu zmienia się
zgodnie z częstotliwością wskaźnika (POLSTR 1M co miesiąc w dniu raty, WIBOR 3M co kwartał) oraz że
po ostatnim wpisie serii używana jest ostatnia znana wartość.

**Acceptance Scenarios**:

1. **Given** wskaźnik POLSTR 1M z serią wartości zmieniającą się w czasie, **When** system liczy
   harmonogram obejmujący zmianę wartości wskaźnika, **Then** oprocentowanie kolejnych okresów
   odzwierciedla nową wartość wskaźnika w dniu raty, w którym nastąpiła zmiana.
2. **Given** liczba rat wykraczająca poza ostatni wpis serii wskaźnika, **When** system liczy raty po
   końcu serii, **Then** używana jest ostatnia znana wartość wskaźnika z pliku.

---

### User Story 4 - Nadpłata kredytu (Priority: P4)

Użytkownik podaje listę nadpłat (miesiąc, kwota, tryb: „obniż ratę” albo „skróć okres”) i otrzymuje
harmonogram uwzględniający wpływ każdej nadpłaty na saldo oraz, zależnie od trybu, na wysokość
kolejnych rat albo na liczbę pozostałych rat.

**Why this priority**: Nadpłaty są wymagane wprost w zgłoszeniu, ale są rozszerzeniem podstawowego
obliczenia rat, więc zależą od User Story 1 i 2.

**Independent Test**: Można przetestować niezależnie, licząc harmonogram z jedną nadpłatą w trybie
„obniż ratę” i osobno z jedną nadpłatą w trybie „skróć okres”, i porównując wynikowe harmonogramy z
harmonogramem bazowym bez nadpłaty.

**Acceptance Scenarios**:

1. **Given** harmonogram rat równych z nadpłatą w trybie „obniż ratę” w wybranym miesiącu, **When**
   system przelicza harmonogram po nadpłacie, **Then** liczba pozostałych rat się nie zmienia, a
   wysokość kolejnych rat maleje względem harmonogramu bez nadpłaty.
2. **Given** harmonogram rat równych z nadpłatą w trybie „skróć okres” w wybranym miesiącu, **When**
   system przelicza harmonogram po nadpłacie, **Then** wysokość rat pozostaje zgodna z pierwotnym
   harmonogramem, a liczba pozostałych rat maleje względem harmonogramu bez nadpłaty.

---

### User Story 5 - Ekran www kalkulatora (Priority: P5)

Użytkownik wypełnia formularz z parametrami kredytu na stronie głównej, klika „Policz” i widzi
pierwszą i ostatnią ratę, sumę odsetek oraz pełną tabelę rat, z możliwością eksportu tabeli do CSV
po stronie przeglądarki.

**Why this priority**: To warstwa prezentacji nad już policzonym harmonogramem — ma sens dopiero, gdy
logika obliczeniowa (User Story 1–4) działa i jest dostępna przez `GET /api/harmonogram`. Wygląd
ekranu dostarczany jest jako gotowy komponent React (`'use client'`, Tailwind, bez bibliotek UI) i
podłączany do route handlera w osobnym kroku.

**Independent Test**: Można przetestować niezależnie, wypełniając formularz na stronie głównej,
klikając „Policz” i sprawdzając, że wynik na ekranie (pierwsza i ostatnia rata, suma odsetek, tabela
rat) odpowiada odpowiedzi `GET /api/harmonogram` dla tych samych parametrów, oraz że eksport CSV
zwraca plik z tymi samymi danymi.

**Acceptance Scenarios**:

1. **Given** poprawnie wypełniony formularz parametrów kredytu, **When** użytkownik klika „Policz”,
   **Then** ekran pokazuje pierwszą ratę, ostatnią ratę, sumę odsetek za cały okres i pełną tabelę rat
   pobraną z `/api/harmonogram`.
2. **Given** policzony harmonogram widoczny na ekranie, **When** użytkownik żąda eksportu do CSV,
   **Then** przeglądarka generuje plik CSV zawierający te same wiersze, co tabela rat na ekranie.

### Edge Cases

- Co się dzieje, gdy liczba rat jest większa niż liczba wpisów w serii wskaźnika? System używa
  ostatniej znanej wartości wskaźnika po jej wyczerpaniu (patrz User Story 3).
- Co się dzieje, gdy nadpłata w trybie „skróć okres” pokrywa całe pozostałe saldo? Harmonogram kończy
  się w miesiącu nadpłaty, bez kolejnych rat.
- Co się dzieje z zaokrągleniami części kapitałowych na przestrzeni całego harmonogramu? Ostatnia rata
  wyrównuje różnicę tak, aby suma części kapitałowych była dokładnie równa kwocie kredytu.
- Co się dzieje, gdy parametry wejściowe są niepoprawne (np. ujemna kwota, zerowa liczba rat)? System
  odrzuca żądanie i zwraca czytelny komunikat błędu zamiast harmonogramu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST przyjmować jako wejście: kwotę kredytu, liczbę rat, datę pierwszej raty
  (YYYY-MM-DD), marżę banku w punktach procentowych, typ rat (równe albo malejące) oraz wybór
  wskaźnika (POLSTR 1M albo WIBOR 3M).
- **FR-002**: System MUST przyjmować opcjonalną listę nadpłat, każda z: miesiącem, kwotą i trybem
  („obniż ratę” albo „skróć okres”).
- **FR-003**: System MUST liczyć oprocentowanie każdego okresu jako wartość wskaźnika za dany okres
  plus podana marża.
- **FR-004**: System MUST aktualizować wartość wskaźnika POLSTR 1M co miesiąc w dniu raty, a wskaźnika
  WIBOR 3M co kwartał.
- **FR-005**: System MUST używać ostatniej znanej wartości wskaźnika z serii danych po jej wyczerpaniu.
- **FR-006**: System MUST liczyć odsetki okresu jako saldo pomnożone przez stopę roczną podzieloną
  przez 12, bez kapitalizacji odsetek w ramach miesiąca.
- **FR-007**: System MUST wyrażać kwoty w groszach jako liczby całkowite i zaokrąglać do grosza w
  jednym, jawnie określonym miejscu obliczeń.
- **FR-008**: System MUST tak dobierać ostatnią ratę, aby suma części kapitałowych wszystkich rat była
  dokładnie równa kwocie kredytu.
- **FR-009**: System MUST udostępniać `GET /api/harmonogram`, który przyjmuje parametry wejściowe w
  query string i zwraca JSON z tabelą rat (numer, data, część kapitałowa, część odsetkowa, rata, saldo
  po spłacie) oraz sumą odsetek za cały okres.
- **FR-010**: System MUST udostępniać ekran www z formularzem parametrów, przyciskiem „Policz”,
  wyświetleniem pierwszej i ostatniej raty, sumy odsetek, pełnej tabeli rat oraz eksportem tabeli do
  CSV po stronie przeglądarki.
- **FR-011**: Ekran www MUST pobierać dane z `/api/harmonogram` przez `fetch` z parametrami formularza
  przekazanymi w query string.
- **FR-012**: System MUST stosować dla każdej nadpłaty tryb „obniż ratę” (skrócenie raty przy tej samej
  liczbie pozostałych rat) albo „skróć okres” (utrzymanie wysokości raty przy skróceniu liczby rat),
  zgodnie z wyborem użytkownika dla danej nadpłaty.

### Key Entities *(include if feature involves data)*

- **Parametry kredytu**: kwota kredytu, liczba rat, data pierwszej raty, marża, typ rat, wybrany
  wskaźnik.
- **Nadpłata**: miesiąc, kwota, tryb („obniż ratę” albo „skróć okres”).
- **Seria wskaźnika**: lista wartości stopy referencyjnej (POLSTR 1M albo WIBOR 3M) w czasie, wczytana
  z `dane/*.json`.
- **Wiersz harmonogramu**: numer raty, data, część kapitałowa, część odsetkowa, wysokość raty, saldo
  po spłacie.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dla kwoty kredytu 400 000 zł, 300 rat równych, wskaźnika o stałej wartości 3,55% i
  marży 2,11 pp system zwraca pierwszą ratę 2 494,72 zł (tolerancja ±0,05 zł) i ostatnią ratę
  wyrównującą 2 492,53 zł — to liczba kontrolna z BRIEF.md i jest kryterium akceptacji dla obliczeń
  rat równych.
- **SC-002**: Dla każdego policzonego harmonogramu suma części kapitałowych wszystkich rat po
  zaokrągleniach jest równa kwocie kredytu co do grosza.
- **SC-003**: Użytkownik na ekranie www otrzymuje wynik harmonogramu (pierwsza i ostatnia rata, suma
  odsetek, tabela rat) w ciągu jednego kliknięcia przycisku „Policz”, bez przeładowania strony.
- **SC-004**: Eksport CSV z ekranu zawiera dokładnie te same wiersze i wartości, co tabela rat
  wyświetlona na ekranie, dla dowolnego policzonego harmonogramu.

## Assumptions

- Wygląd i komponent ekranu www (`app/page.tsx`, `'use client'`, Tailwind, bez bibliotek UI) dostarcza
  użytkownik jako gotowy komponent React; ta specyfikacja opisuje jego zachowanie i dane, nie jego
  warstwę wizualną.
- Dane wskaźników pochodzą wyłącznie z plików `dane/polstr-1m.json` i `dane/wibor-3m.json`; wartość
  wskaźnika na okres jest brana wprost z danych, bez składania dziennych stawek wstecz za okres
  odsetkowy (świadome uproszczenie MVP, zgodnie z BRIEF.md).
- Zaliczenie funkcjonalne opiera się na liczbie kontrolnej z BRIEF.md jako kryterium akceptacji dla
  User Story 1.
- Wydanie: produkcja działa na Vercel i buduje się z GitHuba — każdy push do `main` tworzy nową wersję
  produkcyjną, a każdy PR ma własny adres podglądu w komentarzu bota Vercel. Zaliczenie zadania to
  mail do prowadzącego z adresem produkcyjnym i adresem repozytorium (szczegóły w KARTA.md, Bramka 3).
  To dotyczy procesu wydania, nie zachowania samej funkcji, więc nie ma tu osobnych wymagań
  funkcjonalnych.
