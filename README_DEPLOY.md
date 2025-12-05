# Sentinel Link - Real Life Deployment Guide

To move from the web simulation to a real functioning application, you need to run the three components separately.

## 1. The Backend (Signaling Server)
This server manages the connection between the dashboard and the phone.

1. Navigate to the `backend/` folder.
2. Run `npm install`.
3. Run `npm start`.
4. Your server is now running on `http://localhost:3001`.

### 🌍 MAKING IT ACCESSIBLE OVER THE INTERNET (REQUIRED)
Localhost only works if your phone and computer are on the same Wi-Fi. To control the phone when it's on **4G/5G/LTE**:

1. **Install Ngrok:** Download and install [Ngrok](https://ngrok.com).
2. **Expose Server:** Open a terminal and run:
   ```bash
   ngrok http 3001
   ```
3. Copy the `https://....ngrok-free.app` URL provided. This is your **Public Server URL**.

## 2. The Mobile Client (Target Device)
This is the app you install on the phone you want to control.

1. You need a React Native development environment (Node, JDK, Android Studio/Xcode).
2. Follow the detailed steps in **README_MOBILE_BUILD.md** to set up your environment.
3. Create a new project: `npx @react-native-community/cli@latest init SentinelMobile`.
4. Copy the contents of `mobile/App.tsx` into your new project's `App.tsx`.
5. Install the specific native dependencies listed in `mobile/package.json`.
6. **CRITICAL:** Update `SERVER_URL` in `App.tsx` with your **Public Server URL** (the ngrok link from step 1).
   * Incorrect: `http://localhost:3001` (Will not work on phone)
   * Correct: `https://abcd-123-456.ngrok-free.app`
7. Build and install on your device: `npx react-native run-android`.

## 3. The Web Dashboard
The interface you use to control the device.

**See the dedicated guide: `README_WEB_DEPLOY.md`**

In summary:
1. Initialize a **Vite** React project locally.
2. Move the `components`, `services`, and `App.tsx` files into the new project.
3. Update the `SERVER_URL` in `App.tsx` to match your public backend URL.
4. Deploy using **Vercel** for free hosting.

## Legal Notice
Ensure you only install the Mobile Client on devices you legally own. Using this software to monitor individuals without their consent is a violation of privacy laws.