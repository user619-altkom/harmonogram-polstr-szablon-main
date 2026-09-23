// Strona główna. Tu wchodzi ekran z Claude Design.
//
// Jak wkleić eksport z Claude Design (KARTA.md, tor równoległy):
// 1. W Claude Design wyeksportuj ekran jako komponent React z Tailwind, jeden plik, bez bibliotek UI.
// 2. Zastąp całą zawartość tego pliku wklejonym kodem.
// 3. Dopisz w pierwszej linii dyrektywę 'use client' (komponent trzyma stan formularza i robi fetch w przeglądarce).
// 4. Komponent ma być domyślnym eksportem: export default function Strona() { ... }.
// 5. Dane pobieraj przez fetch('/api/harmonogram?kwota=...&liczbaRat=...'), odpowiedź to JSON z tabelą rat.
// Podpięcie komponentu do route handlera robi agent w fazie 4.

const PRZYKLAD =
  '/api/harmonogram?kwota=400000&liczbaRat=300&marza=2.11&wskaznik=POLSTR_1M&typRat=rowne&pierwszaRata=2026-10-01';

export default function Strona() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-3xl font-semibold">Harmonogram na POLSTR</h1>
      <p className="text-lg">Tu wchodzi ekran z Claude Design.</p>
      <p>
        Szkielet działa. Endpoint obliczeń:{' '}
        <a className="break-all underline" href={PRZYKLAD}>
          {PRZYKLAD}
        </a>
      </p>
      <p className="text-sm text-neutral-600">
        Odpowiedź 501 „nie zaimplementowano” jest oczekiwana, dopóki fazy 1 do 3 nie zostaną scalone.
      </p>
    </main>
  );
}
