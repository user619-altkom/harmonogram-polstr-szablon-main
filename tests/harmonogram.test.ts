import { describe, expect, it } from 'vitest';
import { oprocentowanieOkresu, policzHarmonogram } from '../src/domena/harmonogram';

const parametryKontrolne = {
  kwotaGr: 40_000_000,
  liczbaRat: 300,
  marza: 0.0211,
  typRat: 'rowne' as const,
  wskaznik: 'POLSTR_1M' as const,
  pierwszaRata: '2026-10-01',
  stopaWskaznika: 0.0355,
};

describe('harmonogram rat równych', () => {
  it('liczy ratę zgodnie z liczbą kontrolną', () => {
    const wynik = policzHarmonogram(parametryKontrolne);

    expect(wynik.raty[0]?.rataGr).toBeCloseTo(249_472, 0);
    expect(wynik.raty.at(-1)?.rataGr).toBeCloseTo(249_253, 0);
  });

  it('zachowuje sumę części kapitałowych równą kwocie kredytu', () => {
    const wynik = policzHarmonogram(parametryKontrolne);

    expect(wynik.raty.reduce((suma, wiersz) => suma + wiersz.kapitalGr, 0)).toBe(40_000_000);
  });

  it('nie pomija lutowej raty dla daty przypadającej na koniec stycznia', () => {
    const wynik = policzHarmonogram({
      ...parametryKontrolne,
      kwotaGr: 1_000_000,
      liczbaRat: 3,
      pierwszaRata: '2026-01-31',
      stopaWskaznika: 0,
      marza: 0,
    });

    expect(wynik.raty.map((wiersz) => wiersz.data)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('wybiera stopę z serii dla granic obowiązywania wpisów', () => {
    const seria = [
      { od: '2026-01-01', stopa: 0.03 },
      { od: '2026-04-01', stopa: 0.035 },
      { od: '2026-07-01', stopa: 0.04 },
    ];

    expect(oprocentowanieOkresu('POLSTR_1M', 0.01, '2025-12-31', seria)).toBeCloseTo(0.04, 8);
    expect(oprocentowanieOkresu('POLSTR_1M', 0.01, '2026-04-01', seria)).toBeCloseTo(0.045, 8);
    expect(oprocentowanieOkresu('POLSTR_1M', 0.01, '2026-06-30', seria)).toBeCloseTo(0.045, 8);
    expect(oprocentowanieOkresu('POLSTR_1M', 0.01, '2026-08-01', seria)).toBeCloseTo(0.05, 8);
  });

  it('aktualizuje oprocentowanie POLSTR w kolejnych okresach', () => {
    const wynik = policzHarmonogram({
      ...parametryKontrolne,
      kwotaGr: 1_000_000,
      liczbaRat: 2,
      pierwszaRata: '2025-07-01',
      stopaWskaznika: undefined,
      marza: 0,
    });

    const saldoPoPierwszej = wynik.raty[0]?.saldoPoGr ?? 0;
    expect(wynik.raty[1]?.odsetkiGr).toBe(Math.round(saldoPoPierwszej * 0.0478 / 12));
  });

  it('obsługuje raty malejące', () => {
    const wynik = policzHarmonogram({ ...parametryKontrolne, liczbaRat: 4, typRat: 'malejace' });

    expect(wynik.raty.slice(0, 3).map((wiersz) => wiersz.kapitalGr)).toEqual([10000000, 10000000, 10000000]);
    expect(wynik.raty[0]?.rataGr).toBeGreaterThan(wynik.raty[1]?.rataGr ?? 0);
  });

  it('zmniejsza kolejne raty po nadpłacie obniżającej ratę', () => {
    const bezNadplaty = policzHarmonogram({ ...parametryKontrolne, liczbaRat: 6 });
    const zNadplata = policzHarmonogram({
      ...parametryKontrolne,
      liczbaRat: 6,
      nadplaty: [{ miesiac: 2, kwotaGr: 1_000_000, tryb: 'obniz_rate' }],
    });

    expect(zNadplata.raty).toHaveLength(6);
    expect(zNadplata.raty[2]?.rataGr).toBeLessThan(bezNadplaty.raty[2]?.rataGr ?? 0);
  });
});