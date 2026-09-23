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
  rekompensataGr: number;
  saldoPoGr: number;
}

export interface WynikHarmonogramu {
  raty: WierszHarmonogramu[];
  sumaOdsetekGr: number;
  sumaRekompensatGr: number;
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

export function rekompensataArt40(kwotaGr: number, miesiac: number, stopaRoczna: number): number {
  if (miesiac > 36) return 0;
  return Math.round(Math.min(kwotaGr * 0.03, kwotaGr * stopaRoczna));
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
  let sumaRekompensatGr = 0;
  let poprzedniaStopaRoczna: number | undefined;
  let rataBiezacaGr: number | undefined;

  for (let numer = 1; numer <= parametry.liczbaRat && saldoGr > 0; numer += 1) {
    const data = dodajMiesiac(parametry.pierwszaRata, numer - 1);
    const aktualizujStope = parametry.stopaWskaznika !== undefined
      ? numer === 1
      : parametry.wskaznik === 'POLSTR_1M' || numer === 1 || (numer - 1) % 3 === 0;
    const nowaStopaRoczna = parametry.stopaWskaznika === undefined
      ? oprocentowanieOkresu(parametry.wskaznik, parametry.marza, data)
      : parametry.stopaWskaznika + parametry.marza;
    const stopaZmienilaSie = poprzedniaStopaRoczna === undefined
      || (aktualizujStope && poprzedniaStopaRoczna !== nowaStopaRoczna);
    if (aktualizujStope && stopaZmienilaSie) {
      poprzedniaStopaRoczna = nowaStopaRoczna;
    }
    if (poprzedniaStopaRoczna === undefined) poprzedniaStopaRoczna = nowaStopaRoczna;
    const stopaMiesieczna = poprzedniaStopaRoczna / 12;
    const odsetkiGr = Math.round(saldoGr * stopaMiesieczna);
    const pozostaleRaty = parametry.liczbaRat - numer + 1;
    const rataWyliczonaGr = rataAnnuitetowa(saldoGr, pozostaleRaty, stopaMiesieczna);
    if (parametry.typRat === 'rowne' && (stopaZmienilaSie || rataBiezacaGr === undefined)) {
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

    const nadplatyWOkresie = parametry.nadplaty?.filter((kandydat) => kandydat.miesiac === numer) ?? [];
    const nadplataKwotaGr = nadplatyWOkresie.reduce((suma, nadplata) => suma + nadplata.kwotaGr, 0);
    const nadplata = nadplatyWOkresie[0];
    const rekompensataWOkresieGr = nadplatyWOkresie.reduce(
      (suma, nadplataWOkresie) => suma + rekompensataArt40(nadplataWOkresie.kwotaGr, numer, poprzedniaStopaRoczna ?? nowaStopaRoczna),
      0,
    );
    if (nadplata) {
      if (!Number.isInteger(nadplataKwotaGr) || nadplataKwotaGr <= 0 || nadplataKwotaGr > saldoGr) {
        throw new Error(`nadplata w miesiącu ${numer} przekracza saldo`);
      }
      saldoGr -= nadplataKwotaGr;
      kapitalZNadplataGr += nadplataKwotaGr;
      rataZNadplataGr += nadplataKwotaGr;
    }

    sumaOdsetekGr += odsetkiGr;
    sumaRekompensatGr += rekompensataWOkresieGr;
    raty.push({
      numer,
      data,
      kapitalGr: kapitalZNadplataGr,
      odsetkiGr,
      rataGr: rataZNadplataGr,
      rekompensataGr: rekompensataWOkresieGr,
      saldoPoGr: saldoGr,
    });
    if (nadplata && nadplata.tryb !== 'skroc_okres') rataBiezacaGr = undefined;
  }

  return { raty, sumaOdsetekGr, sumaRekompensatGr };
}
