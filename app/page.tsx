'use client';

import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';

type Wskaznik = 'POLSTR_1M' | 'WIBOR_3M';
type TypRat = 'rowne' | 'malejace';
type TrybNadplaty = 'obniz_rate' | 'skroc_okres';

type NadplataForm = {
  id: number;
  miesiac: string;
  kwota: string;
  tryb: TrybNadplaty;
};

type Rata = {
  numer: number;
  data: string;
  kapital: number;
  odsetki: number;
  rata: number;
  saldoPo: number;
};

type Wynik = {
  raty: Rata[];
  sumaOdsetek: number;
};

// Krój „Plus Jakarta Sans” najlepiej załadować w layoutcie (np. next/font/google).
// Bez tego strona użyje systemowego kroju bezszeryfowego.
const KROJ = { fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif' };

// ---------- Formatowanie ----------

// Własny formatter zamiast Intl: pl-PL domyślnie nie grupuje liczb 4-cyfrowych
// (np. „1234,56”), a wymagany jest separator tysięcy w każdej kwocie.
function formatKwota(wartosc: number): string {
  if (!Number.isFinite(wartosc)) return '—';
  const ujemna = wartosc < 0;
  const [calkowita = '0', ulamek = '00'] = Math.abs(wartosc).toFixed(2).split('.');
  const zGrupami = calkowita.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${ujemna ? '−' : ''}${zGrupami},${ulamek} zł`;
}

// Kwota do CSV: bez separatora tysięcy, przecinek dziesiętny (polski Excel).
function kwotaCsv(wartosc: number): string {
  return Number.isFinite(wartosc) ? wartosc.toFixed(2).replace('.', ',') : '';
}

// YYYY-MM-DD -> DD.MM.YYYY; inne formaty zostawiamy bez zmian.
function formatData(data: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : data;
}

function poleCsv(wartosc: string | number): string {
  const tekst = String(wartosc);
  return /[";\r\n]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst;
}

// ---------- Ikony (inline SVG) ----------

function IkonaPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IkonaKosz() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

function IkonaStrzalka() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IkonaPobierz() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-[18px] w-[18px] animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ---------- Drobne komponenty UI ----------

function Pole({ etykieta, htmlFor, children }: { etykieta: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-gray-700">
        {etykieta}
      </label>
      {children}
    </div>
  );
}

// Pole tekstowe z jednostką wewnątrz (PLN, mies., p.p.).
function PoleWejscia({
  jednostka,
  jasne = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { jednostka?: string; jasne?: boolean }) {
  return (
    <div
      className={
        'flex h-[52px] items-center gap-2 rounded-xl border border-[#e7e9ef] px-4 transition ' +
        'focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/15 ' +
        (jasne ? 'bg-white' : 'bg-[#f6f7f9]')
      }
    >
      <input
        {...props}
        className={
          'min-w-0 flex-1 bg-transparent text-base font-semibold text-gray-900 outline-none placeholder:font-medium placeholder:text-gray-400 ' +
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
        }
      />
      {jednostka && <span className="text-[13px] font-semibold text-gray-400">{jednostka}</span>}
    </div>
  );
}

function Przelacznik<T extends string>({
  legenda,
  nazwa,
  wartosc,
  opcje,
  onZmiana,
  ukryjLegende = false,
}: {
  legenda: string;
  nazwa: string;
  wartosc: T;
  opcje: { wartosc: T; etykieta: string }[];
  onZmiana: (w: T) => void;
  ukryjLegende?: boolean;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={ukryjLegende ? 'sr-only' : 'mb-2 text-[13px] font-semibold text-gray-700'}>{legenda}</legend>
      <div className="flex w-full gap-1 rounded-full bg-[#eef0f4] p-1">
        {opcje.map((o) => {
          const aktywna = o.wartosc === wartosc;
          return (
            <label
              key={o.wartosc}
              className={
                'flex h-11 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-3 text-sm transition ' +
                'focus-within:ring-2 focus-within:ring-indigo-500/50 ' +
                (aktywna
                  ? 'bg-white font-bold text-gray-900 shadow-[0_1px_3px_rgba(16,24,40,0.12)]'
                  : 'font-semibold text-gray-500 hover:text-gray-800')
              }
            >
              <input
                type="radio"
                name={nazwa}
                value={o.wartosc}
                checked={aktywna}
                onChange={() => onZmiana(o.wartosc)}
                className="sr-only"
              />
              {o.etykieta}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Kafelek({
  tytul,
  wartosc,
  opis,
  wyrozniony = false,
  children,
}: {
  tytul: string;
  wartosc: string;
  opis?: string;
  wyrozniony?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={
        'flex flex-col gap-2.5 rounded-[20px] p-6 ' +
        (wyrozniony ? 'bg-gray-900 text-white' : 'border border-[#e7e9ef] bg-white text-gray-900')
      }
    >
      <p className={'text-[13px] font-semibold ' + (wyrozniony ? 'text-[#c7cbe0]' : 'text-gray-500')}>{tytul}</p>
      <p className="text-[28px] font-extrabold leading-tight tracking-tight tabular-nums sm:text-[32px]">{wartosc}</p>
      {children}
      {opis && <p className={'text-[13px] ' + (wyrozniony ? 'text-[#c7cbe0]' : 'text-gray-500')}>{opis}</p>}
    </div>
  );
}

// ---------- Strona ----------

export default function Strona() {
  const [kwota, setKwota] = useState('');
  const [liczbaRat, setLiczbaRat] = useState('');
  const [pierwszaRata, setPierwszaRata] = useState('');
  const [marza, setMarza] = useState('');
  const [wskaznik, setWskaznik] = useState<Wskaznik>('WIBOR_3M');
  const [typRat, setTypRat] = useState<TypRat>('rowne');
  const [nadplaty, setNadplaty] = useState<NadplataForm[]>([]);
  const [nastepneId, setNastepneId] = useState(1);

  const [wynik, setWynik] = useState<Wynik | null>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [blad, setBlad] = useState<string | null>(null);

  function dodajNadplate() {
    setNadplaty((lista) => [...lista, { id: nastepneId, miesiac: '', kwota: '', tryb: 'obniz_rate' }]);
    setNastepneId((id) => id + 1);
  }

  function zmienNadplate(id: number, zmiana: Partial<NadplataForm>) {
    setNadplaty((lista) => lista.map((n) => (n.id === id ? { ...n, ...zmiana } : n)));
  }

  function usunNadplate(id: number) {
    setNadplaty((lista) => lista.filter((n) => n.id !== id));
  }

  // Podstawowa walidacja po stronie przeglądarki; ostateczna walidacja jest w API.
  function waliduj(): string | null {
    const k = Number(kwota);
    const n = Number(liczbaRat);
    const m = Number(marza);
    if (!kwota || !(k > 0)) return 'Podaj kwotę kredytu większą od zera.';
    if (!liczbaRat || !Number.isInteger(n) || n < 1) return 'Liczba rat musi być dodatnią liczbą całkowitą.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pierwszaRata)) return 'Podaj datę pierwszej raty.';
    if (marza === '' || !Number.isFinite(m) || m < 0) return 'Podaj marżę banku (liczba nieujemna).';
    for (let i = 0; i < nadplaty.length; i++) {
      const p = nadplaty[i];
      if (!p) continue;
      const mies = Number(p.miesiac);
      const kw = Number(p.kwota);
      if (!p.miesiac || !Number.isInteger(mies) || mies < 1 || mies > n)
        return `Nadpłata ${i + 1}: miesiąc musi być liczbą całkowitą od 1 do ${n}.`;
      if (!p.kwota || !(kw > 0)) return `Nadpłata ${i + 1}: podaj kwotę większą od zera.`;
    }
    return null;
  }

  async function policz(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ladowanie) return;

    const bladWalidacji = waliduj();
    if (bladWalidacji) {
      setBlad(bladWalidacji);
      return;
    }

    const parametry = [
      `kwota=${encodeURIComponent(kwota)}`,
      `liczbaRat=${encodeURIComponent(liczbaRat)}`,
      `marza=${encodeURIComponent(marza)}`,
      `wskaznik=${wskaznik}`,
      `typRat=${typRat}`,
      `pierwszaRata=${encodeURIComponent(pierwszaRata)}`,
    ];
    if (nadplaty.length > 0) {
      const dane = nadplaty.map((p) => ({ miesiac: Number(p.miesiac), kwota: Number(p.kwota), tryb: p.tryb }));
      parametry.push(`nadplaty=${encodeURIComponent(JSON.stringify(dane))}`);
    }

    setLadowanie(true);
    setBlad(null);
    try {
      const odp = await fetch(`/api/harmonogram?${parametry.join('&')}`);
      let json: unknown = null;
      try {
        json = await odp.json();
      } catch {
        json = null;
      }

      if (odp.status === 400) {
        const komunikat =
          json && typeof json === 'object' && typeof (json as { blad?: unknown }).blad === 'string'
            ? (json as { blad: string }).blad
            : 'Nieprawidłowe dane wejściowe.';
        setWynik(null);
        setBlad(komunikat);
        return;
      }
      if (!odp.ok) {
        setWynik(null);
        setBlad(`Nie udało się policzyć harmonogramu (błąd serwera ${odp.status}). Spróbuj ponownie.`);
        return;
      }
      const dane = json as Wynik | null;
      if (!dane || !Array.isArray(dane.raty)) {
        setWynik(null);
        setBlad('Serwer zwrócił nieoczekiwaną odpowiedź.');
        return;
      }
      setWynik(dane);
    } catch {
      setWynik(null);
      setBlad('Brak połączenia z serwerem. Sprawdź sieć i spróbuj ponownie.');
    } finally {
      setLadowanie(false);
    }
  }

  function eksportujCsv() {
    if (!wynik) return;
    const naglowki = ['Nr', 'Data', 'Kapitał', 'Odsetki', 'Rata', 'Saldo po spłacie'];
    const wiersze = wynik.raty.map((r) =>
      [r.numer, formatData(r.data), kwotaCsv(r.kapital), kwotaCsv(r.odsetki), kwotaCsv(r.rata), kwotaCsv(r.saldoPo)]
        .map(poleCsv)
        .join(';'),
    );
    // BOM, żeby Excel poprawnie rozpoznał UTF-8 (polskie znaki w nagłówkach).
    const tresc = '﻿' + [naglowki.map(poleCsv).join(';'), ...wiersze].join('\r\n');
    const blob = new Blob([tresc], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmonogram-splat-${pierwszaRata || 'kredyt'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const pierwsza = wynik?.raty[0];
  const ostatnia = wynik && wynik.raty.length > 0 ? wynik.raty[wynik.raty.length - 1] : undefined;
  const sumaRat = wynik ? wynik.raty.reduce((s, r) => s + r.rata, 0) : 0;
  const udzialOdsetek = wynik && sumaRat > 0 ? Math.round((wynik.sumaOdsetek / sumaRat) * 100) : null;

  const th = 'border-b border-[#eef0f4] bg-white px-4 pb-3 pt-4 text-xs font-bold uppercase tracking-[0.06em] text-gray-500';
  const td = 'whitespace-nowrap border-b border-[#f3f4f7] px-4 py-3';

  return (
    <main className="min-h-screen bg-[#f3f4f7] text-gray-900" style={KROJ}>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
        {/* ---------- Nagłówek ---------- */}
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-3">
            <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-800">
              Kredyt hipoteczny · symulacja dla klienta
            </span>
            <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.03em] text-[#0b1020] sm:text-[38px]">
              Harmonogram spłat
            </h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-gray-500 sm:text-right">
            Wprowadź parametry kredytu i ewentualne nadpłaty, a następnie kliknij „Policz”.
          </p>
        </header>

        {/* ---------- Formularz ---------- */}
        <form
          onSubmit={policz}
          noValidate
          aria-busy={ladowanie}
          className="rounded-[20px] border border-[#e7e9ef] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_rgba(16,24,40,0.05)]"
        >
          <div className="grid grid-cols-1 gap-5 px-5 pb-2 pt-6 sm:grid-cols-2 sm:px-8 sm:pt-7 lg:grid-cols-4">
            <Pole etykieta="Kwota kredytu" htmlFor="kwota">
              <PoleWejscia
                id="kwota"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="np. 450000"
                jednostka="PLN"
                value={kwota}
                onChange={(e) => setKwota(e.target.value)}
              />
            </Pole>
            <Pole etykieta="Liczba rat" htmlFor="liczbaRat">
              <PoleWejscia
                id="liczbaRat"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="np. 360"
                jednostka="mies."
                value={liczbaRat}
                onChange={(e) => setLiczbaRat(e.target.value)}
              />
            </Pole>
            <Pole etykieta="Data pierwszej raty" htmlFor="pierwszaRata">
              <PoleWejscia
                id="pierwszaRata"
                type="date"
                value={pierwszaRata}
                onChange={(e) => setPierwszaRata(e.target.value)}
              />
            </Pole>
            <Pole etykieta="Marża banku" htmlFor="marza">
              <PoleWejscia
                id="marza"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="np. 2.11"
                jednostka="p.p."
                value={marza}
                onChange={(e) => setMarza(e.target.value)}
              />
            </Pole>
          </div>

          <div className="grid grid-cols-1 gap-5 px-5 pb-7 pt-5 sm:grid-cols-2 sm:px-8">
            <Przelacznik<Wskaznik>
              legenda="Wskaźnik referencyjny"
              nazwa="wskaznik"
              wartosc={wskaznik}
              onZmiana={setWskaznik}
              opcje={[
                { wartosc: 'POLSTR_1M', etykieta: 'POLSTR 1M' },
                { wartosc: 'WIBOR_3M', etykieta: 'WIBOR 3M' },
              ]}
            />
            <Przelacznik<TypRat>
              legenda="Typ rat"
              nazwa="typRat"
              wartosc={typRat}
              onZmiana={setTypRat}
              opcje={[
                { wartosc: 'rowne', etykieta: 'Równe' },
                { wartosc: 'malejace', etykieta: 'Malejące' },
              ]}
            />
          </div>

          {/* ---------- Nadpłaty ---------- */}
          <div className="mx-5 flex flex-col gap-4 border-t border-[#eef0f4] py-6 sm:mx-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2.5">
                <h2 className="text-base font-bold tracking-tight">Nadpłaty</h2>
                <p className="text-[13px] text-gray-500">
                  opcjonalnie · miesiąc = numer raty, po której następuje nadpłata
                </p>
              </div>
              <button
                type="button"
                onClick={dodajNadplate}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-indigo-50 pl-3 pr-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
              >
                <IkonaPlus />
                Dodaj nadpłatę
              </button>
            </div>

            {nadplaty.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e2e5eb] px-4 py-4 text-center text-sm text-gray-500">
                Brak nadpłat — harmonogram zostanie policzony bez nich.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {nadplaty.map((n, i) => (
                  <li
                    key={n.id}
                    className="grid grid-cols-[2.25rem_1fr_2.75rem] items-end gap-3 rounded-2xl border border-[#eef0f4] bg-[#fafbfc] p-4 sm:gap-4 lg:grid-cols-[2.25rem_8.75rem_minmax(0,1fr)_minmax(0,1.2fr)_2.75rem]"
                  >
                    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-[13px] font-bold text-white lg:row-auto">
                      {i + 1}
                    </span>

                    <div className="col-start-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:contents">
                      <Pole etykieta="Miesiąc" htmlFor={`nadplata-miesiac-${n.id}`}>
                        <PoleWejscia
                          jasne
                          id={`nadplata-miesiac-${n.id}`}
                          type="number"
                          inputMode="numeric"
                          min={1}
                          step={1}
                          placeholder="np. 24"
                          value={n.miesiac}
                          onChange={(e) => zmienNadplate(n.id, { miesiac: e.target.value })}
                        />
                      </Pole>
                      <Pole etykieta="Kwota" htmlFor={`nadplata-kwota-${n.id}`}>
                        <PoleWejscia
                          jasne
                          id={`nadplata-kwota-${n.id}`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          placeholder="np. 20000"
                          jednostka="PLN"
                          value={n.kwota}
                          onChange={(e) => zmienNadplate(n.id, { kwota: e.target.value })}
                        />
                      </Pole>
                      <div className="sm:col-span-2 lg:col-span-1">
                        <Przelacznik<TrybNadplaty>
                          legenda={`Tryb nadpłaty ${i + 1}`}
                          nazwa={`nadplata-tryb-${n.id}`}
                          wartosc={n.tryb}
                          onZmiana={(t) => zmienNadplate(n.id, { tryb: t })}
                          ukryjLegende
                          opcje={[
                            { wartosc: 'obniz_rate', etykieta: 'Obniż ratę' },
                            { wartosc: 'skroc_okres', etykieta: 'Skróć okres' },
                          ]}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => usunNadplate(n.id)}
                      aria-label={`Usuń nadpłatę ${i + 1}`}
                      title="Usuń nadpłatę"
                      className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                    >
                      <IkonaKosz />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ---------- Akcje ---------- */}
          <div className="flex flex-col gap-4 rounded-b-[20px] border-t border-[#eef0f4] bg-[#fafbfc] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex-1">
              {blad && (
                <div role="alert" className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-extrabold text-white"
                  >
                    !
                  </span>
                  <span className="pt-0.5">
                    <strong className="font-bold">Nie można policzyć harmonogramu.</strong> {blad}
                  </span>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={ladowanie}
              className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-indigo-600 pl-8 pr-7 text-base font-bold text-white shadow-[0_1px_2px_rgba(16,24,40,0.1),0_8px_20px_rgba(79,70,229,0.28)] transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 disabled:cursor-wait disabled:opacity-75 sm:w-auto"
            >
              {ladowanie ? 'Liczenie…' : 'Policz'}
              {ladowanie ? <Spinner /> : <IkonaStrzalka />}
            </button>
          </div>
        </form>

        {/* ---------- Wyniki ---------- */}
        {wynik && (
          <section
            aria-labelledby="wyniki-naglowek"
            className={'mt-10 flex flex-col gap-5 transition-opacity ' + (ladowanie ? 'opacity-60' : '')}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="wyniki-naglowek" className="text-[22px] font-extrabold tracking-[-0.02em]">
                Wynik symulacji
              </h2>
              <button
                type="button"
                onClick={eksportujCsv}
                disabled={wynik.raty.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e7e9ef] bg-white pl-3 pr-4 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50"
              >
                <IkonaPobierz />
                Eksport CSV
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Kafelek
                wyrozniony
                tytul="Pierwsza rata"
                wartosc={pierwsza ? formatKwota(pierwsza.rata) : '—'}
                opis={pierwsza ? formatData(pierwsza.data) : undefined}
              />
              <Kafelek
                tytul="Ostatnia rata"
                wartosc={ostatnia ? formatKwota(ostatnia.rata) : '—'}
                opis={ostatnia ? `${formatData(ostatnia.data)} · rata nr ${ostatnia.numer}` : undefined}
              />
              <Kafelek
                tytul="Suma odsetek"
                wartosc={formatKwota(wynik.sumaOdsetek)}
                opis={udzialOdsetek !== null ? `Odsetki to ${udzialOdsetek}% łącznej kwoty spłat` : `Liczba rat: ${wynik.raty.length}`}
              >
                {udzialOdsetek !== null && (
                  <div
                    className="flex h-1.5 overflow-hidden rounded-full bg-indigo-100"
                    role="img"
                    aria-label={`Udział odsetek: ${udzialOdsetek}%`}
                  >
                    <div className="bg-indigo-600" style={{ width: `${Math.min(100, Math.max(0, udzialOdsetek))}%` }} />
                  </div>
                )}
              </Kafelek>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-[#e7e9ef] bg-white">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[680px] border-collapse text-sm tabular-nums">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th scope="col" className={th + ' pl-6 text-left'}>Nr</th>
                      <th scope="col" className={th + ' text-left'}>Data</th>
                      <th scope="col" className={th + ' text-right'}>Kapitał</th>
                      <th scope="col" className={th + ' text-right'}>Odsetki</th>
                      <th scope="col" className={th + ' text-right'}>Rata</th>
                      <th scope="col" className={th + ' pr-6 text-right'}>Saldo po spłacie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wynik.raty.map((r) => (
                      <tr key={r.numer} className="transition-colors hover:bg-indigo-50/60">
                        <td className={td + ' pl-6 font-semibold text-gray-400'}>{r.numer}</td>
                        <td className={td + ' text-gray-700'}>{formatData(r.data)}</td>
                        <td className={td + ' text-right text-gray-700'}>{formatKwota(r.kapital)}</td>
                        <td className={td + ' text-right text-gray-700'}>{formatKwota(r.odsetki)}</td>
                        <td className={td + ' text-right font-bold text-gray-900'}>{formatKwota(r.rata)}</td>
                        <td className={td + ' pr-6 text-right text-gray-700'}>{formatKwota(r.saldoPo)}</td>
                      </tr>
                    ))}
                    {wynik.raty.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          Brak rat w harmonogramie.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
