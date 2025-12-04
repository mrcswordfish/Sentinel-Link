# Deploying Sentinel Backend on Raspberry Pi

This guide will walk you through hosting the `backend/server.js` (Signaling Server) on a Raspberry Pi. This makes your command center "always on" without needing your main computer running.

## Prerequisites
*   A Raspberry Pi (3, 4, or 5 recommended) running Raspberry Pi OS.
*   The Pi must be connected to the internet.
*   SSH access to your Pi.

---

## Step 1: Install Node.js on Raspberry Pi

Connect to your Pi via SSH (or open the terminal on the Pi):

```bash
ssh pi@<YOUR_PI_IP_ADDRESS>
# Example: ssh pi@192.168.1.15
```

Update your system and install Node.js (Version 18 LTS is recommended):

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Add NodeSource repository (for Node.js 18)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 3. Install Node.js
sudo apt-get install -y nodejs

# 4. Verify installation
node -v
npm -v
```

---

## Step 2: Transfer the Backend Code

You need to move the `backend/` folder from your computer to the Pi.

**Option A: Using SCP (Secure Copy)**
Run this command **from your computer's terminal** (not the Pi):

```bash
# Navigate to your project folder
cd path/to/sentinel-app

# Copy the backend folder to the Pi's home directory
scp -r backend pi@<YOUR_PI_IP_ADDRESS>:~/sentinel-backend
```

**Option B: Using Git**
If your project is on GitHub:

```bash
# On the Pi
git clone https://github.com/yourusername/sentinel-app.git
cd sentinel-app/backend
```

---

## Step 3: Install Dependencies & Test

On the Raspberry Pi:

```bash
# 1. Navigate to the folder
cd ~/sentinel-backend

# 2. Install required libraries
npm install

# 3. Test run the server
node server.js
```

You should see:
`Sentinel Signaling Server running on port 3001`

Press `Ctrl + C` to stop it for now.

---

## Step 4: Run Automatically on Boot (PM2)

We use **PM2** (Process Manager 2) to keep the server running in the background and restart it if the Pi reboots.

```bash
# 1. Install PM2 globally
sudo npm install -g pm2

# 2. Start the server with PM2
pm2 start server.js --name sentinel-server

# 3. Freeze the process list for auto-resurrection
pm2 save

# 4. Generate the startup script
pm2 startup
```

*   **Note:** The last command (`pm2 startup`) will output a command starting with `sudo env PATH...`. **Copy and paste that command** into your terminal to finalize the setup.

Your server is now running 24/7!

---

## Step 5: Public Internet Access (Crucial)

Your mobile phone (on 4G/5G) needs to reach this Raspberry Pi.

### Option A: Ngrok (Easiest)
Ngrok creates a secure tunnel to your Pi without messing with router settings.

1.  **Install Ngrok on Pi:**
    ```bash
    curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
    echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
    sudo apt update && sudo apt install ngrok
    ```

2.  **Connect Ngrok Account:**
    Sign up at [ngrok.com](https://ngrok.com), get your Authtoken, and run:
    ```bash
    ngrok config add-authtoken <YOUR_TOKEN>
    ```

3.  **Start the Tunnel:**
    ```bash
    ngrok http 3001
    ```

4.  **Copy the URL:**
    Ngrok will give you a URL like `https://a1b2-c3d4.ngrok-free.app`.
    *   Use this URL in your **Mobile App** (`SERVER_URL`).
    *   Use this URL in your **Web Dashboard** (`App.tsx`).

### Option B: Port Forwarding (Advanced)
If you have a static public IP or Dynamic DNS (DDNS):

1.  **Static LAN IP:** Give your Pi a static IP (e.g., `192.168.1.50`) in your router settings.
2.  **Port Forward:** Log into your Router Admin Panel and forward **Port 3001** (TCP) to `192.168.1.50`.
3.  **Public IP:** Find your public IP by typing `curl ifconfig.me` on the Pi.
4.  **Connect:** Your `SERVER_URL` will be `http://<YOUR_PUBLIC_IP>:3001`.

---

## Step 6: Updating the Client Apps

Once your Pi is running:

1.  Copy the **Public URL** (from Ngrok or Port Forwarding).
2.  Open `mobile/App.tsx` and update `const SERVER_URL = 'https://your-new-url...'`.
3.  Rebuild and reinstall the mobile app.
4.  Open `App.tsx` (Web Dashboard) and update `const SERVER_URL = 'https://your-new-url...'`.
