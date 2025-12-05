# Sentinel Link - Windows & Android Build Guide

This guide is tailored for users developing on a **Windows Laptop** using **Visual Studio Code**. 

**Note:** You can only build and run the **Android** version of the app on Windows. Building iOS apps requires a Mac.

---

## Phase 1: Environment Setup (One-Time Setup)

Before you can write code, you need to install the engine that builds mobile apps.

### 1. Install Visual Studio Code
1.  Download and install [VS Code for Windows](https://code.visualstudio.com/).
2.  **Recommended Extension:** Open VS Code, go to Extensions (Square icon on left), and install **"ES7+ React/Redux/React-Native snippets"**.

### 2. Install Node.js & Java (JDK)
1.  **Node.js:** Download the [Node.js LTS (Long Term Support)](https://nodejs.org/en) installer for Windows and run it. Accept all defaults.
2.  **Java JDK 17:** React Native requires Java 17.
    *   Download [OpenJDK 17 (Windows MSI)](https://adoptium.net/temurin/releases/?version=17).
    *   Run the installer. **Important:** On the "Custom Setup" screen, make sure to select **"Set JAVA_HOME variable"** (click the red X and change to "Will be installed on local hard drive").

### 3. Install Android Studio
1.  Download [Android Studio](https://developer.android.com/studio).
2.  Run the installer. Ensure "Android Virtual Device" is checked.
3.  Open Android Studio.
4.  Click **More Actions > SDK Manager**.
5.  **SDK Platforms Tab:** Check **"Android 14.0 ("UpsideDownCake")"** (API 34).
6.  **SDK Tools Tab:** Check **"Android SDK Command-line Tools (latest)"**.
7.  Click **Apply** and wait for the download to finish.

### 4. Configure Environment Variables (Crucial Step)
Windows needs to know where Android Studio is.

1.  Press the **Windows Key**, type **"Edit the system environment variables"**, and hit Enter.
2.  Click the **Environment Variables...** button.
3.  Under **User variables** (top box), click **New**.
    *   **Variable name:** `ANDROID_HOME`
    *   **Variable value:** `%LOCALAPPDATA%\Android\Sdk`
4.  Click **OK**.
5.  Now, find the variable named `Path` in the top box, select it, and click **Edit**.
6.  Click **New** and paste: `%LOCALAPPDATA%\Android\Sdk\platform-tools`
7.  Click **OK** on all windows to close them.

---

## Phase 2: Create the Project

1.  Open **Command Prompt** (cmd.exe) or **PowerShell**.
2.  Navigate to where you want to keep your project (e.g., Documents):
    ```powershell
    cd Documents
    ```
3.  **Clean up:** If a `SentinelMobile` folder exists from a failed attempt, delete it first.
4.  **Initialize the project:** (Use this specific command to avoid the "deprecated" error):
    ```powershell
    npx @react-native-community/cli@latest init SentinelMobile
    ```
    *(If asked to install the package, type `y` and Enter)*.
5.  Once finished, open **VS Code**.
6.  Go to **File > Open Folder...** and select the new `SentinelMobile` folder inside Documents.

---

## Phase 3: Install Dependencies

Now we work inside VS Code's terminal.

1.  In VS Code, go to **Terminal > New Terminal** (top menu).
2.  Paste this command and hit Enter:
    ```bash
    npm install socket.io-client react-native-webrtc react-native-fs react-native-geolocation-service react-native-incall-manager
    ```

---

## Phase 4: Code Integration

We will now copy the logic from the web project into this mobile project.

1.  In the VS Code file explorer (left sidebar), click `App.tsx` to open it.
2.  **Delete everything** in this file.
3.  **Copy & Paste** the code provided in the `mobile/App.tsx` file from the main project instructions.
4.  **CRITICAL:** Find this line near the top:
    ```javascript
    const SERVER_URL = 'http://YOUR_PUBLIC_SERVER_ADDRESS:3001';
    ```
    *   If testing locally with a Raspberry Pi on the same Wi-Fi, use the Pi's IP (e.g., `http://192.168.1.50:3001`).
    *   If using **Ngrok** (recommended for real-world testing), use your Ngrok URL (e.g., `https://a1b2-c3d4.ngrok-free.app`).
    *   **Do not** use `localhost`.

---

## Phase 5: Android Permissions

We need to tell the Android phone that this app needs the Camera and GPS.

1.  In VS Code, open this file:
    `android/app/src/main/AndroidManifest.xml`
2.  Find the line `<application ...`.
3.  **Paste these permissions** right *above* the `<application` tag:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />

<uses-feature android:name="android.hardware.camera" />
<uses-feature android:name="android.hardware.camera.autofocus" />
```

4.  Save the file (Ctrl + S).

---

## Phase 6: Build Configuration

WebRTC (the video library) needs a specific Android version setting.

1.  In VS Code, open: `android/build.gradle` (The one in the `android` folder, NOT `android/app`).
2.  Find the `buildscript { ext { ... } }` block.
3.  Change `minSdkVersion` to `24`:

```gradle
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24  // <--- CHANGE THIS (Default is usually 21)
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "26.1.10909125"
    }
    ...
}
```
4.  Save the file.

---

## Phase 7: Run on Real Android Phone (Via USB)

This is the fastest way to test while you are coding.

1.  **Prepare Phone:** Enable "Developer Options" & "USB Debugging" in Android Settings.
2.  **Connect:** Plug your phone into the laptop via USB.
3.  **Run:** `npx react-native run-android`

---

## Troubleshooting: "I still see the Welcome to React Native screen"

If you installed the app but it shows the default "Welcome" screen instead of the "SENTINEL CLIENT" black screen:

1.  **Verify File Replacement:**
    Ensure you actually **deleted** the default code in `SentinelMobile/App.tsx` and pasted the new code from Step 4. Save the file (`Ctrl+S`).

2.  **Clear Build Cache (Most Common Fix):**
    React Native sometimes "remembers" the old code. Run this command in your VS Code terminal to force a fresh update:
    ```bash
    npx react-native start --reset-cache
    ```
    Then, in a second terminal window, run:
    ```bash
    npx react-native run-android
    ```

3.  **Shake to Reload:**
    With the app open on your phone, shake the device physically. A menu will appear. Tap **"Reload"**.

---

## Phase 8: Generate Standalone APK (No USB needed)

Use this method if you want a file (`.apk`) that you can download, email, or install on any Android phone without needing your laptop connected.

### Step 1: Configure "Release" Mode
By default, React Native requires a complex "signing key" for release files. We will use the default debug key for simplicity so you can build it immediately.

1.  Open `android/app/build.gradle` in VS Code.
2.  Find the block named `buildTypes`.
3.  Add the line `signingConfig signingConfigs.debug` inside the `release` block. It should look like this:

```gradle
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own key.
            // For this personal project, we use the debug key to make it easy to build.
            signingConfig signingConfigs.debug 
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
```
4.  Save the file.

### Step 2: Compile the APK
1.  Open your Terminal in VS Code.
2.  Navigate to the android folder:
    ```bash
    cd android
    ```
3.  Run the build command:
    ```bash
    ./gradlew assembleRelease
    ```
    *(Note: On PowerShell, if that fails, try `.\gradlew assembleRelease`)*

This process will take 5-10 minutes.

### Step 3: Locate the File
Once the command says **BUILD SUCCESSFUL**, your file is ready.

1.  Open your Windows File Explorer.
2.  Navigate to: `Documents\SentinelMobile\android\app\build\outputs\apk\release`
3.  You will see a file named: **app-release.apk**.

### Step 4: Install
1.  Send this **app-release.apk** to your phone (via Email, Google Drive, WhatsApp, or USB transfer).
2.  Open it on your phone.
3.  Android will ask "Do you want to install this app?". Say **Yes**.
    *(You might need to allow "Install unknown apps" in settings).*