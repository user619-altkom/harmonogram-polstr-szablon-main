/**
 * Moduł domenowy kalkulatora harmonogramu spłat: czyste funkcje, bez React i bez I/O.
 *
 * To jest szkielet. Właściwe typy i funkcje powstaną z /speckit-plan
 * i /speckit-implement na podstawie BRIEF.md. Poniższy typ i funkcja
 * są punktem zaczepienia, żeby typecheck, testy i route handler działały od pierwszej minuty.
 */

export interface ParametryKredytu {
  /** Kwota kredytu w groszach (liczba całkowita). */
  kwotaGr: number;
  liczbaRat: number;
  /** Marża banku jako ułamek, np. 0.0211 dla 2,11 pp. */
  marza: number;
  typRat: 'rowne' | 'malejace';
  wskaznik: 'POLSTR_1M' | 'WIBOR_3M';
  /** Data pierwszej raty w formacie YYYY-MM-DD. */
  pierwszaRata: string;
}

export function policzHarmonogram(parametry: ParametryKredytu): never {
  throw new Error(`nie zaimplementowano: policzHarmonogram (${parametry.liczbaRat} rat, ${parametry.typRat})`);
}
