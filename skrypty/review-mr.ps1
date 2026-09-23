<#
Rutyna review merge requesta przez Copilot CLI (GitLab, glab), wersja PowerShell 5.1 dla Windows.

Użycie:
  .\skrypty\review-mr.ps1 <numer MR>                                 review i notatka na MR w bieżącym repo
  .\skrypty\review-mr.ps1 <numer MR> -DryRun                         review bez publikacji (stdout + plik)
  .\skrypty\review-mr.ps1 <grupa/projekt> <numer MR> [-DryRun]       MR w innym projekcie (glab -R)
  powershell -ExecutionPolicy Bypass -File skrypty\review-mr.ps1 1   gdy polityka wykonywania blokuje .ps1
Wymaga: glab zalogowany do Twojej instancji (glab auth login --hostname <host>), copilot zalogowany,
uruchomienie z katalogu głównego repo (stąd czyta reguły review).

Kroki:
  1. pobiera diff MR:                        glab mr diff N --raw [-R grupa/projekt]
  2. składa prompt = instrukcja + reguły z .github/instructions/review.instructions.md + diff
     i ZAPISUJE go do pliku .work/review/prompt-N.md
  3. pyta Copilot CLI krótkim poleceniem bez polskich znaków, żeby przeczytał ten plik i zrecenzował,
     bez prawa zapisu plików, bez shella i bez serwera MCP GitHuba:
     copilot -p "Przeczytaj plik .work/review/prompt-N.md ..." -s --deny-tool write --deny-tool shell --disable-builtin-mcps
     Dlaczego plik, a nie treść w -p: PowerShell 5.1 nie escapuje cudzysłowów w argumentach programów natywnych,
     a `copilot` z npm to shim .cmd, który tnie argumenty zawierające nową linię. Odczyt pliku z katalogu repo
     bez pytania o zgodę jest potwierdzony testem z tymi samymi flagami (macOS).
  4. zapisuje wynik do .work/review/review-N.md i:
     bez -DryRun: publikuje go jako notatkę        glab mr note N -m "<treść>" [-R grupa/projekt] (domyślna akcja to create)
     z -DryRun:   wypisuje go na stdout, nic nie publikuje

Stan na 2026-09-22:
  potwierdzone testem: krok 3 (wywołanie copilot -p z tymi flagami i odczyt pliku) na macOS oraz składnia flag
  glab 1.118 z `glab mr diff --help` i `glab mr note --help`. Na maszynie uczestnika (Windows 10, PowerShell 5.1)
  potwierdzono, że glab jest zainstalowany i .ps1 się uruchamiają. Ten plik nie był uruchamiany end-to-end.
  założenia, nie da się ich sprawdzić bez dostępu do firmowego GitLaba:
    a) glab działa z self-hosted GitLab przez `glab auth login --hostname`,
    b) `glab mr note -m` przyjmuje wieloliniowy Markdown; jeśli nie, użyj
       `glab api projects/:id/merge_requests/N/notes -f body=@.work/review/review-N.md`,
    c) kodowanie polskich znaków w PowerShell 5.1 (skrypt wymusza UTF-8 na konsoli, pliki bez BOM).
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

# Argumenty pozycyjne: albo <numer>, albo <grupa/projekt> <numer>.
$Repo = ''
if ($Drugi) {
    $Repo = $Pierwszy
    $NumerMR = [int]$Drugi
} elseif ($Pierwszy) {
    $NumerMR = [int]$Pierwszy
} else {
    Write-Error 'Użycie: .\skrypty\review-mr.ps1 [grupa/projekt] <numer MR> [-DryRun]'
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

Write-Host "Pobieram diff MR !$NumerMR$(if ($Repo) { " z $Repo" })..."
$Diff = (glab mr diff $NumerMR --raw @OpcjaRepo) -join "`n"
if ([string]::IsNullOrWhiteSpace($Diff)) {
    Write-Error 'Pusty diff, nie ma czego recenzować.'
}

$Fm = 0
$Reguly = (Get-Content $RegulyPlik -Encoding UTF8 | ForEach-Object {
    if ($_ -eq '---') { $Fm++; return }
    if ($Fm -ne 1) { $_ }
}) -join "`n"

$Instrukcja = @"
Jesteś recenzentem kodu w projekcie TypeScript. Zrecenzuj poniższy diff merge requesta.
Stosuj wyłącznie podane niżej reguły. Nie czytaj innych plików, nie uruchamiaj poleceń, nie zmieniaj plików.
Odpowiedz po polsku w Markdown: lista uwag, każda zaczyna się od kategorii BŁĄD, RYZYKO lub STYL, potem plik i linia, potem jedno lub dwa zdania. Na końcu jedno zdanie werdyktu: do poprawy albo można mergować. Bez wstępu i bez podsumowania.

REGUŁY REVIEW:
$Reguly
"@

# Prompt zawsze idzie przez plik (patrz nagłówek, krok 3).
$PromptPlik = ".work/review/prompt-$NumerMR.md"
[System.IO.File]::WriteAllText((Join-Path $KatalogPelny "prompt-$NumerMR.md"), "$Instrukcja`n`nDIFF:`n$Diff`n", $Utf8BezBom)
$Polecenie = "Przeczytaj plik $PromptPlik i wykonaj zawarte w nim polecenie recenzji kodu. Nie czytaj innych plikow, nie uruchamiaj polecen, nie zmieniaj plikow. Odpowiedz wylacznie trescia recenzji po polsku."

Write-Host 'Pytam Copilot CLI (zwykle 20 do 60 s)...'
$Start = Get-Date
$Odpowiedz = (copilot -p $Polecenie -s --deny-tool write --deny-tool shell --disable-builtin-mcps) -join "`n"
$Sekundy = [int]((Get-Date) - $Start).TotalSeconds

$Wynik = Join-Path $KatalogRoboczy "review-$NumerMR.md"
$Tresc = "## Review z Copilot CLI (skrypty/review-mr.ps1, $Sekundy s)`n`n$Odpowiedz`n"
[System.IO.File]::WriteAllText((Join-Path $KatalogPelny "review-$NumerMR.md"), $Tresc, $Utf8BezBom)

if ($DryRun) {
    Write-Host "Tryb na sucho: nic nie publikuję. Wynik zapisany w $Wynik"
    Write-Host '----------------------------------------------------------------'
    Write-Output $Tresc
    exit 0
}

glab mr note $NumerMR -m $Tresc @OpcjaRepo
Write-Host "Notatka dodana do MR !$NumerMR. Kopia: $Wynik"
