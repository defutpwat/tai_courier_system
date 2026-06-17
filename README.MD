# 📦 Courier Delivery System - Instrukcja Uruchomienia

Niniejszy projekt składa się z dwóch niezależnych części:
- **Backendu** napisanego w Pythonie (FastAPI) z bazą danych SQLite.
- **Frontendu** napisanego w JavaScript (React + Vite).

Aby aplikacja zadziałała poprawnie, musisz uruchomić obie te części równolegle. Poniżej znajduje się instrukcja krok po kroku.

---

## 🛠️ Wymagania wstępne

Zanim zaczniesz, upewnij się, że masz zainstalowane na swoim komputerze:
1. **Python** (wersja 3.10 lub nowsza)
2. **Node.js** (wersja 18 lub nowsza, zawierająca menedżer pakietów `npm`)
3. Edytor kodu, np. Visual Studio Code.

---

## 🔑 Krok 1: Konfiguracja Zmiennych Środowiskowych (Klucze PayPal)

Ze względów bezpieczeństwa w publicznym repozytorium nie znajdują się tajne klucze uwierzytelniające płatności. **Skontaktuj się z autorem projektu (właścicielem), aby otrzymać klucz `Client Secret`.**

Gdy już go masz:

1. Otwórz folder `backend` i utwórz w nim plik o nazwie dokładnie `config.py`.
2. Wklej do niego otrzymany klucz w poniższym formacie:
   ```env
   PAYPAL_CLIENT_SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "tutaj_wklej_otrzymany_secret")
   ```

*(Zmienna Client ID we frontendzie jest publiczna i została już dodana na stałe do repozytorium w pliku ClientDashboard.jsx na potrzeby integracji środowiska testowego Sandbox).*

---

## ⚙️ Krok 2: Uruchomienie Backendu (Serwera)

1. Otwórz nowy terminal (konsolę) i przejdź do folderu backendu:
   `
   cd backend
   `

2. Zainstaluj wszystkie wymagane biblioteki Pythona:
   `
   pip install -r requirements.txt
   `

3. **Inicjalizacja Bazy Danych:**
   Przy pierwszym uruchomieniu projektu na nowym komputerze, baza danych jest pusta. Uruchom skrypt startowy, który stworzy tabele i testowych użytkowników:
   `
   python init_db.py
   `

4. Uruchom serwer developerski:
   `
   python -m uvicorn main:app --reload
   `

*(Nie zamykaj tego terminala! Serwer musi cały czas działać w tle).*

---

## 💻 Krok 3: Uruchomienie Frontendu (Interfejsu)

1. Otwórz **drugi, zupełnie nowy** terminal i przejdź do folderu frontendu:
   `
   cd frontend
   `

2. Zainstaluj wymagane paczki NPM (tworzenie lokalnego folderu 
ode_modules):
   `
   npm install
   `

3. Uruchom aplikację kliencką w przeglądarce:
   `
   npm run dev
   `

---

## 🎉 Krok 4: Gotowe!

Aplikacja jest już uruchomiona. W terminalu frontendu (z kroku 3) wyświetli się link (zazwyczaj http://localhost:5173/). Kliknij w niego, by otworzyć system kurierski.

Możesz się zalogować przy użyciu kont wygenerowanych przez skrypt init_db.py (np. admin). Płatności będą symulowane poprzez zintegrowane środowisko PayPal Sandbox.
