---

description: "Task list template for feature implementation"
---

# Tasks: Harmonogram spłat kredytu hipotecznego (POLSTR/WIBOR)

**Input**: Design documents from `/specs/001-harmonogram-splat/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/harmonogram-api.md, quickstart.md

**Tests**: Zgodnie z konstytucją (III. Test-First, NON-NEGOTIABLE) i minimalnym zestawem testów z BRIEF.md,
każda historia domenowa ma test napisany przed implementacją.

**Organization**: Zadania są pogrupowane wg historii użytkownika ze `spec.md`, żeby każdą dało się
zaimplementować i przetestować niezależnie.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Można wykonać równolegle (inne pliki, brak zależności)
- **[Story]**: Do której historii użytkownika należy zadanie (US1–US5)
- Ścieżki plików są podane wprost w opisie

## Path Conventions

Pojedynczy projekt Next.js App Router (patrz `plan.md`, Project Structure): `src/domena/`,
`src/dane/`, `app/api/harmonogram/route.ts`, `app/page.tsx`, `tests/`.

## Phase 1: Setup (Shared Infrastructure)

Pusta — szkielet projektu już istnieje (Next.js, TypeScript, Tailwind, vitest, `src/domena/harmonogram.ts`,
`src/dane/wskazniki.ts`, `app/api/harmonogram/route.ts` skonfigurowane i przechodzące `npm test`/`npm run typecheck`).
Brak zadań w tej fazie.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Typy i pomocnicze funkcje współdzielone przez wszystkie historie użytkownika. Musi być
ukończona przed rozpoczęciem Phase 3.

- [X] T001 Rozszerzyć `src/domena/harmonogram.ts` o typy `WierszHarmonogramu` (`numer`, `data`,
  `kapitalGr`, `odsetkiGr`, `rataGr`, `saldoPoGr` — wszystkie kwoty jako liczby całkowite w groszach)
  i `WynikHarmonogramu` (`raty: WierszHarmonogramu[]`, `sumaOdsetekGr: number`), zgodnie z
  `data-model.md`
- [X] T002 [P] Dodać w `src/domena/harmonogram.ts` funkcję pomocniczą liczącą oprocentowanie okresu
  jako `wartość wskaźnika za dany okres + marża`, korzystającą z `seriaWskaznika` z
  `src/dane/wskazniki.ts` (FR-003)

**Checkpoint**: Typy i pomocnicza funkcja oprocentowania gotowe — historie użytkownika mogą się zacząć.

---

## Phase 3: User Story 1 - Rata równa przy stałej stopie (Priority: P1) 🎯 MVP

**Goal**: Policzyć harmonogram rat równych dla kredytu ze stałą wartością wskaźnika w całym okresie,
z ratą wyrównującą na końcu.

**Independent Test**: Wywołanie `policzHarmonogram` dla kwoty 400 000 zł, 300 rat równych, wskaźnika o
stałej wartości 3,55% podanej wprost (nie z pliku) i marży 2,11 pp musi dać pierwszą ratę 2 494,72 zł
(tolerancja ±0,05 zł) i ostatnią ratę wyrównującą 2 492,53 zł.

- [X] T003 [P] [US1] Napisać test w `tests/harmonogram.test.ts`: dla kwoty `40_000_000` gr, 300 rat
  równych, stopy wskaźnika podanej wprost jako stała `0.0355` i marży `0.0211`, `policzHarmonogram`
  MUSI zwrócić pierwszą ratę `249472` gr (tolerancja ±5 gr) i ostatnią ratę wyrównującą `249253` gr —
  liczba kontrolna z BRIEF.md (SC-001)
- [X] T004 [P] [US1] Napisać test w `tests/harmonogram.test.ts`: dla dowolnych poprawnych parametrów
  rat równych suma pola `kapitalGr` wszystkich wierszy `raty` MUSI być równa `kwotaGr` (SC-002, FR-008)
- [X] T005 [US1] Zaimplementować w `src/domena/harmonogram.ts` gałąź `typRat === 'rowne'` metodą
  annuitetową na stałej stopie: rata = `kwotaGr × stopaMiesieczna / (1 − (1 + stopaMiesieczna)^−liczbaRat)`,
  część kapitałowa i odsetkowa liczona wg reguły „odsetki okresu = saldo × stopa roczna / 12” (FR-006),
  zaokrąglanie części kapitałowej do grosza w jednym miejscu (FR-007), ostatnia rata dopełnia różnicę
  tak, aby suma części kapitałowych była równa `kwotaGr` (FR-008)
- [X] T006 [US1] Uruchomić `npm test` i potwierdzić, że testy z T003–T004 przechodzą na zielono

**Checkpoint**: User Story 1 działa niezależnie — MVP gotowe do review i scalenia.

---

## Phase 4: User Story 2 - Rata malejąca (Priority: P2)

**Goal**: Policzyć harmonogram rat malejących ze stałą częścią kapitałową w każdym okresie.

**Independent Test**: Dla tych samych parametrów wejściowych co w US1, ale z `typRat: 'malejace'`,
część kapitałowa jest stała (poza wyrównaniem na końcu), a rata maleje w kolejnych okresach.

- [ ] T007 [P] [US2] Napisać test w `tests/harmonogram.test.ts`: dla `typRat: 'malejace'` część
  kapitałowa (`kapitalGr`) jest taka sama we wszystkich wierszach poza ostatnim, a wysokość raty
  (`rataGr`) maleje w kolejnych wierszach (test #2 z BRIEF.md)
- [ ] T008 [US2] Zaimplementować w `src/domena/harmonogram.ts` gałąź `typRat === 'malejace'`: część
  kapitałowa = `kwotaGr / liczbaRat` (zaokrąglona w dół do grosza), odsetki liczone od aktualnego salda
  wg tej samej reguły co w US1 (FR-006), ostatnia rata wyrównuje sumę części kapitałowych do `kwotaGr`
  (FR-008)
- [ ] T009 [US2] Uruchomić `npm test` i potwierdzić, że test z T007 przechodzi na zielono

**Checkpoint**: User Story 1 i 2 działają niezależnie.

---

## Phase 5: User Story 3 - Zmiana wskaźnika w trakcie spłaty (Priority: P3)

**Goal**: Przeliczać oprocentowanie każdego okresu na podstawie serii wskaźnika z `dane/*.json`,
zgodnie z częstotliwością wskaźnika, z zachowaniem ostatniej znanej wartości po końcu serii.

**Independent Test**: Harmonogram policzony na tyle rat, by objąć co najmniej dwie różne wartości
wskaźnika z serii, ma oprocentowanie zmieniające się zgodnie z częstotliwością wskaźnika, a po
ostatnim wpisie serii używa jego wartości do końca harmonogramu.

- [ ] T010 [P] [US3] Napisać test w `tests/harmonogram.test.ts`: dla wskaźnika POLSTR 1M z co najmniej
  dwiema różnymi wartościami w serii, oprocentowanie kolejnych rat odzwierciedla nową wartość
  wskaźnika w dniu raty, w którym nastąpiła zmiana (test #3 z BRIEF.md, FR-004)
- [ ] T011 [P] [US3] Napisać test w `tests/harmonogram.test.ts`: dla liczby rat wykraczającej poza
  ostatni wpis serii wskaźnika, raty policzone po końcu serii używają jej ostatniej znanej wartości
  (FR-005)
- [ ] T012 [US3] Zaimplementować w `src/domena/harmonogram.ts` przeliczanie wartości wskaźnika per
  okres: POLSTR 1M aktualizowany co miesiąc w dniu raty, WIBOR 3M co kwartał (co 3. ratę), z
  zachowaniem ostatniej znanej wartości po wyczerpaniu serii (FR-004, FR-005)
- [ ] T013 [US3] Rozszerzyć annuitet z T005 i część odsetkową z T008 tak, aby rata równa i rata
  malejąca przeliczały oprocentowanie na aktualnym saldzie i pozostałej liczbie rat przy każdej
  zmianie wskaźnika (patrz `research.md`, decyzja o przeliczaniu raty równej)
- [ ] T014 [US3] Uruchomić `npm test` i potwierdzić, że testy z T010–T011 przechodzą na zielono

**Checkpoint**: User Story 1–3 działają niezależnie.

---

## Phase 6: User Story 4 - Nadpłata kredytu (Priority: P4)

**Goal**: Uwzględnić w harmonogramie listę nadpłat w trybie „obniż ratę” albo „skróć okres”.

**Independent Test**: Harmonogram z jedną nadpłatą w trybie „obniż ratę” i osobno z jedną nadpłatą w
trybie „skróć okres”, porównany z harmonogramem bazowym bez nadpłaty.

- [ ] T015 [P] [US4] Dodać w `src/domena/harmonogram.ts` typ `Nadplata` (`miesiac: number` w zakresie
  `1..liczbaRat`, `kwotaGr: number` dodatnia i nie większa niż aktualne saldo,
  `tryb: 'obniz_rate' | 'skroc_okres'`) i rozszerzyć `ParametryKredytu` o opcjonalne pole
  `nadplaty: Nadplata[]` (domyślnie pusta lista), zgodnie z `data-model.md`
- [ ] T016 [P] [US4] Napisać test w `tests/harmonogram.test.ts`: nadpłata w trybie `'obniz_rate'` w
  wybranym miesiącu nie zmienia liczby pozostałych rat, ale zmniejsza wysokość kolejnych rat względem
  harmonogramu bez nadpłaty (test #4 z BRIEF.md)
- [ ] T017 [P] [US4] Napisać test w `tests/harmonogram.test.ts`: nadpłata w trybie `'skroc_okres'` w
  wybranym miesiącu utrzymuje wysokość rat zgodną z harmonogramem bez nadpłaty, ale zmniejsza liczbę
  pozostałych rat (test #4 z BRIEF.md)
- [ ] T018 [US4] Zaimplementować w `src/domena/harmonogram.ts` obsługę `nadplaty`: pomniejszenie salda
  w miesiącu nadpłaty, dla `'obniz_rate'` przeliczenie annuitetu na nowym saldzie przy tej samej
  liczbie pozostałych rat, dla `'skroc_okres'` zachowanie wysokości raty i przeliczenie liczby
  pozostałych rat; jeśli nadpłata pokrywa całe saldo, harmonogram kończy się w tym miesiącu (edge case
  ze `spec.md`)
- [ ] T019 [US4] Uruchomić `npm test` i potwierdzić, że testy z T016–T017 przechodzą na zielono

**Checkpoint**: User Story 1–4 działają niezależnie.

---

## Phase 7: User Story 5 - Ekran www kalkulatora (Priority: P5)

**Goal**: Udostępnić harmonogram przez `GET /api/harmonogram` i pokazać go na ekranie z formularzem,
przyciskiem „Policz”, wynikami i eksportem CSV.

**Independent Test**: Formularz na stronie głównej po kliknięciu „Policz” pokazuje pierwszą i ostatnią
ratę, sumę odsetek i tabelę rat zgodne z odpowiedzią `GET /api/harmonogram`, a eksport CSV zwraca te
same dane.

- [ ] T020 [US5] Zaktualizować `app/api/harmonogram/route.ts`: doparsować opcjonalny parametr
  `nadplaty` (JSON w query string, tablica `{ miesiac, kwota, tryb }` w złotych — patrz
  `contracts/harmonogram-api.md`), wywołać `policzHarmonogram` i zserializować `WynikHarmonogramu` do
  JSON z kwotami w złotych z dwoma miejscami po przecinku (FR-009)
- [ ] T021 [US5] Wkleić dostarczony komponent React jako `app/page.tsx` z dyrektywą `'use client'` w
  pierwszej linii; komponent pobiera dane przez `fetch('/api/harmonogram?...')` z parametrami
  formularza w query string (FR-010, FR-011), bez podłączania jeszcze eksportu CSV jeśli nie jest
  częścią dostarczonego komponentu
- [ ] T022 [US5] Sprawdzić zgodnie z `quickstart.md`, że eksport CSV z ekranu zawiera dokładnie te same
  wiersze co tabela rat na ekranie (FR-010)
- [ ] T023 [US5] Ręcznie zweryfikować w przeglądarce (`npm run dev`) wynik na liczbie kontrolnej z
  BRIEF.md (kwota 400 000 zł, 300 rat równych, POLSTR 1M, marża 2,11 pp) zgodnie z `quickstart.md`

**Checkpoint**: Wszystkie 5 historii użytkownika działa razem — MVP z ekranem gotowe do scalenia do `main`.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Uruchomić `npm test`, `npm run typecheck` i `npm run build` — wszystkie MUSZĄ przejść
  zielono przed PR (AGENTS.md)
- [ ] T025 [P] Sprawdzić zmienione pliki `.ts`/`.tsx` względem `.github/instructions/review.instructions.md`

## Dependencies & Execution Order

- **Setup (Phase 1)**: brak zadań, można pominąć
- **Foundational (Phase 2)**: T001–T002 — blokuje wszystkie historie użytkownika
- **User Stories (Phase 3–7)**: kolejność wg priorytetu P1 → P5, zgodnie z `spec.md`
  - US1 (Phase 3) zależy tylko od Foundational
  - US2 (Phase 4) zależy tylko od Foundational (niezależna od US1, ale w tym samym pliku
    `src/domena/harmonogram.ts`, więc T008 wykonywać po T005 dla uniknięcia konfliktów w jednym pliku)
  - US3 (Phase 5) rozszerza implementacje z US1 i US2 (T013 zależy od T005 i T008)
  - US4 (Phase 6) rozszerza `ParametryKredytu` i logikę annuitetu z US1/US3 (T018 zależy od T012–T013)
  - US5 (Phase 7) zależy od gotowej domeny (US1–US4) i kontraktu `GET /api/harmonogram`
- **Polish (Final Phase)**: po wszystkich historiach

## Parallel Execution Examples

- W ramach Foundational: T001 i T002 można pisać równolegle (różne fragmenty tego samego pliku, ale
  bez zależności logicznej między nimi — zalecane sekwencyjnie w jednym pliku, żeby uniknąć konfliktu
  scalania).
- W ramach US1: T003 i T004 (oba to testy w `tests/harmonogram.test.ts`) można przygotować równolegle
  przed T005.
- W ramach US4: T015 (typy), T016 i T017 (testy) można przygotować równolegle przed T018
  (implementacja).
- Polish: T024 i T025 są niezależne i mogą iść równolegle.

## Implementation Strategy

**MVP first**: Zaimplementować tylko Phase 2 (Foundational) i Phase 3 (US1) — to samodzielnie
testowalny MVP z liczbą kontrolną z BRIEF.md jako kryterium akceptacji (Bramka 2 z KARTA.md).

**Incremental delivery**: Po scaleniu US1, dodawać kolejno US2, US3, US4, US5 — każda historia to
osobny PR z zielonymi testami, zgodnie z `AGENTS.md` (jeden PR na fazę).
