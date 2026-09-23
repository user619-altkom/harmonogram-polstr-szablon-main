# Research: Harmonogram spłat kredytu hipotecznego (POLSTR/WIBOR)

Brak nieznanych elementów technologicznych — stos (Next.js App Router, TypeScript strict, vitest,
Tailwind, brak nowych zależności) wynika wprost z `AGENTS.md` i istniejącego szkieletu repo. Poniżej
decyzje algorytmiczne potrzebne do implementacji, wynikające z reguł w BRIEF.md i wymagań w `spec.md`.

## Decyzja: przeliczanie raty równej przy zmianie wskaźnika

**Decision**: Rata równa jest liczona metodą annuitetową (stały ułamek raty = kapitał × stopa
miesięczna / (1 − (1 + stopa miesięczna)^−liczba pozostałych rat)) na podstawie aktualnego salda i
liczby pozostałych rat. Rata jest przeliczana od nowa w każdym okresie, w którym zmienia się wartość
wskaźnika (a więc i oprocentowanie) — do najbliższej zmiany rata pozostaje stała.

**Rationale**: BRIEF.md wymaga rat „równych" przy oprocentowaniu zmiennym w czasie (POLSTR co miesiąc,
WIBOR co kwartał). Jedyny sposób pogodzenia „raty równej" ze zmiennym oprocentowaniem to przeliczenie
annuitetu na aktualnym saldzie i pozostałej liczbie rat przy każdej zmianie stopy — to standardowa
praktyka rynkowa dla kredytów o zmiennym oprocentowaniu w Polsce. Liczba kontrolna z BRIEF.md (stała
stopa przez cały okres) jest szczególnym przypadkiem tej metody, w którym przeliczenie następuje tylko
raz, na starcie.

**Alternatives considered**: Rata stała wyliczona raz na starcie i niezmienna mimo zmiany
oprocentowania — odrzucone, bo przy rosnącej stopie saldo nigdy by się nie spłaciło (rata mogłaby nie
pokrywać nawet odsetek), a BRIEF.md nie opisuje mechanizmu dopłat wyrównawczych.

## Decyzja: rata malejąca

**Decision**: Część kapitałowa każdej raty jest stała i równa kwocie kredytu podzielonej przez liczbę
rat (w groszach, z zaokrągleniem w dół i wyrównaniem różnicy w ostatniej racie). Część odsetkowa liczona
jest od aktualnego salda wg reguł z BRIEF.md; rata całkowita to suma obu części i maleje wraz ze
spadkiem salda.

**Rationale**: Standardowa definicja raty malejącej, zgodna z BRIEF.md („część kapitałowa stała w
każdym okresie").

**Alternatives considered**: brak — definicja wynika wprost ze zgłoszenia.

## Decyzja: zaokrąglanie i rata wyrównująca

**Decision**: Wszystkie kwoty pieniężne są liczbami całkowitymi w groszach od momentu wejścia do
domeny (przeliczenie złotych na grosze robi route handler przy parsowaniu, zgodnie z istniejącym
kodem). Zaokrąglanie do pełnego grosza następuje w jednym miejscu: przy wyliczaniu części kapitałowej
każdej raty (`Math.round`). Różnica między kwotą kredytu a sumą zaokrąglonych części kapitałowych
wszystkich rat poza ostatnią trafia w całości do części kapitałowej ostatniej raty, tak aby suma była
dokładnie równa kwocie kredytu (FR-008, SC-002).

**Rationale**: Zgodność z zasadą V konstytucji („jedno jawne miejsce zaokrąglania") i z regułą z
BRIEF.md („rata wyrównująca na końcu").

**Alternatives considered**: Rozkładanie różnic zaokrągleń na kilka ostatnich rat — odrzucone jako
niepotrzebnie złożone wobec prostego wymagania z BRIEF.md.

## Decyzja: częstotliwość aktualizacji wskaźnika

**Decision**: Dla POLSTR 1M oprocentowanie jest przeliczane co miesiąc, w dniu każdej raty, na
podstawie wartości wskaźnika obowiązującej w tym dniu (wg `seriaWskaznika`, wpis „od" ≤ data raty).
Dla WIBOR 3M oprocentowanie jest przeliczane raz na kwartał (co 3. ratę licząc od pierwszej raty), a
w miesiącach pomiędzy kwartałami obowiązuje stopa z ostatniego przeliczenia. Po ostatnim wpisie serii
używana jest jego wartość dla wszystkich kolejnych rat.

**Rationale**: Wprost z reguł BRIEF.md.

**Alternatives considered**: Przeliczanie WIBOR co miesiąc jak POLSTR — odrzucone, bo BRIEF.md wyraźnie
rozróżnia częstotliwości obu wskaźników.

## Decyzja: nadpłaty

**Decision**: Nadpłata w trybie „obniż ratę" pomniejsza saldo w danym miesiącu i od kolejnej raty
annuitet jest przeliczany na nowym saldzie przy tej samej liczbie pozostałych rat. Nadpłata w trybie
„skróć okres" pomniejsza saldo, ale rata pozostaje na dotychczasowym poziomie (dopóki nie zmieni jej
kolejna zmiana wskaźnika), a liczba pozostałych rat jest przeliczana tak, aby spłacić pomniejszone
saldo przy tej racie i aktualnym oprocentowaniu; jeśli nadpłata pokrywa całe saldo, harmonogram kończy
się w tym miesiącu.

**Rationale**: Wprost z definicji obu trybów w BRIEF.md i z acceptance scenarios w `spec.md`
(User Story 4).

**Alternatives considered**: Traktowanie nadpłaty tylko jako jednorazowego zmniejszenia ostatniej raty
— odrzucone, bo nie realizuje żadnego z dwóch wymaganych trybów.

## Output

Wszystkie decyzje powyżej domykają Technical Context — brak pozostałych `NEEDS CLARIFICATION`.
