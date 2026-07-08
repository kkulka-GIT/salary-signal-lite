# Salary Signal Lite

Jednoplikowa aplikacja MVP do anonimowego zbierania odchyleń wynagrodzeń i prezentowania odpornych statystyk: mediany oraz kwartylów Q1–Q3.

## Jak działa

1. Organizator podaje neutralny opis grupy i generuje losowy token.
2. Aplikacja tworzy link w formacie `?group=TOKEN`.
3. Uczestnicy dodają odchylenia w zakresie od -2000 do 2000 PLN.
4. Widok wyników filtruje wpisy po tokenie i pokazuje liczebność, medianę oraz środkową połowę rozkładu (Q1–Q3).

To jest wersja demonstracyjna bez backendu. Dane są przechowywane w lokalnej tablicy JavaScript, wyłącznie w pamięci bieżącej karty. Nie są współdzielone między urządzeniami i znikają po odświeżeniu strony.

## Token

Token jest losowym identyfikatorem grupy. Pozwala wybrać grupę poprzez parametr adresu URL.

Token **nie jest** hasłem, mechanizmem autoryzacji ani zabezpieczeniem. Każda osoba posiadająca link może poznać token. MVP nie chroni również przed wielokrotnym lub celowo fałszywym dodawaniem danych.

## Prywatność i statystyka

Aplikacja nie zbiera imion, adresów e-mail, nazw pracodawców ani dokładnych wynagrodzeń. Rekord w pamięci zawiera token grupy, opis, liczbowe odchylenie i znacznik czasu.

Wartości są sortowane numerycznie. Mediana to środkowa wartość (lub średnia dwóch środkowych), a Q1 i Q3 to mediany dolnej i górnej połowy próby. Miary te są mniej podatne na pojedyncze wartości skrajne niż średnia.

## Uruchomienie lokalne

Nie trzeba instalować zależności. Otwórz plik `index.html` w przeglądarce.

Możesz też uruchomić prosty serwer lokalny:

```bash
python3 -m http.server 8000
```

Następnie wejdź na `http://localhost:8000`.

## Planowany backend

Kolejnym etapem może być prosty backend oparty na Google Sheets (np. przez Google Apps Script), umożliwiający współdzielenie danych pomiędzy uczestnikami. Przed takim wdrożeniem potrzebne będą walidacja po stronie serwera, ograniczanie nadużyć, polityka retencji oraz jednoznaczna informacja o prywatności.

## Technologia

- jeden plik `index.html` zawierający HTML, CSS i JavaScript
- brak frameworków i zależności
- hosting statyczny przez GitHub Pages

## Licencja

MIT
