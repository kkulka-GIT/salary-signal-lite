# Wdrożenie backendu Google Apps Script

Backend korzysta z istniejących zakładek `groups`, `submissions` i `config`. Kod nie tworzy ani nie zmienia nagłówków arkusza.

## Wdrożenie

1. Otwórz arkusz [Salary Signal Lite Data](https://docs.google.com/spreadsheets/d/1VH20mCtdQQbes3sM-158Z8r5Z0Ir8D4QoMjXulsCnHg/edit).
2. Wybierz **Rozszerzenia → Apps Script**.
3. Usuń przykładową funkcję z edytora i wklej całą zawartość pliku [`Code.gs`](./Code.gs).
4. Zapisz projekt.
5. Wybierz **Deploy → New deployment**.
6. Jako typ wybierz **Web app**.
7. Ustaw **Execute as: Me**.
8. Ustaw **Who has access: Anyone**.
9. Kliknij **Deploy**, zaakceptuj wymagane uprawnienia i skopiuj adres **Web App URL** kończący się `/exec`.
10. W `index.html` wklej adres do stałej `BACKEND_URL`:

    ```js
    const BACKEND_URL = "https://script.google.com/macros/s/TWOJE_DEPLOYMENT_ID/exec";
    ```

11. Zacommituj zmianę i wypchnij ją na `main`.
12. Otwórz GitHub Pages i sprawdź utworzenie grupy, dodanie wpisu oraz odczyt wyników.

## CORS i sposób komunikacji

Odczyt używa zwykłego `fetch` GET i odpowiedzi JSON z `ContentService`.

Zapis używa prostego POST z `Content-Type: text/plain;charset=utf-8` i `mode: "no-cors"`. Odpowiedź takiego żądania jest celowo nieczytelna dla JavaScriptu. Frontend nie udaje, że ją odczytał: po zapisie wykonuje GET `getData` i potwierdza stan na podstawie danych zwróconych przez backend. Ten wariant omija preflight CORS i jest praktyczny dla Apps Script Web App.

Nie należy zmieniać POST na `application/json` bez przetestowania preflight i przekierowań Apps Script. Nie należy też automatycznie ponawiać niepotwierdzonego POST — mogłoby to dodać ten sam wpis dwa razy.

## Aktualizacja wdrożenia

Po każdej zmianie `Code.gs` utwórz nową wersję istniejącego deploymentu: **Deploy → Manage deployments → Edit → New version → Deploy**. Sam zapis kodu w edytorze nie aktualizuje publicznej wersji Web App.

## Szybki test API

Po wdrożeniu otwórz w przeglądarce:

```text
WEB_APP_URL?action=getData&group=ISTNIEJACY_TOKEN
```

Odpowiedź musi być JSON-em. Dla nieistniejącej grupy oczekiwane jest `{"ok":false,"error":"GROUP_NOT_FOUND"}`.

## Ograniczenia

- Token nie jest hasłem ani mechanizmem autoryzacji.
- Publiczny Web App może być wywoływany przez każdego, kto zna URL.
- MVP nie ma rate limitingu ani ochrony przed masowym dodawaniem danych.
- Właściciel arkusza odpowiada za dostęp, retencję i kopie danych.
