import { describe, expect, it } from 'vitest';
import { policzHarmonogram } from '../src/domena/harmonogram';

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
});