# 🌾 KisanAgro: Fertilizer E-Commerce & Multilingual AI Plant Disease Doctor

An end-to-end full-stack web application designed for farmers and gardening enthusiasts. It combines an e-commerce fertilizer store with an AI-powered crop disease diagnostic chatbot supporting **Telugu (తెలుగు)**, **Kannada (ಕನ್ನಡ)**, **Hindi (हिंदी)**, and **English**.

---

## ✨ Key Features

1. **User Authentication & Farmer Profiles**:
   - Secure registration and login with encrypted passwords and JWT tokens.
   - Preserves user session, farm location, and mobile number.
2. **Interactive Farmer Dashboard**:
   - Directed immediately upon login.
   - Features the **AI Crop Doctor Chatbot** embedded right on the dashboard.
   - Shows crop scan count, active orders, and seasonal fertilizer suggestions.
3. **Multilingual AI Plant Disease Chatbot**:
   - **Photo Upload**: Upload a clear photo of a crop leaf with disease or pest symptoms.
   - **Text Inquiries**: Ask questions about plant symptoms, yellow leaves, fungal spots, and dosage.
   - **Regional Languages**: Switch between **Telugu**, **Kannada**, **Hindi**, and **English** for diagnosis, cause, and remedies in native scripts.
   - **Direct Store Integration**: Automatically displays certified fertilizers/fungicides matching the diagnosis with a 1-click **"Add to Cart"** button inside the chat!
4. **Fertilizer E-Commerce Store**:
   - Categories: NPK & Macro Nutrients, Organic Vermicompost & Bio-stimulants, Micronutrients (Zinc, Boron), and Disease Control Fungicides.
   - Real-time search by fertilizer name, crop name, or disease problem.
5. **Cart & Simulated Checkout**:
   - Quantity management, cart counter badge in navigation.
   - Farm delivery details form with **Cash on Delivery (Pay at Farm)** and UPI payment modes.
   - Instant order confirmation and history tracking in the dashboard.

---

## 🚀 Quick Start Guide

### 1. Start Backend Server (Port 5000)
```powershell
cd "C:\Users\Kolli Harshavardhan\Documents\Mini5\server"
npm start
```
*Runs on `http://localhost:5000`*

### 2. Start Frontend App (Port 5173)
In a second terminal window:
```powershell
cd "C:\Users\Kolli Harshavardhan\Documents\Mini5\client"
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🔑 Demo Login Credentials

For quick testing without creating a new account:
* **Email:** `farmer.harsha@kisan.com`
* **Password:** `kisan1234`
*(Or click "Click to autofill demo farmer account" on the login page)*

---

## 🤖 Optional: Live Gemini Vision API Setup
The application is preloaded with an intelligent Agricultural Diagnostic Knowledge Base and works 100% offline out-of-the-box. To optionally enable live multimodal AI vision through Google Gemini:
1. Open `server/.env`
2. Add your API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Restart the server.

---

## 📁 Project Structure

```
Mini5/
├── client/                     # React 19 + Vite + Tailwind CSS frontend
│   ├── .env.example            # Client environment variable template
│   ├── src/
│   │   ├── components/         # Navbar, Footer, LanguageSelector, ChatbotWindow, ProductCard
│   │   ├── context/            # AuthContext, CartContext, LanguageContext
│   │   ├── data/               # translations.js (EN, TE, KN, HI)
│   │   ├── pages/              # Home, Shop, ChatbotPage, Dashboard, Login, Register, Cart
│   │   ├── services/           # api.js
│   │   └── App.jsx             # React router configuration
├── server/                     # Node.js + Express backend
│   ├── .env.example            # Server environment configuration template
│   ├── db.js                   # SQLite (better-sqlite3) with WAL mode & transactions
│   ├── seed.js                 # Automatic database seeding script
│   ├── middleware/             # auth.js (JWT authentication & verification middleware)
│   ├── data/                   # products.json, localizedDiseases.json, kisan.sqlite
│   ├── routes/                 # auth.js, products.js, chatbot.js, orders.js
│   ├── controllers/            # diagnosisController.js, authController.js
│   ├── uploads/                # Leaf photos stored during diagnosis
│   └── server.js               # Express application entry point (Helmet, CORS, rate limits)
└── README.md
```
