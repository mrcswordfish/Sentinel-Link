# Sentinel Link - Web Dashboard Deployment Guide

This guide explains how to take the raw source code of the dashboard and deploy it to the public internet so you can access it from anywhere.

We will use **Vite** (to build the project) and **Vercel** (to host it for free).

---

## Prerequisites

1.  **Backend is Live:** Your backend (Signaling Server) must be running and accessible publicly (e.g., via Ngrok on your Laptop or Raspberry Pi).
    *   *Example URL:* `https://my-server.ngrok-free.app`
2.  **Node.js Installed:** Ensure Node.js is installed on your computer.

---

## Step 1: Create a Build Project

The code provided in this editor is "raw" TypeScript. Browsers need it converted to JavaScript.

1.  Open your Command Prompt / Terminal.
2.  Navigate to your project folder.
3.  Run the following command to create a new React project structure:
    ```bash
    npm create vite@latest sentinel-dashboard -- --template react-ts
    ```
    *(Type `y` if asked to install create-vite)*.

4.  Enter the new folder and install dependencies:
    ```bash
    cd sentinel-dashboard
    npm install
    npm install socket.io-client @google/genai recharts
    ```

---

## Step 2: Move Your Code

Now transfer the logic from your downloaded files into this new structure.

1.  **Delete** the existing `src/App.tsx`, `src/App.css`, and `src/index.css` in the new folder.
2.  **Copy** the following files/folders from your source to `sentinel-dashboard/src/`:
    *   `components/` (The whole folder)
    *   `services/` (The whole folder)
    *   `types.ts`
    *   `App.tsx`
3.  **Tailwind Setup:**
    *   Open `sentinel-dashboard/index.html`.
    *   Add this line inside the `<head>` section:
        ```html
        <script src="https://cdn.tailwindcss.com"></script>
        ```

---

## Step 3: Configure Connection

1.  Open `sentinel-dashboard/src/App.tsx`.
2.  Find the line:
    ```typescript
    const SERVER_URL = 'http://localhost:3001';
    ```
3.  **Change it** to your public Backend URL:
    ```typescript
    const SERVER_URL = 'https://your-ngrok-url.ngrok-free.app';
    ```

---

## Step 4: Configure API Key (Vite)

Vite handles environment variables securely.

1.  Create a file named `.env` in the root of `sentinel-dashboard` (next to package.json).
2.  Add your Gemini API Key:
    ```
    VITE_API_KEY=your_actual_api_key_here
    ```
    *(Note: The code in `services/geminiService.ts` is already updated to look for `VITE_API_KEY`)*.

---

## Step 5: Deploy to Vercel

1.  **Install Vercel CLI:**
    ```bash
    npm install -g vercel
    ```

2.  **Deploy:**
    Inside the `sentinel-dashboard` folder, run:
    ```bash
    vercel
    ```

3.  **Follow Prompts:**
    *   Set up and deploy? **Y**
    *   Which scope? **[Enter]**
    *   Link to existing project? **N**
    *   Project name? **sentinel-dashboard**
    *   Directory? **./**
    *   Modify settings? **N**

4.  **Wait:** It will take about 1 minute.
5.  **Success:** It will provide a **Production** URL (e.g., `https://sentinel-dashboard.vercel.app`).

---

## Step 6: Final Verification

1.  Open the **Vercel URL** on your phone or laptop.
2.  Ensure your **Backend** (Ngrok/Pi) is running.
3.  Ensure your **Mobile App** is running on the target phone.
4.  The dashboard should indicate "SERVER ONLINE" and detect the device!
