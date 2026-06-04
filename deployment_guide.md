# Deployment Guide - PharmaFlow ERP

This guide provides step-by-step instructions on deploying the PharmaFlow backend to **Render** and the frontend to **Vercel** from your monorepo repository.

---

## 1. Backend Deployment on Render

Render will host the Node.js/Express server and connect to your MongoDB database.

### Prerequisites
- A cloud MongoDB database (e.g., MongoDB Atlas). Create a database and retrieve the connection string (`mongodb+srv://...`).

### Step-by-Step Instructions
1. Log in to [Render](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub/GitLab repository.
3. Configure the Web Service settings:
   - **Name**: `pharmaflow-backend` (or any custom name)
   - **Region**: Select the region closest to your target audience.
   - **Branch**: `main` (or your active release branch)
   - **Root Directory**: `backend` *(CRITICAL: This tells Render to execute commands inside the `/backend` folder)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Select **Free** (or any paid tier)
4. Add the following **Environment Variables** in the Render settings panel under the **Env** tab:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `mongodb+srv://<username>:<password>@cluster.mongodb.net/pharmaflow` *(Your Atlas connection string)*
   - `ACCESS_TOKEN_SECRET` = *(Generate a long random secure string, e.g. `64-character hex`)*
   - `REFRESH_TOKEN_SECRET` = *(Generate another long random secure string)*
   - `FRONTEND_URL` = `https://your-pharmaflow-app.vercel.app` *(Your Vercel deployment URL, which you will get in the next section)*
5. Click **Create Web Service**. Render will install dependencies, compile the TypeScript code into `dist/`, and boot up the server. Copy the generated Render URL (e.g., `https://pharmaflow-backend.onrender.com`).

---

## 2. Frontend Deployment on Vercel

Vercel will host the Next.js application.

### Step-by-Step Instructions
1. Log in to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your Git repository.
3. Configure the Project settings:
   - **Project Name**: `pharmaflow-app` (or any custom name)
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select the `frontend` folder. *(CRITICAL: This tells Vercel to build the Next.js app in the `/frontend` folder)*
   - **Build & Development Settings**: Leave default (`next build`)
4. Expand the **Environment Variables** section and add:
   - `NEXT_PUBLIC_API_URL` = `https://pharmaflow-backend.onrender.com/api` *(Your Render backend URL with the `/api` suffix)*
5. Click **Deploy**. Vercel will build the Next.js production bundle, pre-render the pages, and provide you with a deployment URL (e.g., `https://pharmaflow-app.vercel.app`).

### Post-Deployment Step
Once you get your Vercel URL, go back to your **Render Web Service settings**, edit the `FRONTEND_URL` environment variable to match your exact Vercel URL, and save. Render will redeploy automatically with the correct CORS configurations enabled.

---

## 3. How Cookies are Handled in Production
Because Vercel (`vercel.app`) and Render (`onrender.com`) are on different domains, browsers treat auth cookies as **third-party cross-site cookies**. 

The code is pre-configured to automatically handle this transition:
- In production (`NODE_ENV=production`), the refresh token cookie is set with `sameSite: 'none'` and `secure: true`.
- This ensures that when the Next.js frontend calls the backend APIs, the browser securely transmits the cookie cross-domain.
- Both Axios on the frontend (`withCredentials: true`) and CORS on the backend (`credentials: true`) are fully pre-wired to support this.
