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
2. Create a new project: `npx react-native init SentinelMobile`.
3. Copy the contents of `mobile/App.tsx` into your new project's `App.tsx`.
4. Install the specific native dependencies listed in `mobile/package.json`.
5. **CRITICAL:** Update `SERVER_URL` in `App.tsx` with your **Public Server URL** (the ngrok link from step 1).
   * Incorrect: `http://localhost:3001` (Will not work on phone)
   * Correct: `https://abcd-123-456.ngrok-free.app`
6. Build and install on your device: `npx react-native run-android` or `run-ios`.

## 3. The Web Dashboard
The current web folder.

1. Update `App.tsx` (in the web folder) to remove the simulation logic and instead use `socket.io-client` to connect to your Backend Server.
2. Implement the `WebRTC` receiving logic (simulated in the current `LiveFeed` component) using standard browser APIs (`new RTCPeerConnection()`).

## Legal Notice
Ensure you only install the Mobile Client on devices you legally own. Using this software to monitor individuals without their consent is a violation of privacy laws.