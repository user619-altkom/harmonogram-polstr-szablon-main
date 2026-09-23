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
  nadplaty?: Nadplata[];
}

export interface Nadplata {
  miesiac: number;
  kwotaGr: number;
  tryb: 'obniz_rate' | 'skroc_okres';
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

function rataAnnuitetowa(saldoGr: number, liczbaRat: number, stopaMiesieczna: number): number {
  if (stopaMiesieczna === 0) return saldoGr / liczbaRat;
  return saldoGr * stopaMiesieczna / (1 - (1 + stopaMiesieczna) ** -liczbaRat);
}

export function policzHarmonogram(parametry: ParametryKredytu): WynikHarmonogramu {
  if (parametry.kwotaGr <= 0 || !Number.isInteger(parametry.kwotaGr)) {
    throw new Error('kwotaGr musi być dodatnią liczbą całkowitą');
  }
  if (parametry.liczbaRat <= 0 || !Number.isInteger(parametry.liczbaRat)) {
    throw new Error('liczbaRat musi być dodatnią liczbą całkowitą');
  }
  const raty: WierszHarmonogramu[] = [];
  let saldoGr = parametry.kwotaGr;
  let sumaOdsetekGr = 0;
  let poprzedniaStopaRoczna: number | undefined;
  let rataBiezacaGr: number | undefined;

  for (let numer = 1; numer <= parametry.liczbaRat && saldoGr > 0; numer += 1) {
    const data = dodajMiesiac(parametry.pierwszaRata, numer - 1);
    const aktualizujStope = parametry.stopaWskaznika !== undefined
      ? numer === 1
      : parametry.wskaznik === 'POLSTR_1M' || numer === 1 || (numer - 1) % 3 === 0;
    if (aktualizujStope || poprzedniaStopaRoczna === undefined) {
      poprzedniaStopaRoczna = parametry.stopaWskaznika === undefined
        ? oprocentowanieOkresu(parametry.wskaznik, parametry.marza, data)
        : parametry.stopaWskaznika + parametry.marza;
    }
    const stopaMiesieczna = poprzedniaStopaRoczna / 12;
    const odsetkiGr = Math.round(saldoGr * stopaMiesieczna);
    const pozostaleRaty = parametry.liczbaRat - numer + 1;
    const rataWyliczonaGr = rataAnnuitetowa(saldoGr, pozostaleRaty, stopaMiesieczna);
    if (parametry.typRat === 'rowne' && (aktualizujStope || rataBiezacaGr === undefined)) {
      rataBiezacaGr = Math.round(rataWyliczonaGr);
    }
    const rataGr = parametry.typRat === 'malejace'
      ? rataWyliczonaGr
      : rataBiezacaGr ?? rataWyliczonaGr;
    const kapitalGr = numer === parametry.liczbaRat
      ? saldoGr
      : parametry.typRat === 'malejace'
        ? Math.min(saldoGr, Math.floor(parametry.kwotaGr / parametry.liczbaRat))
        : Math.min(saldoGr, Math.round(rataGr - odsetkiGr));
    let kapitalZNadplataGr = kapitalGr;
    let rataZNadplataGr = kapitalGr + odsetkiGr;
    saldoGr -= kapitalGr;

    const nadplata = parametry.nadplaty?.find((kandydat) => kandydat.miesiac === numer);
    if (nadplata) {
      if (!Number.isInteger(nadplata.kwotaGr) || nadplata.kwotaGr <= 0 || nadplata.kwotaGr > saldoGr) {
        throw new Error(`nadplata w miesiącu ${numer} przekracza saldo`);
      }
      saldoGr -= nadplata.kwotaGr;
      kapitalZNadplataGr += nadplata.kwotaGr;
      rataZNadplataGr += nadplata.kwotaGr;
    }

    sumaOdsetekGr += odsetkiGr;
    raty.push({ numer, data, kapitalGr: kapitalZNadplataGr, odsetkiGr, rataGr: rataZNadplataGr, saldoPoGr: saldoGr });
    if (nadplata && nadplata.tryb !== 'skroc_okres') rataBiezacaGr = undefined;
  }

  return { raty, sumaOdsetekGr };
}
