#!/usr/bin/env bash
# Rutyna review pull requesta przez Copilot CLI (GitHub), wersja bash.
#
# Użycie:
#   skrypty/review-pr.sh <numer PR>                                  review i komentarz na PR w bieżącym repo
#   skrypty/review-pr.sh <numer PR> --dry-run                        review bez publikacji (stdout + plik)
#   skrypty/review-pr.sh <owner/repo> <numer PR> [--dry-run]         PR w innym repo (gh -R), np. publiczny PR prowadzącego
# Wymaga: gh i copilot zalogowane, uruchomienie z katalogu głównego repo (stąd czyta reguły review).
#
# Kroki:
#   1. pobiera diff PR:                       gh pr diff [-R owner/repo] N
#   2. składa prompt = instrukcja + reguły z .github/instructions/review.instructions.md + diff
#      (Copilot CLI ignoruje stdin, gdy podano -p, dlatego diff musi być w treści promptu)
#   3. pyta Copilot CLI bez prawa zapisu plików, bez shella i bez serwera MCP GitHuba:
#      copilot -p "..." -s --deny-tool write --deny-tool shell --disable-builtin-mcps
#   4. zapisuje wynik do .work/review/review-N.md i:
#      bez --dry-run: publikuje go jako komentarz     gh pr comment [-R owner/repo] N --body-file
#      z --dry-run:   wypisuje go na stdout, nic nie publikuje (ćwiczenie na publicznym PR prowadzącego bez zaśmiecania go komentarzami)
#
# Stan na 2026-09-22 (macOS, bash 3.2, gh 2.101, Copilot CLI 1.0.88):
#   potwierdzone testem: kroki 1 do 4 na PR #1 w agentGreg/harmonogram-polstr-szablon, oba tryby,
#   14 s łącznie (10 s w Copilot CLI), diff 32 linii, prompt ok. 3 000 znaków.
#   założenie: Linux zachowuje się tak samo; Windows używa skrypty/review-pr.ps1.
set -euo pipefail

UZYCIE="Użycie: skrypty/review-pr.sh [owner/repo] <numer PR> [--dry-run]"
REPO=""
PR=""
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    */*) REPO="$arg" ;;
    ''|*[!0-9]*) echo "Nieznany argument: $arg" >&2; echo "$UZYCIE" >&2; exit 2 ;;
    *) PR="$arg" ;;
  esac
done
if [[ -z "$PR" ]]; then
  echo "$UZYCIE" >&2
  exit 2
fi

# gh z opcjonalnym -R, żeby ta sama komenda działała dla bieżącego i obcego repo.
gh_pr() {
  if [[ -n "$REPO" ]]; then
    gh pr "$1" -R "$REPO" "${@:2}"
  else
    gh pr "$@"
  fi
}

REGULY_PLIK=".github/instructions/review.instructions.md"
KATALOG_ROBOCZY=".work/review"

if [[ ! -f "$REGULY_PLIK" ]]; then
  echo "Brak pliku $REGULY_PLIK. Uruchom skrypt z katalogu głównego repo." >&2
  exit 1
fi
mkdir -p "$KATALOG_ROBOCZY"

echo "Pobieram diff PR #$PR${REPO:+ z $REPO}..."
DIFF="$(gh_pr diff "$PR")"
if [[ -z "$DIFF" ]]; then
  echo "Pusty diff, nie ma czego recenzować." >&2
  exit 1
fi

# Reguły bez frontmattera YAML (pomijamy blok między pierwszym a drugim '---').
REGULY="$(awk 'BEGIN{fm=0} /^---$/{fm++; next} fm!=1{print}' "$REGULY_PLIK")"

PROMPT="Jesteś recenzentem kodu w projekcie TypeScript. Zrecenzuj poniższy diff pull requesta.
Stosuj wyłącznie podane niżej reguły. Nie czytaj innych plików, nie uruchamiaj poleceń, nie zmieniaj plików.
Odpowiedz po polsku w Markdown: lista uwag, każda zaczyna się od kategorii BŁĄD, RYZYKO lub STYL, potem plik i linia, potem jedno lub dwa zdania. Na końcu jedno zdanie werdyktu: do poprawy albo można mergować. Bez wstępu i bez podsumowania.

REGUŁY REVIEW:
$REGULY

DIFF:
$DIFF"

WYNIK="$KATALOG_ROBOCZY/review-$PR.md"
echo "Pytam Copilot CLI (zwykle 20 do 60 s)..."
START=$(date +%s)
copilot -p "$PROMPT" -s --deny-tool write --deny-tool shell --disable-builtin-mcps > "$WYNIK.tmp"
KONIEC=$(date +%s)
{
  echo "## Review z Copilot CLI (skrypty/review-pr.sh, $((KONIEC - START)) s)"
  echo
  cat "$WYNIK.tmp"
} > "$WYNIK"
rm -f "$WYNIK.tmp"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Tryb na sucho: nic nie publikuję. Wynik zapisany w $WYNIK"
  echo "----------------------------------------------------------------"
  cat "$WYNIK"
  exit 0
fi

gh_pr comment "$PR" --body-file "$WYNIK"
echo "Komentarz dodany do PR #$PR. Kopia: $WYNIK"
