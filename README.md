# PharmaFlow ERP - Pharmacy Inventory & Point of Sale (POS) Billing System

PharmaFlow is a modern, high-tech Pharmacy ERP and Billing system built using Next.js (App Router, Tailwind CSS v4) for the frontend, Node/Express (TypeScript) for the backend, and MongoDB for data storage. It is designed to emulate the robust functionality of Marg ERP while providing a premium, dark-mode glassmorphism interface.

---

## Key Features

1. **Secure Session Authentication**: JWT Access/Refresh tokens with silent rotation stored in secure httpOnly cookies.
2. **Product Catalog**: Drug formulations, compositions, tax brackets (GST), storage shelf markers, and safety stock levels.
3. **FEFO Inventory Routing (First Expiry, First Out)**: Stock is managed by batches. POS billing automatically pre-selects the batch with the earliest expiration date to optimize inventory lifecycle.
4. **Point of Sale (POS) Billing**: Autocomplete item searching, live tax/discount updates, credit balance support, and a clean, printable thermal slip invoice format.
5. **Purchase Ingestion**: Logs supplier invoices, records cost rates, and updates batch quantities and vendor outstanding credit ledger.
6. **Suppliers & Customers Directories**: Central directories logging accounts payable/receivable balances.
7. **Control Center Analytics**: KPI widgets (revenue, stock valuation, warnings), interactive sales trends via Recharts, and ledgers (Expiry ledger, Sales history, Valuation report).

---

## Tech Stack & Dependencies

- **Frontend**: Next.js 16+ (App Router), Tailwind CSS v4, Lucide React (Icons), Recharts (Charts), React Hot Toast (Notifications), Axios (HTTP Client), Date-fns (Date Formatting).
- **Backend**: Node.js, Express, TypeScript, Mongoose, JWT, BcryptJS, Cors, Dotenv, Cookie-parser.
- **Database**: MongoDB (Atlas Cloud or local instances).

---

## Setup & Running the Application

### 1. Database Configuration
Make sure you have a local MongoDB instance running at `mongodb://localhost:27017/pharmacy-inventory` or prepare a MongoDB Atlas connection string.

### 2. Environment Setup

#### Backend (`/backend/.env`)
Create a `.env` file in the `/backend` folder (a default `.env` template has already been created for you):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pharmacy-inventory
ACCESS_TOKEN_SECRET=your_super_strong_jwt_access_token_secret
REFRESH_TOKEN_SECRET=your_super_strong_jwt_refresh_token_secret
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

#### Frontend (`/frontend/.env.local`)
Create a `.env.local` file in the `/frontend` folder:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Installation & Run Command

Open two terminal windows to run both servers concurrently:

#### Terminal 1: Run Backend Express Server
```bash
cd backend
npm run dev
```
*Runs on [http://localhost:5000](http://localhost:5000)*

#### Terminal 2: Run Frontend Next.js Server
```bash
cd frontend
npm run dev
```
*Runs on [http://localhost:3000](http://localhost:3000)*

---

## Testing Workflow Walkthrough

1. **Registration**: Open `http://localhost:3000/signup` and create an account. Specify your role as **Administrator**. You will be logged in and redirected to the **Control Center**.
2. **Setup Directories**:
   - Go to **Suppliers Directory** and add a supplier (e.g. *Cipla Distribution*, phone: *9876543210*, GSTIN: *07AAAA1234A*).
   - Go to **Customers Directory** and add a patient profile (e.g. *Mark Stone*, phone: *9999988888*).
3. **Register Medicine**:
   - Go to **Medicine Stock** and select **Add New Medicine**.
   - Input: Name: `Calpol 500mg`, Composition: `Paracetamol IP`, Shelf: `Rack A-2`, Tax Rate: `12%`, Min Stock Level: `20`. Save.
4. **Log Purchase (Stock Inflow)**:
   - Go to **Purchase Entry** and select your supplier (*Cipla Distribution*).
   - Configure a batch: Batch No: `CP-101`, Expiry: 6 months from now, Qty: `100`, Cost Rate: `₹8.00`, MRP: `₹12.00`, Selling Rate: `₹10.50`, Disc: `5%`.
   - Click **Add Batch to Ingestion Queue**.
   - Set Payment Type to **Credit Account** (adds cost to Cipla's accounts payable ledger) and click **Log Purchase Ledger**.
5. **Point of Sale (POS) Billing Checkout**:
   - Go to **Billing Counter (POS)**.
   - Search for `Calpol`. Select it.
   - The system automatically pre-selects `Batch CP-101` and displays its expiry date. Input Quantity: `10`, click **Add to Billing Basket**.
   - Select your payment mode (e.g., **Cash** or **Credit** to patient outstanding).
   - Click **Generate Sales Bill**.
   - A printable receipt slip will overlay. You can test printing or close to start another invoicing cycle.
6. **Review Reports**:
   - Check the **Control Center** dashboard. Today's sales, stock valuations, low stock notifications, and sales trends charts will update in real-time.
   - Go to **Reports & Ledgers** to view the **Expiry Ledger**, **Stock Valuation (cost vs market MRP)**, and **Sales Ledger history**.
