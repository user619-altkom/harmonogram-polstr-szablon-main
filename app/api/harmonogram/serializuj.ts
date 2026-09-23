import type { WynikHarmonogramu } from '../../../src/domena/harmonogram';

export function serializujWynik(harmonogram: WynikHarmonogramu) {
  return {
    raty: harmonogram.raty.map((wiersz) => ({
      numer: wiersz.numer,
      data: wiersz.data,
      kapital: wiersz.kapitalGr / 100,
      odsetki: wiersz.odsetkiGr / 100,
      rata: wiersz.rataGr / 100,
      saldoPo: wiersz.saldoPoGr / 100,
    })),
    sumaOdsetek: harmonogram.sumaOdsetekGr / 100,
  };
}