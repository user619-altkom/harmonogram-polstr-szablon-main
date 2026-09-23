import { seriaWskaznika, type WpisSerii } from '../dane/wskazniki';

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
  /** Opcjonalna stała stopa używana w teście liczby kontrolnej. */
  stopaWskaznika?: number;
}

export interface WierszHarmonogramu {
  numer: number;
  data: string;
  kapitalGr: number;
  odsetkiGr: number;
  rataGr: number;
  saldoPoGr: number;
}

export interface WynikHarmonogramu {
  raty: WierszHarmonogramu[];
  sumaOdsetekGr: number;
}

export function oprocentowanieOkresu(
  wskaznik: ParametryKredytu['wskaznik'],
  marza: number,
  data: string,
  seria: readonly WpisSerii[] = seriaWskaznika(wskaznik),
): number {
  const wpis = [...seria].reverse().find((kandydat) => kandydat.od <= data) ?? seria[0];
  if (!wpis) {
    throw new Error(`brak danych wskaźnika: ${wskaznik}`);
  }
  return wpis.stopa + marza;
}

function dodajMiesiac(data: string, liczbaMiesiecy: number): string {
  const dataUTC = new Date(`${data}T00:00:00Z`);
  const rok = dataUTC.getUTCFullYear();
  const miesiac = dataUTC.getUTCMonth() + liczbaMiesiecy;
  const dzien = dataUTC.getUTCDate();
  const ostatniDzienMiesiaca = new Date(Date.UTC(rok, miesiac + 1, 0)).getUTCDate();
  dataUTC.setUTCFullYear(rok, miesiac, Math.min(dzien, ostatniDzienMiesiaca));
  return dataUTC.toISOString().slice(0, 10);
}

export function policzHarmonogram(parametry: ParametryKredytu): WynikHarmonogramu {
  if (parametry.kwotaGr <= 0 || !Number.isInteger(parametry.kwotaGr)) {
    throw new Error('kwotaGr musi być dodatnią liczbą całkowitą');
  }
  if (parametry.liczbaRat <= 0 || !Number.isInteger(parametry.liczbaRat)) {
    throw new Error('liczbaRat musi być dodatnią liczbą całkowitą');
  }
  if (parametry.typRat !== 'rowne') {
    throw new Error('obsługiwane są obecnie tylko raty równe');
  }

  const raty: WierszHarmonogramu[] = [];
  let saldoGr = parametry.kwotaGr;
  let sumaOdsetekGr = 0;
  const stopaRoczna = parametry.stopaWskaznika === undefined
    ? oprocentowanieOkresu(parametry.wskaznik, parametry.marza, parametry.pierwszaRata)
    : parametry.stopaWskaznika + parametry.marza;
  const stopaMiesieczna = stopaRoczna / 12;
  const rataNominalnaGr = stopaMiesieczna === 0
    ? parametry.kwotaGr / parametry.liczbaRat
    : parametry.kwotaGr * stopaMiesieczna
      / (1 - (1 + stopaMiesieczna) ** -parametry.liczbaRat);

  for (let numer = 1; numer <= parametry.liczbaRat; numer += 1) {
    const data = dodajMiesiac(parametry.pierwszaRata, numer - 1);
    const rataGr = Math.round(rataNominalnaGr);
    const odsetkiNominalneGr = saldoGr * stopaMiesieczna;
    const odsetkiZaokragloneGr = Math.round(odsetkiNominalneGr);
    const kapitalGr = numer === parametry.liczbaRat
      ? saldoGr
      : rataGr - odsetkiZaokragloneGr;
    const odsetkiGr = numer === parametry.liczbaRat
      ? odsetkiZaokragloneGr
      : rataGr - kapitalGr;
    const rataKoncowaGr = kapitalGr + odsetkiGr;
    saldoGr -= kapitalGr;
    sumaOdsetekGr += odsetkiGr;
    raty.push({ numer, data, kapitalGr, odsetkiGr, rataGr: rataKoncowaGr, saldoPoGr: saldoGr });
  }

  return { raty, sumaOdsetekGr };
}
