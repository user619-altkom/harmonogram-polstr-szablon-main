<#
Rutyna review pull requesta przez Copilot CLI (GitHub), wersja PowerShell 5.1 dla Windows.

Użycie:
  .\skrypty\review-pr.ps1 <numer PR>                                 review i komentarz na PR w bieżącym repo
  .\skrypty\review-pr.ps1 <numer PR> -DryRun                         review bez publikacji (stdout + plik)
  .\skrypty\review-pr.ps1 <owner/repo> <numer PR> [-DryRun]          PR w innym repo (gh -R), np. publiczny PR prowadzącego
  powershell -ExecutionPolicy Bypass -File skrypty\review-pr.ps1 1   gdy polityka wykonywania blokuje .ps1
Wymaga: gh i copilot zalogowane, uruchomienie z katalogu głównego repo (stąd czyta reguły review).

Kroki:
  1. pobiera diff PR:                       gh pr diff [-R owner/repo] N
  2. składa prompt = instrukcja + reguły z .github/instructions/review.instructions.md + diff
     i ZAPISUJE go do pliku .work/review/prompt-N.md
  3. pyta Copilot CLI krótkim poleceniem bez polskich znaków, żeby przeczytał ten plik i zrecenzował,
     bez prawa zapisu plików, bez shella i bez serwera MCP GitHuba:
     copilot -p "Przeczytaj plik .work/review/prompt-N.md ..." -s --deny-tool write --deny-tool shell --disable-builtin-mcps
     Dlaczego plik, a nie treść w -p: PowerShell 5.1 nie escapuje cudzysłowów w argumentach programów natywnych,
     a `copilot` z npm to shim .cmd, który tnie argumenty zawierające nową linię. Odczyt pliku z katalogu repo
     bez pytania o zgodę jest potwierdzony testem z tymi samymi flagami (macOS). Copilot CLI ignoruje stdin przy -p,
     więc potok też nie wchodzi w grę.
  4. zapisuje wynik do .work/review/review-N.md i:
     bez -DryRun: publikuje go jako komentarz     gh pr comment [-R owner/repo] N --body-file
     z -DryRun:   wypisuje go na stdout, nic nie publikuje (ćwiczenie na publicznym PR prowadzącego bez zaśmiecania go komentarzami)

Stan na 2026-09-22:
  potwierdzone testem: ta sama sekwencja w bash (skrypty/review-pr.sh) na macOS, oba tryby, na PR #1
  w agentGreg/harmonogram-polstr-szablon; na maszynie uczestnika (Windows 10, PowerShell 5.1, Copilot CLI 1.0.87)
  potwierdzono, że .ps1 się uruchamiają i że flagi --deny-tool/--allow-tool/-s są dostępne.
  założenia, do sprawdzenia rano: kodowanie polskich znaków w PowerShell 5.1 (skrypt wymusza UTF-8 na konsoli
  i zapisuje pliki bez BOM), gh.exe w PATH po instalacji przez winget i otwarciu nowego terminala.
#>
param(
    [Parameter(Position = 0)]
    [string]$Pierwszy,
    [Parameter(Position = 1)]
    [string]$Drugi,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Utf8BezBom = New-Object System.Text.UTF8Encoding($false)

# Argumenty pozycyjne: albo <numer>, albo <owner/repo> <numer>.
$Repo = ''
if ($Drugi) {
    $Repo = $Pierwszy
    $NumerPR = [int]$Drugi
} elseif ($Pierwszy) {
    $NumerPR = [int]$Pierwszy
} else {
    Write-Error 'Użycie: .\skrypty\review-pr.ps1 [owner/repo] <numer PR> [-DryRun]'
}
$OpcjaRepo = @()
if ($Repo) { $OpcjaRepo = @('-R', $Repo) }

$RegulyPlik = '.github/instructions/review.instructions.md'
$KatalogRoboczy = '.work/review'

if (-not (Test-Path $RegulyPlik)) {
    Write-Error "Brak pliku $RegulyPlik. Uruchom skrypt z katalogu głównego repo."
}
New-Item -ItemType Directory -Force -Path $KatalogRoboczy | Out-Null
$KatalogPelny = (Resolve-Path $KatalogRoboczy).Path

Write-Host "Pobieram diff PR #$NumerPR$(if ($Repo) { " z $Repo" })..."
$Diff = (gh pr diff @OpcjaRepo $NumerPR) -join "`n"
if ([string]::IsNullOrWhiteSpace($Diff)) {
    Write-Error 'Pusty diff, nie ma czego recenzować.'
}

# Reguły bez frontmattera YAML (pomijamy blok między pierwszym a drugim '---').
$Fm = 0
$Reguly = (Get-Content $RegulyPlik -Encoding UTF8 | ForEach-Object {
    if ($_ -eq '---') { $Fm++; return }
    if ($Fm -ne 1) { $_ }
}) -join "`n"

$Instrukcja = @"
Jesteś recenzentem kodu w projekcie TypeScript. Zrecenzuj poniższy diff pull requesta.
Stosuj wyłącznie podane niżej reguły. Nie czytaj innych plików, nie uruchamiaj poleceń, nie zmieniaj plików.
Odpowiedz po polsku w Markdown: lista uwag, każda zaczyna się od kategorii BŁĄD, RYZYKO lub STYL, potem plik i linia, potem jedno lub dwa zdania. Na końcu jedno zdanie werdyktu: do poprawy albo można mergować. Bez wstępu i bez podsumowania.

REGUŁY REVIEW:
$Reguly
"@

# Prompt zawsze idzie przez plik (patrz nagłówek, krok 3).
$PromptPlik = ".work/review/prompt-$NumerPR.md"
[System.IO.File]::WriteAllText((Join-Path $KatalogPelny "prompt-$NumerPR.md"), "$Instrukcja`n`nDIFF:`n$Diff`n", $Utf8BezBom)
$Polecenie = "Przeczytaj plik $PromptPlik i wykonaj zawarte w nim polecenie recenzji kodu. Nie czytaj innych plikow, nie uruchamiaj polecen, nie zmieniaj plikow. Odpowiedz wylacznie trescia recenzji po polsku."

Write-Host 'Pytam Copilot CLI (zwykle 20 do 60 s)...'
$Start = Get-Date
$Odpowiedz = (copilot -p $Polecenie -s --deny-tool write --deny-tool shell --disable-builtin-mcps) -join "`n"
$Sekundy = [int]((Get-Date) - $Start).TotalSeconds

$Wynik = Join-Path $KatalogRoboczy "review-$NumerPR.md"
$Tresc = "## Review z Copilot CLI (skrypty/review-pr.ps1, $Sekundy s)`n`n$Odpowiedz`n"
[System.IO.File]::WriteAllText((Join-Path $KatalogPelny "review-$NumerPR.md"), $Tresc, $Utf8BezBom)

if ($DryRun) {
    Write-Host "Tryb na sucho: nic nie publikuję. Wynik zapisany w $Wynik"
    Write-Host '----------------------------------------------------------------'
    Write-Output $Tresc
    exit 0
}

gh pr comment @OpcjaRepo $NumerPR --body-file $Wynik
Write-Host "Komentarz dodany do PR #$NumerPR. Kopia: $Wynik"
