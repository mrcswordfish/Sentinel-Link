# Sentinel Link - Real Life Deployment Guide

To move from the web simulation to a real functioning application, you need to run the three components separately.

## 1. The Backend (Signaling Server)
This server manages the connection between the dashboard and the phone.

1. Navigate to the `backend/` folder.
2. Run `npm install`.
3. Run `npm start`.
4. Your server is now running on `http://localhost:3001`.
   * *For real remote use, deploy this folder to a service like Heroku, Railway, or Render.*

## 2. The Mobile Client (Target Device)
This is the app you install on the phone you want to control.

1. You need a React Native development environment (Node, JDK, Android Studio/Xcode).
2. Create a new project: `npx react-native init SentinelMobile`.
3. Copy the contents of `mobile/App.tsx` into your new project's `App.tsx`.
4. Install the specific native dependencies listed in `mobile/package.json`.
5. **Important:** Update the `SERVER_URL` in `App.tsx` to point to your deployed Backend Server IP (not localhost, as localhost on the phone refers to the phone itself).
6. Build and install on your device: `npx react-native run-android` or `run-ios`.

## 3. The Web Dashboard
The current web folder.

1. Update `App.tsx` (in the web folder) to remove the simulation logic and instead use `socket.io-client` to connect to your Backend Server.
2. Implement the `WebRTC` receiving logic (simulated in the current `LiveFeed` component) using standard browser APIs (`new RTCPeerConnection()`).

## Legal Notice
Ensure you only install the Mobile Client on devices you legally own. Using this software to monitor individuals without their consent is a violation of privacy laws.
