import { describe, expect, it } from 'vitest';
import { seriaWskaznika } from '../src/dane/wskazniki';
import { policzHarmonogram } from '../src/domena/harmonogram';

describe('dane wskaźników z katalogu dane/', () => {
  it.each(['POLSTR_1M', 'WIBOR_3M'] as const)('%s ma serię uporządkowaną rosnąco po dacie', (wskaznik) => {
    const seria = seriaWskaznika(wskaznik);
    expect(seria.length).toBeGreaterThan(0);
    for (const wpis of seria) {
      expect(wpis.od).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(wpis.stopa).toBeGreaterThan(0);
      expect(wpis.stopa).toBeLessThan(0.2);
    }
    const daty = seria.map((wpis) => wpis.od);
    expect([...daty].sort()).toEqual(daty);
  });
});

describe('domena', () => {
  it('policzHarmonogram jest szkieletem i zgłasza brak implementacji', () => {
    expect(() =>
      policzHarmonogram({
        kwotaGr: 400_000_00,
        liczbaRat: 300,
        marza: 0.0211,
        typRat: 'rowne',
        wskaznik: 'POLSTR_1M',
        pierwszaRata: '2026-10-01',
      }),
    ).toThrow('nie zaimplementowano');
  });

  it('testy działają w strefie Europe/Warsaw', () => {
    expect(process.env.TZ).toBe('Europe/Warsaw');
  });
});
