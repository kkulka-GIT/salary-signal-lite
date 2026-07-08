# Salary Signal Lite

Jednoplikowa aplikacja MVP do anonimowego zbierania odchyleń wynagrodzeń i prezentowania mediany, kwartylów Q1–Q3 oraz szacowanego środka grupy.

## Status projektu

- frontend: publiczny GitHub Pages, czysty HTML/CSS/JS w jednym `index.html`;
- tryb lokalny: gotowy i aktywny, dopóki `BACKEND_URL` jest pusty;
- backend: kompletny kod Google Apps Script jest w `apps-script/Code.gs`;
- tryb live: wymaga ręcznego wdrożenia Web App i wpisania jego URL do frontendu.

Projekt działa pod adresem: <https://kkulka-git.github.io/salary-signal-lite/>

## Jak działa

1. Organizator podaje neutralny opis grupy. Aplikacja generuje losowy token i link `?group=TOKEN`.
2. Uczestnicy podają odchylenia względem ustalonego środka grupy, a nie dokładne wynagrodzenia.
3. Wyniki pokazują liczbę wpisów, medianę odchylenia, Q1–Q3 i `initialCenter + mediana` jako szacowany środek.
4. Anonimowe dane wejściowe można wyświetlić dopiero od progu z konfiguracji (domyślnie 5). UI pokazuje wyłącznie odchylenia, bez timestampów i metadanych.

## Dwa tryby pracy

### Tryb lokalny

Gdy stała `BACKEND_URL` w `index.html` jest pusta, grupy i wpisy istnieją wyłącznie w pamięci otwartej karty. Nie są współdzielone i znikają po odświeżeniu.

### Tryb live — Google Sheets

Po wdrożeniu Google Apps Script frontend:

- tworzy grupę przez POST `createGroup`;
- pobiera grupę, zaakceptowane wpisy i konfigurację przez GET `getData`;
- zapisuje odchylenie przez POST `submitDeviation`;
- potwierdza zapis przez kolejny odczyt GET.

Dane trafiają do arkusza [Salary Signal Lite Data](https://docs.google.com/spreadsheets/d/1VH20mCtdQQbes3sM-158Z8r5Z0Ir8D4QoMjXulsCnHg/edit). Backend wymaga ręcznego wdrożenia Google Apps Script — samo umieszczenie `Code.gs` w repozytorium go nie uruchamia. Pełna instrukcja: [`apps-script/README.md`](apps-script/README.md).

Komunikacja uwzględnia ograniczenia CORS Apps Script: GET zwraca JSON, natomiast POST jest prostym żądaniem `text/plain` w trybie `no-cors`. Ponieważ jego odpowiedź jest nieczytelna, frontend potwierdza stan przez GET i nie ponawia automatycznie niepewnego zapisu.

## Uruchomienie lokalne

Otwórz `index.html` w przeglądarce albo uruchom serwer:

```bash
python3 -m http.server 8000
```

Następnie wejdź na <http://localhost:8000>.

## Konfiguracja backendu

Po wdrożeniu Web App wklej URL kończący się `/exec` na początku skryptu w `index.html`:

```js
const BACKEND_URL = "https://script.google.com/macros/s/TWOJE_DEPLOYMENT_ID/exec";
```

Nie wklejaj URL arkusza — frontend potrzebuje adresu wdrożenia Apps Script.

## Prywatność i ograniczenia

- Token identyfikuje grupę, nie użytkownika. Nie jest hasłem ani kontrolą dostępu.
- Każdy, kto zna token, może odczytać wynik grupy.
- System nie zbiera dokładnych wynagrodzeń, ale w trybie live przechowuje token, odchylenie, czas i techniczne metadane wymienione w schemacie arkusza.
- Mała grupa lub charakterystyczne odchylenia mogą nadal umożliwiać wnioskowanie o osobach. Dlatego surowe odchylenia są ukryte poniżej progu 5 wpisów.
- Mediana i kwartyle ograniczają wpływ pojedynczych wartości skrajnych, ale nie chronią przed masowym fałszowaniem.
- Brak rate limitingu, uwierzytelniania i moderacji. To MVP do grup opartych na zaufaniu, nie system HR ani źródło decyzji płacowych.

## Ręczne testy

### Tryb lokalny

1. Otwórz stronę bez parametru i sprawdź komunikat „Tryb lokalny”.
2. Utwórz grupę i sprawdź token oraz link.
3. Skopiuj link.
4. Otwórz `?group=TOKEN` i sprawdź widoki grupy (po odświeżeniu lokalny opis zastępuje etykieta z tokenem).
5. Bez odświeżania dodaj wartości `-300`, `0`, `500`, `800`, `1000`.
6. Sprawdź liczbę wpisów, medianę, Q1–Q3 i szacowany środek.
7. Sprawdź, że lista danych wejściowych jest blokowana poniżej 5 wpisów i dostępna od 5.

### Tryb live

1. Wdróż Apps Script według `apps-script/README.md` i ustaw `BACKEND_URL`.
2. Sprawdź komunikat „Tryb live”.
3. Utwórz grupę i potwierdź nowy wiersz w zakładce `groups`.
4. Otwórz wygenerowany link w drugiej karcie lub przeglądarce i sprawdź opis grupy.
5. Dodaj wpis i potwierdź wiersz z `accepted = true` w `submissions`.
6. Odśwież stronę i sprawdź, że wyniki zostały odczytane ze wspólnego backendu.
7. Wyślij wartość poza zakresem i potwierdź w arkuszu `accepted = false` oraz `reject_reason`.

## Struktura

```text
index.html
README.md
apps-script/
  Code.gs
  README.md
```

## Technologia

- jeden plik frontendowy bez frameworków, bundlera i zależności;
- Google Apps Script + Google Sheets jako opcjonalny backend;
- GitHub Pages jako hosting statyczny.
