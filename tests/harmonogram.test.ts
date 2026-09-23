import { describe, expect, it } from 'vitest';
import { oprocentowanieOkresu, policzHarmonogram, rekompensataArt40 } from '../src/domena/harmonogram';

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

  it('utrzymuje ratę po nadpłacie skracającej okres bez zmiany stopy', () => {
    const wynik = policzHarmonogram({
      ...parametryKontrolne,
      liczbaRat: 6,
      wskaznik: 'WIBOR_3M',
      stopaWskaznika: undefined,
      pierwszaRata: '2024-07-01',
      nadplaty: [{ miesiac: 1, kwotaGr: 1_000_000, tryb: 'skroc_okres' }],
    });

    expect(wynik.raty[3]?.rataGr).toBe(wynik.raty[2]?.rataGr);
  });

  it('sumuje nadpłaty przypadające na ten sam miesiąc', () => {
    const dwieNadplaty = policzHarmonogram({
      ...parametryKontrolne,
      liczbaRat: 6,
      nadplaty: [
        { miesiac: 2, kwotaGr: 600_000, tryb: 'obniz_rate' },
        { miesiac: 2, kwotaGr: 400_000, tryb: 'obniz_rate' },
      ],
    });
    const jednaNadplata = policzHarmonogram({
      ...parametryKontrolne,
      liczbaRat: 6,
      nadplaty: [{ miesiac: 2, kwotaGr: 1_000_000, tryb: 'obniz_rate' }],
    });

    expect(dwieNadplaty.raty[1]?.saldoPoGr).toBe(jednaNadplata.raty[1]?.saldoPoGr);
  });
});

describe('rekompensata za wcześniejszą spłatę z art. 40', () => {
  it.each([
    { kwotaGr: 5_000_000, miesiac: 1, stopa: 0.06, oczekiwaneGr: 150_000 },
    { kwotaGr: 2_000_000, miesiac: 40, stopa: 0.06, oczekiwaneGr: 0 },
    { kwotaGr: 1_000_000, miesiac: 5, stopa: 0.02, oczekiwaneGr: 20_000 },
  ])('liczy rekompensatę dla $kwotaGr gr w miesiącu $miesiac', ({ kwotaGr, miesiac, stopa, oczekiwaneGr }) => {
    expect(rekompensataArt40(kwotaGr, miesiac, stopa)).toBe(oczekiwaneGr);
  });

  it.each([
    { miesiac: 36, oczekiwaneGr: 150_000 },
    { miesiac: 37, oczekiwaneGr: 0 },
  ])('stosuje granicę 36. miesiąca dla miesiąca $miesiac', ({ miesiac, oczekiwaneGr }) => {
    expect(rekompensataArt40(5_000_000, miesiac, 0.06)).toBe(oczekiwaneGr);
  });

  it('pokazuje rekompensatę w harmonogramie bez zmiany salda', () => {
    const bezRekompensaty = policzHarmonogram({
      ...parametryKontrolne,
      kwotaGr: 30_000_000,
      liczbaRat: 240,
      stopaWskaznika: 0.0666,
      marza: 0,
    });
    const zRekompensata = policzHarmonogram({
      ...parametryKontrolne,
      kwotaGr: 30_000_000,
      liczbaRat: 240,
      stopaWskaznika: 0.0666,
      marza: 0,
      nadplaty: [{ miesiac: 13, kwotaGr: 5_000_000, tryb: 'obniz_rate' }],
    });

    const wierszBezNadplaty = bezRekompensaty.raty[12];
    if (!wierszBezNadplaty) throw new Error('brak 13. raty w harmonogramie kontrolnym');
    expect(zRekompensata.raty[12]?.rekompensataGr).toBe(150_000);
    expect(zRekompensata.sumaRekompensatGr).toBe(150_000);
    expect(zRekompensata.raty[12]?.saldoPoGr).toBe(wierszBezNadplaty.saldoPoGr - 5_000_000);
    expect(zRekompensata.raty.reduce((suma, wiersz) => suma + wiersz.kapitalGr, 0)).toBe(30_000_000);
    expect(bezRekompensaty.raty.reduce((suma, wiersz) => suma + wiersz.kapitalGr, 0)).toBe(30_000_000);
  });
});