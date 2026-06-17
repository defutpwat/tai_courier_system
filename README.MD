# Courier Delivery System

Webowa aplikacja do zarządzania przesyłkami kurierskimi z trzema rolami użytkowników: **Klient**, **Kurier** i **Administrator**. System obsługuje pełny cykl życia paczki — od nadania, przez płatność PayPal, przypisanie kuriera, dostarczenie, aż po archiwizację.

---

## Spis treści

1. [Stos technologiczny](#stos-technologiczny)
2. [Architektura](#architektura)
3. [Funkcjonalności](#funkcjonalności)
4. [Bezpieczeństwo i autoryzacja](#bezpieczeństwo-i-autoryzacja)
5. [Integracje zewnętrzne](#integracje-zewnętrzne)
6. [Struktura projektu](#struktura-projektu)
7. [Uruchomienie lokalne](#uruchomienie-lokalne)
8. [Zmienne środowiskowe](#zmienne-środowiskowe)
9. [Domyślne konta testowe](#domyślne-konta-testowe)
10. [Model danych](#model-danych)
11. [API — przegląd endpointów](#api--przegląd-endpointów)

---

## Stos technologiczny

### Backend
| Technologia | Rola |
|-------------|------|
| **Python 3.10+** | Język backendu |
| **FastAPI** | Framework REST API |
| **SQLAlchemy** | ORM do bazy danych |
| **SQLite** | Baza danych (plik `courier.db`) |
| **Pydantic v2** | Walidacja danych wejściowych i wyjściowych |
| **passlib + bcrypt** | Hashowanie haseł |
| **python-jose** | Generowanie i weryfikacja tokenów JWT |
| **httpx** | Asynchroniczne zapytania do zewnętrznych API |
| **python-dotenv** | Zarządzanie zmiennymi środowiskowymi |
| **qrcode + pillow** | Generowanie kodów QR dla przesyłek |
| **uvicorn** | Serwer ASGI |

### Frontend
| Technologia | Rola |
|-------------|------|
| **React 18 + Vite** | Framework i bundler |
| **styled-components v6** | Hermetyczne stylowanie komponentów UI |
| **@tanstack/react-query v5** | Zarządzanie stanem serwera, retry, cache |
| **@paypal/react-paypal-js** | Integracja bramki płatności PayPal |
| **recharts** | Wykresy w panelu administratora |

---

## Architektura

### Backend — architektura warstwowa

```
backend/
├── main.py                  # Punkt wejścia, rejestracja routerów, CORS
├── config.py                # Zmienne środowiskowe (klucze API, JWT)
├── database.py              # Silnik SQLAlchemy, sesja DB
├── models.py                # Modele SQLAlchemy (tabele: users, packages)
├── schemas.py               # Schematy Pydantic (walidacja, serializacja)
├── init_db.py               # Skrypt inicjalizacji bazy + dane seed
├── routers/
│   ├── auth.py              # Rejestracja, logowanie, reset hasła, profil
│   ├── packages.py          # CRUD paczek, PayPal, QR
│   ├── admin.py             # Zarządzanie użytkownikami i paczkami (tylko admin)
│   └── maps.py              # Autocomplete, walidacja adresu, mapa, optymalizacja trasy
└── services/
    ├── auth_service.py      # JWT, bcrypt, dependency injection (get_current_user)
    ├── package_service.py   # Logika wyliczania kosztów dostawy
    ├── geocoding_service.py # Routes API, Weather API, Geocoding API
    ├── paypal_service.py    # Integracja PayPal OAuth2 + create/capture order
    └── qr_service.py        # Generowanie kodów QR
```

**Zasada warstw:** Routery obsługują wyłącznie HTTP (walidacja Pydantic, kody odpowiedzi). Logika biznesowa i wywołania zewnętrznych API należą do warstwy `services/`.

### Frontend — komponenty

```
frontend/src/
├── main.jsx                 # QueryClient (retry: 3), PayPalScriptProvider
├── App.jsx                  # Routing ról, zarządzanie tokenem JWT w localStorage
├── api/
│   └── index.js             # Centralna warstwa API — wszystkie wywołania fetch
└── components/
    ├── Login.jsx            # Logowanie, rejestracja, reset hasła
    ├── ClientDashboard.jsx  # Panel klienta
    ├── CourierDashboard.jsx # Panel kuriera
    ├── AdminDashboard.jsx   # Panel administratora
    ├── UserSettings.jsx     # Edycja profilu (imię, adres)
    └── ui/
        ├── Button.jsx       # styled-component
        ├── Input.jsx        # styled-component
        ├── GlassCard.jsx    # styled-component — karta z efektem szkła
        ├── Modal.jsx        # styled-component — okno modalne
        ├── PasswordInput.jsx  # Input z ikoną pokaż/ukryj hasło
        └── AddressInput.jsx   # Input z Autocomplete + walidacją adresu Google
```

---

## Funkcjonalności

### Rola: Klient

- **Rejestracja i logowanie** z automatycznym zapisem adresu zamieszkania
- **Nadawanie paczki** — dwuetapowy formularz:
  1. *Wylicz koszt* — wywołuje `/packages/estimate`, zwraca szczegółowy kosztorys (dystans, typ drogi, waga, pogoda, cena końcowa)
  2. *Nadaj paczkę* — tworzy przesyłkę w systemie po akceptacji kosztorysu
- **Podgląd mapy trasy** — przycisk "Pokaż trasę" otwiera modal z interaktywną mapą Google Maps dla wpisanych adresów
- **Płatność PayPal** — każda paczka wymaga opłacenia przed przypisaniem kuriera; integracja z PayPal Sandbox
- **Śledzenie statusu** przesyłek (Oczekuje na płatność → Czeka na kuriera → W doręczeniu → Dostarczona)
- **Kod QR** dla każdej opłaconej paczki (dane tracking: ID, nadawca, trasa, status)
- **Archiwizacja** dostarczonych paczek
- **Edycja profilu** — imię i nazwisko, adres zamieszkania (domyślnie uzupełniany jako adres nadania)

### Rola: Kurier

- **Przeglądanie wolnych zleceń** — lista opłaconych paczek bez przypisanego kuriera
- **Przypisywanie paczek** do siebie i potwierdzanie dostawy
- **Etykieta zwrotna** — generowanie wydruku z danymi paczki
- **Optymalizacja trasy dnia** — przycisk aktywny gdy kurier ma aktywne zlecenia; wywołuje Google Directions API z `waypoints=optimize:true` i zwraca:
  - Zoptymalizowaną kolejność dostaw
  - Łączny dystans
  - Interaktywną mapę trasy
- **Archiwizacja** ukończonych dostaw

### Rola: Administrator

- **Dashboard statystyk** z wykresami (recharts):
  - Wskaźniki KPI: przychód, liczba paczek, klientów, kurierów
  - Wykres kołowy rozkładu statusów
  - Wykres słupkowy przychodów miesięcznych z filtrem zakresu dat
- **Ranking kurierów** — tabela z liczbą dostarczonych paczek, przychodem, średnim dystansem
- **Przegląd klientów** — lista klientów z historią zamówień
- **Zarządzanie użytkownikami** — pełne CRUD: tworzenie, edycja (rola, imię, adres), zmiana hasła, usuwanie (z wyjątkiem konta `@admin`)
- **Zarządzanie paczkami** — edycja statusu, kuriera, flagi opłacenia; usuwanie paczek; wyszukiwanie
- **Konto `@admin`** jest w pełni chronione: nie można go edytować, usunąć ani zmienić mu hasła przez panel

---

## Bezpieczeństwo i autoryzacja

### JWT (JSON Web Token)

- Po zalogowaniu serwer zwraca token JWT ważny **24 godziny**
- Token przechowywany w `localStorage` przeglądarki
- Każde zapytanie do chronionych endpointów zawiera nagłówek: `Authorization: Bearer <token>`
- Token wygaśnięty lub nieprawidłowy → automatyczne wylogowanie i przekierowanie do logowania (HTTP 401)
- Payload tokenu: `user_id`, `username`, `role`, `exp`

### Ochrona endpointów

| Endpoint | Wymagane uprawnienie |
|----------|---------------------|
| `POST /login`, `POST /register`, `POST /reset-password` | Publiczny |
| `GET/POST /packages/*` | Zalogowany użytkownik |
| `GET /maps/*` | Zalogowany użytkownik |
| `PATCH /users/{id}/profile` | Zalogowany właściciel konta lub admin |
| `GET/POST/PATCH/DELETE /admin/*` | Rola `admin` |

### Hasła

- Hashowane algorytmem **bcrypt** (passlib)
- Dozwolone znaki: wyłącznie drukowalne ASCII (bez spacji i polskich znaków) — wymuszane po stronie frontendu
- Hasło konta `@admin` nie może być zmienione przez panel zarządzania

### Kod QR

- Zasób obrazkowy (`<img src>`) nie obsługuje nagłówków HTTP — token przekazywany jako parametr zapytania `?token=...`
- Backend weryfikuje token przed wygenerowaniem obrazu

---

## Integracje zewnętrzne

### Google Maps Platform

Wszystkie klucze API przechowywane wyłącznie po stronie serwera — frontend nigdy nie widzi klucza.

| Funkcja | API Google | Opis |
|---------|-----------|------|
| **Autocomplete adresów** | Places Autocomplete API | Podpowiedzi podczas wpisywania adresu; wyniki w formacie `Miasto, Ulica Numer, Kod pocztowy`; debounce 300ms, min. 3 znaki |
| **Walidacja adresu** | Address Validation API | Weryfikacja poprawności adresu po opuszczeniu pola (blur); zielony ✓ lub czerwony ! |
| **Wyliczanie trasy i kosztów** | Routes API v2 + Weather API | Rzeczywisty dystans drogowy i czas przejazdu; dane pogodowe w punkcie nadania; wieloczynnikowa cena dostawy |
| **Podgląd mapy** | Maps Embed API | Modal z interaktywną mapą trasy A→B dla klienta |
| **Optymalizacja trasy kuriera** | Directions API | Optymalna kolejność dostaw (`waypoints=optimize:true`); mapa wielopunktowa |

### Wieloczynnikowa wycena dostawy

```
koszt = (10 zł + dystans_km × 2,20 zł) × współczynnik_drogi × współczynnik_wagi × współczynnik_pogody
```

| Czynnik | Wartości |
|---------|----------|
| Typ drogi (wg średniej prędkości) | Autostrada ×0.85 / Droga krajowa ×1.00 / Lokalna ×1.15 |
| Waga paczki | do 1 kg ×0.85 / 1–5 kg ×1.00 / 5–15 kg ×1.25 / powyżej 15 kg ×1.50 |
| Pogoda | Bezchmurnie ×1.00 … Zamieć śnieżna ×1.30 |

### PayPal Sandbox

- Autoryzacja serwer-serwer przez OAuth2 (`client_credentials`)
- `create_order` → tworzy zamówienie PayPal o wartości `delivery_cost` w PLN
- `capture_order` → po zatwierdzeniu przez użytkownika backend weryfikuje płatność i ustawia `is_paid = True`
- Używa środowiska **Sandbox** (testowe karty kredytowe)

---

## Struktura projektu

```
tai_courier_system/
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── init_db.py
│   ├── requirements.txt
│   ├── .env                  # NIE w repozytorium — tworzysz lokalnie
│   ├── courier.db            # NIE w repozytorium — generowana przez init_db.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── packages.py
│   │   ├── admin.py
│   │   └── maps.py
│   └── services/
│       ├── auth_service.py
│       ├── package_service.py
│       ├── geocoding_service.py
│       ├── paypal_service.py
│       └── qr_service.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── .env                  # VITE_PAYPAL_CLIENT_ID
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   └── index.js
│       └── components/
│           ├── Login.jsx
│           ├── ClientDashboard.jsx
│           ├── CourierDashboard.jsx
│           ├── AdminDashboard.jsx
│           ├── UserSettings.jsx
│           └── ui/
│               ├── Button.jsx
│               ├── Input.jsx
│               ├── GlassCard.jsx
│               ├── Modal.jsx
│               ├── PasswordInput.jsx
│               └── AddressInput.jsx
├── backend+frontend_run_script.bat
└── README.MD
```

---

## Uruchomienie lokalne

### Wymagania wstępne

- Python 3.10 lub nowszy
- Node.js 18 lub nowszy (z npm)

### Krok 1 — Zmienne środowiskowe backendu

Utwórz plik `backend/.env` i uzupełnij wartościami:

```env
GOOGLE_MAPS_API_KEY=twój_klucz_google_maps
PAYPAL_CLIENT_ID=twój_paypal_client_id
PAYPAL_CLIENT_SECRET=twój_paypal_client_secret
JWT_SECRET_KEY=dowolny_długi_losowy_ciąg_znaków
```

### Krok 2 — Backend

```bash
cd backend
pip install -r requirements.txt
python init_db.py
python -m uvicorn main:app --reload
```

Serwer uruchamia się na `http://127.0.0.1:8000`. Dokumentacja API (Swagger UI) dostępna pod `http://127.0.0.1:8000/docs`.

### Krok 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplikacja dostępna pod `http://localhost:5173`.

### Alternatywnie — skrypt startowy (Windows)

```
backend+frontend_run_script.bat
```

---

## Zmienne środowiskowe

| Zmienna | Plik | Opis |
|---------|------|------|
| `GOOGLE_MAPS_API_KEY` | `backend/.env` | Klucz Google Maps Platform (Routes, Places, Weather, Address Validation, Embed, Geocoding) |
| `PAYPAL_CLIENT_ID` | `backend/.env` | PayPal Sandbox Client ID |
| `PAYPAL_CLIENT_SECRET` | `backend/.env` | PayPal Sandbox Client Secret |
| `JWT_SECRET_KEY` | `backend/.env` | Tajny klucz do podpisywania tokenów JWT — powinien być długi i losowy |
| `VITE_PAYPAL_CLIENT_ID` | `frontend/.env` | Ten sam PayPal Client ID — potrzebny dla `@paypal/react-paypal-js` |

---

## Domyślne konta testowe

Tworzone przez `python init_db.py`:

| Login | Hasło | Rola | Imię i Nazwisko |
|-------|-------|------|----------------|
| `admin` | `admin` | Administrator | Administrator Systemu |
| `test1` | `1111` | Klient | Jan Kowalski |
| `test2` | `2222` | Klient | Anna Nowak |
| `kurier1` | `3333` | Kurier | Piotr Wiśniewski |

> Skrypt `init_db.py` jest idempotentny — nie nadpisuje istniejących użytkowników. Aby zresetować bazę, usuń plik `courier.db` i uruchom skrypt ponownie.

---

## Model danych

### Tabela `users`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | Integer PK | Unikalny identyfikator |
| `username` | String UNIQUE | Nazwa użytkownika (login) |
| `password_hash` | String | Hash bcrypt hasła |
| `role` | String | `client` / `courier` / `admin` |
| `full_name` | String (nullable) | Imię i Nazwisko |
| `address` | String (nullable) | Adres zamieszkania (format: `Miasto, ul. Ulica Nr, Kod`) |

### Tabela `packages`

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | Integer PK | Unikalny identyfikator |
| `client_id` | Integer FK | ID klienta-nadawcy |
| `courier_id` | Integer FK (nullable) | ID przypisanego kuriera |
| `sender_name` | String | Imię nadawcy |
| `receiver_name` | String | Imię odbiorcy |
| `origin_address` | String | Adres nadania |
| `destination_address` | String | Adres docelowy |
| `weight_kg` | Float | Waga paczki w kg |
| `distance_km` | Float | Dystans drogowy (Routes API) |
| `delivery_cost` | Float | Końcowy koszt dostawy w PLN |
| `status` | String | `pending` / `accepted` / `delivered` |
| `is_paid` | Boolean | Czy opłacona przez PayPal |
| `client_archived` | Boolean | Czy zarchiwizowana przez klienta |
| `courier_archived` | Boolean | Czy zarchiwizowana przez kuriera |
| `created_at` | DateTime | Data i czas utworzenia |

---

## API — przegląd endpointów

### Autoryzacja

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/register` | Rejestracja — zwraca `{access_token, user}` |
| POST | `/login` | Logowanie — zwraca `{access_token, user}` |
| POST | `/reset-password` | Reset hasła (publiczny) |
| PATCH | `/users/{id}/profile` | Edycja profilu (wymaga tokenu) |

### Paczki (wymagają tokenu)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| POST | `/packages/estimate` | Wylicz kosztorys bez tworzenia paczki |
| POST | `/packages/` | Utwórz paczkę |
| GET | `/packages/` | Lista paczek (filtrowanie po `client_id`, `courier_id`, `unassigned`) |
| GET | `/packages/{id}/qr?token=` | Kod QR paczki (token w query param) |
| PATCH | `/packages/{id}/assign` | Przypisz kuriera |
| PATCH | `/packages/{id}/status` | Zmień status |
| PATCH | `/packages/{id}/archive` | Archiwizuj |
| POST | `/packages/{id}/paypal/create-order` | Utwórz zamówienie PayPal |
| POST | `/packages/{id}/paypal/capture-order` | Potwierdź płatność PayPal |

### Mapy (wymagają tokenu)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/maps/directions` | URL do embeda mapy trasy |
| POST | `/maps/validate-address` | Walidacja adresu (Address Validation API) |
| GET | `/maps/autocomplete` | Podpowiedzi adresów (Places Autocomplete API) |
| POST | `/maps/optimize-route` | Optymalizacja trasy kuriera |

### Administracja (wymagają roli `admin`)

| Metoda | Endpoint | Opis |
|--------|----------|------|
| GET | `/admin/stats` | Statystyki i KPI |
| GET | `/admin/couriers-overview` | Ranking kurierów |
| GET | `/admin/clients-overview` | Przegląd klientów |
| GET | `/admin/users` | Lista wszystkich użytkowników |
| POST | `/admin/users` | Utwórz użytkownika |
| PATCH | `/admin/users/{id}` | Edytuj użytkownika |
| PATCH | `/admin/users/{id}/password` | Zmień hasło użytkownika |
| DELETE | `/admin/users/{id}` | Usuń użytkownika |
| GET | `/admin/packages` | Lista wszystkich paczek |
| PATCH | `/admin/packages/{id}` | Edytuj paczkę |
| DELETE | `/admin/packages/{id}` | Usuń paczkę |
