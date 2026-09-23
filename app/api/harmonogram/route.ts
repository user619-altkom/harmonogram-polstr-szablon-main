import { NextResponse } from 'next/server';
import { policzHarmonogram, type Nadplata, type ParametryKredytu } from '../../../src/domena/harmonogram';
import { serializujWynik } from './serializuj';

// Route handler jest cienki: parsuje parametry z query string, woła domenę, zwraca JSON.
// Żadnych obliczeń finansowych w tym pliku. Przeliczenie jednostek wejścia
// (złote na grosze, punkty procentowe na ułamek) to część parsowania kontraktu API.

const PRZYKLAD =
  '/api/harmonogram?kwota=400000&liczbaRat=300&marza=2.11&wskaznik=POLSTR_1M&typRat=rowne&pierwszaRata=2026-10-01';

function parsujParametry(szukane: URLSearchParams): ParametryKredytu | string {
  const kwota = Number(szukane.get('kwota'));
  const liczbaRat = Number(szukane.get('liczbaRat'));
  const marza = Number(szukane.get('marza'));
  const wskaznik = szukane.get('wskaznik');
  const typRat = szukane.get('typRat');
  const pierwszaRata = szukane.get('pierwszaRata') ?? '';

  if (!Number.isFinite(kwota) || kwota <= 0) return 'kwota: liczba dodatnia w złotych, np. 400000';
  if (!Number.isInteger(liczbaRat) || liczbaRat <= 0) return 'liczbaRat: liczba całkowita dodatnia, np. 300';
  if (!Number.isFinite(marza) || marza < 0) return 'marza: punkty procentowe, np. 2.11';
  if (wskaznik !== 'POLSTR_1M' && wskaznik !== 'WIBOR_3M') return 'wskaznik: POLSTR_1M albo WIBOR_3M';
  if (typRat !== 'rowne' && typRat !== 'malejace') return 'typRat: rowne albo malejace';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pierwszaRata)) return 'pierwszaRata: data YYYY-MM-DD';

  const tekstNadplat = szukane.get('nadplaty');
  let nadplaty: Nadplata[] | undefined;
  if (tekstNadplat) {
    try {
      const wartosc: unknown = JSON.parse(tekstNadplat);
      if (!Array.isArray(wartosc)) return 'nadplaty: tablica obiektów';
      nadplaty = [];
      for (const element of wartosc) {
        if (!element || typeof element !== 'object') return 'nadplaty: niepoprawny obiekt';
        const dane = element as { miesiac?: unknown; kwota?: unknown; tryb?: unknown };
        const miesiac = dane.miesiac;
        const kwota = dane.kwota;
        if (typeof miesiac !== 'number' || !Number.isInteger(miesiac) || miesiac < 1 || miesiac > liczbaRat) {
          return `nadplaty: miesiąc musi być liczbą całkowitą od 1 do ${liczbaRat}`;
        }
        if (typeof kwota !== 'number' || !Number.isFinite(kwota) || kwota <= 0) {
          return 'nadplaty: kwota musi być dodatnią liczbą w złotych';
        }
        if (dane.tryb !== 'obniz_rate' && dane.tryb !== 'skroc_okres') {
          return 'nadplaty: tryb musi być obniz_rate albo skroc_okres';
        }
        nadplaty.push({ miesiac, kwotaGr: Math.round(kwota * 100), tryb: dane.tryb });
      }
    } catch {
      return 'nadplaty: niepoprawny JSON';
    }
  }

  return {
    kwotaGr: Math.round(kwota * 100),
    liczbaRat,
    marza: marza / 100,
    wskaznik,
    typRat,
    pierwszaRata,
    nadplaty,
  };
}

export function GET(request: Request) {
  const parametry = parsujParametry(new URL(request.url).searchParams);
  if (typeof parametry === 'string') {
    return NextResponse.json({ blad: parametry, przyklad: PRZYKLAD }, { status: 400 });
  }

  try {
    const harmonogram = policzHarmonogram(parametry);
    return NextResponse.json(serializujWynik(harmonogram));
  } catch (blad) {
    const komunikat = blad instanceof Error ? blad.message : String(blad);
    if (komunikat.startsWith('nie zaimplementowano')) {
      return NextResponse.json({ blad: komunikat, parametry, przyklad: PRZYKLAD }, { status: 501 });
    }
    return NextResponse.json({ blad: komunikat }, { status: 400 });
  }
}
