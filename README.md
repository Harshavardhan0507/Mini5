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

## 🤖 Live Gemini Multimodal AI Setup & Domain Grounding

The application features **Google Gemini Multimodal AI** for analyzing uploaded crop leaf photos and farmer text descriptions, backed by a comprehensive **15-Disease Agricultural Diagnostic Knowledge Base** that also runs offline.

### 1. Connect Your Gemini API Key
1. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open [`server/.env`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/.env) in your editor.
3. Add your API key:
   ```env
   GEMINI_API_KEY=AIzaSyYourActualApiKeyHere
   GEMINI_MODEL=gemini-1.5-flash
   ```
4. Restart your backend server (`npm start`).
5. The Chatbot badge will instantly switch to **✨ Gemini AI Vision**.

### 2. How the AI is Guided & Grounded
- **Multimodal Visual Analysis**: Accepts leaf photos (JPG, PNG, WEBP), checks if the image actually shows a plant/leaf, and accurately pinpoints the disease, pest, or nutrient deficiency.
- **Farmer Query Context**: Combines user notes and symptom descriptions with the photo.
- **Store Inventory Grounding**: Feeds the current [`products.json`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/data/products.json) catalog into Gemini, allowing the model to recommend exact in-stock products with 1-click **Add to Cart**.
- **Dual-Action Solutions**:
  - **🌿 Organic Solution**: Natural home remedies (Neem oil, sour buttermilk, Trichoderma, wood ash).
  - **🧪 Shop Treatment**: Certified chemical fertilizers/fungicides/insecticides.
  - **🎯 Exact Dosage**: Precise dilution rates (e.g., 0.25% concentration / 2.5g per Liter / per-acre calculations).
- **Multilingual Native Scripts**: Returns diagnoses in Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Hindi (हिंदी), and English.
- **Model Fallback**: Automatically tries fallback candidates (`gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-1.5-pro`) to ensure high availability.

### 3. Adding Custom Diseases & Products
You can expand the diagnostic library anytime:
- **Diseases**: Add new entries to [`server/data/localizedDiseases.json`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/data/localizedDiseases.json) with symptom keywords, severity, English/Telugu/Kannada/Hindi remedies, and matching `recommendedProductIds`.
- **Products**: Add new items to [`server/data/products.json`](file:///C:/Users/Kolli%20Harshavardhan/Documents/Mini5/server/data/products.json) with pricing, dosage, target problems, and category.

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
