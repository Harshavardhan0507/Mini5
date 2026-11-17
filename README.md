# 🌾 KisanAgro: Fertilizer Shop + Multilingual AI Plant Doctor

A full-stack agricultural store: a real product catalog with stock, a cart and checkout (Cash on Delivery or UPI), an admin panel to run the shop, and an AI crop doctor that answers in **Telugu, Kannada, Hindi and English**. Every new order is emailed to the store owner.

---

## What works today

**Storefront**
- Product catalog served from SQLite, with category filters, search, product detail pages, dosage, crops and target problems.
- Live stock: out-of-stock products cannot be added, quantities are capped at available stock.
- Cart persisted in the browser; prices and stock are re-synced from the server before checkout.
- Checkout with structured delivery address, 10-digit mobile validation and 6-digit PIN code.
- Cash on Delivery or UPI (UPI payment is confirmed by the store team; see limitations).
- Order confirmation page, order detail page with status timeline, printable invoice and self-service cancellation while the order is `Confirmed`/`Packed`.
- Dashboard with real diagnosis/order counts and full order history.
- Store pages: About, Contact, Shipping, Returns & Refunds, Privacy, Terms.
- Light/dark theme toggle in the navbar; the choice is saved per browser and follows the system theme on first visit.

**Store admin (`/admin`, admin accounts only)**
- Overview: orders, revenue, open orders, customers, low-stock count, recent orders and recent email attempts.
- Products: create, edit, hide/remove, adjust price, MRP, stock, images, dosage, crops and problems.
- Orders: see every order, change status (`Confirmed → Packed → Shipped → Delivered` or `Cancelled`), mark payments, resend the order email to the store inbox.
- Cancelling an order puts its stock back automatically.

**Order email**
- On every order the server emails the full order (customer, phone, address, items, totals, payment method) to `ORDER_NOTIFICATION_EMAIL` (default `business615@gmail.com`).
- Status changes email the customer when their address is available.
- If SMTP is not configured, the order still succeeds and the attempt is recorded in the admin email log — nothing silently disappears.

**AI crop doctor**
- Gemini multimodal photo/text diagnosis when `GEMINI_API_KEY` is set, otherwise the built-in offline knowledge base.
- Responses in four languages, with organic remedy + store product + dosage.

---

## Stack

- **Client:** React 19, Vite 8, React Router 7, Tailwind CSS 3, lucide-react
- **Server:** Node.js 22+ (ES modules), Express 4, better-sqlite3 (WAL), JWT + bcrypt, Multer 2, Nodemailer, Helmet, express-rate-limit, compression
- **Database:** SQLite file at `server/data/kisan.sqlite`

---

## Quick start

Requires **Node.js 22 or newer** (better-sqlite3 13 needs it) and npm.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env       # then edit .env (see below)
npm start                  # http://localhost:5000

# 2. Frontend (second terminal)
cd client
npm install
npm run dev                # http://localhost:5173
```

On first boot the server creates the database, seeds the 16-product catalog, the admin account and (outside production) demo data.

**Demo farmer:** `farmer.harsha@kisan.com` / `kisan1234`
**Admin:** the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env` (defaults to `admin@kisanagro.com` / `Admin@Kisan2026`)

Change both passwords before this is public.

### Minimum `.env` values

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=<long random string>
ORDER_NOTIFICATION_EMAIL=business615@gmail.com
ADMIN_EMAIL=admin@kisanagro.com
ADMIN_PASSWORD=<strong password>
```

Generate a secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## Email setup (order notifications)

Order emails go out over SMTP. For Gmail:

1. Turn on 2-Step Verification on the sending Google account.
2. Create an App Password at <https://myaccount.google.com/apppasswords>.
3. Fill in `server/.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-sending-address@gmail.com
SMTP_PASS=the-16-character-app-password
SMTP_FROM=KisanAgro <your-sending-address@gmail.com>
```

`ORDER_NOTIFICATION_EMAIL` is the **recipient** (`business615@gmail.com`). `SMTP_USER` is the account that **sends** — they can be different. Any SMTP provider works (Brevo, Zoho, Mailgun, Amazon SES); Gmail has daily sending limits, so move to a transactional provider once order volume grows.

Check `GET /api/health` or the admin **Overview → Recent order emails** to see whether email is configured and whether sends succeed.

---

## Admin panel

1. Log in with the admin account.
2. Open **Admin** in the navbar (or `/admin`).
3. **Overview** shows business numbers and email status.
4. **Products** is where you add real products, set stock, prices, MRP and pack photos.
5. **Orders** is your fulfilment queue: change status, mark payments, resend emails.

Stock is decremented in the same database transaction that creates the order, with a `stock >= quantity` guard, so two simultaneous orders cannot oversell the same pack.

---

## API summary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | — | Account + JWT |
| GET | `/api/auth/me` | user | Session check |
| GET | `/api/products`, `/api/products/:id` | — | Catalog |
| POST | `/api/chat/diagnose`, `/api/chat/message` | optional | AI crop doctor |
| GET | `/api/chat/history` | user | Diagnosis history |
| POST | `/api/orders` | user | Place order (recomputes prices, decrements stock, emails store) |
| GET | `/api/orders/my-orders`, `/api/orders/:id` | user | Own orders only |
| PATCH | `/api/orders/:id/cancel` | user | Cancel + restock |
| GET | `/api/admin/stats` | admin | Dashboard counters |
| GET/POST/PUT/DELETE | `/api/admin/products` | admin | Product management |
| GET/PATCH | `/api/admin/orders` | admin | Fulfilment + status/payment |
| POST | `/api/admin/orders/:id/notify` | admin | Resend order email |
| GET | `/api/admin/customers`, `/api/admin/emails` | admin | Customer list, email log |
| GET | `/api/health` | — | Status + email configuration |

---

## Deploying

### Single container (recommended for a first launch)

```bash
docker build -t kisanagro .
docker run -d --name kisanagro \
  -p 5000:5000 \
  -v kisan-data:/app/server/data \
  -v kisan-uploads:/app/server/uploads \
  --env-file server/.env \
  kisanagro
```

The image builds the React app and Express serves both the API and the storefront on one origin, so you don't need CORS changes. Put it behind HTTPS (Caddy, nginx, or your host's load balancer) — a public shop must not run on plain HTTP.

### Host checklist

- Set `NODE_ENV=production` and a strong `JWT_SECRET`.
- Set `CLIENT_ORIGIN` to the real domain if the frontend is hosted separately (e.g. Vercel/Netlify) and point `VITE_API_URL` at the API.
- Mount **persistent storage** for `server/data`; most hosts wipe the filesystem on redeploy, which would delete every order and account.
- Back up `kisan.sqlite` (stop the container or use SQLite's `.backup`) on a schedule.
- Run one instance. SQLite is not shared between replicas.
- Set `SEED_DEMO=false` (or `NODE_ENV=production`, which already skips demo data).

---

## Before going live (non-code)

- **Licences:** selling fertilizer and pesticides in India requires registration/licensing (Fertilizer Control Order, Insecticides Act). Confirm requirements with a CA/lawyer and put the licence numbers, GSTIN and seller details in `client/src/data/storeInfo.js` — they then appear on invoices and policy pages.
- **Product data:** replace the demo catalog and Unsplash images with real manufacturer pack shots, batch/expiry and label-approved dosage. Add the products through the admin panel.
- **Legal pages:** have the Shipping/Returns/Privacy/Terms copy reviewed for your business.
- **Payments:** UPI is currently confirmed manually. Add a gateway (Razorpay supports UPI/cards/netbanking/COD) before scaling; the order model already has `payment_status` and `payment_reference` fields for it.
- **Support:** add a phone/WhatsApp number in `storeInfo.js` and answer it.

## Known limitations

- No online payment gateway yet: UPI orders are marked `awaiting_payment` until an admin marks them paid.
- No password reset or phone OTP; a customer who forgets their password must contact the store.
- Product names/descriptions are English-only even though the interface is multilingual.
- No reviews, coupons or shipping-partner tracking.
- The demo catalog images are remote Unsplash URLs, not owned product photography.

---

## Project structure

```
Mini5-main/
├── client/                     # React 19 + Vite + Tailwind storefront
│   ├── public/                 # favicon, placeholder image
│   └── src/
│       ├── components/         # Navbar, Footer, ProductCard, ChatbotWindow...
│       ├── context/            # Auth, Cart, Language
│       ├── data/               # translations.js, storeInfo.js
│       ├── pages/              # Home, Shop, ProductDetail, Cart, OrderDetail,
│       │                       # Dashboard, Admin, InfoPages, Login, Register
│       └── services/api.js
├── server/
│   ├── controllers/            # auth + diagnosis
│   ├── data/                   # products.json (seed), localizedDiseases.json, kisan.sqlite
│   ├── middleware/             # JWT auth + requireAdmin
│   ├── routes/                 # auth, products, orders, admin, chatbot
│   ├── services/mailer.js      # SMTP + order email templates
│   ├── utils/                  # product + order helpers
│   ├── db.js                   # schema, migrations, stock transactions
│   ├── seed.js                 # catalog, admin, demo data
│   └── server.js               # Express entry point
├── Dockerfile
└── README.md
```
