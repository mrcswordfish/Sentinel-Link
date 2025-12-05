/**
 * SENTINEL LINK - MOBILE CLIENT
 * 
 * Instructions:
 * 1. Initialize a React Native CLI project (npx react-native init SentinelMobile)
 * 2. Install dependencies: npm install react-native-webrtc socket.io-client react-native-fs react-native-geolocation-service
 * 3. Add camera/mic/location permissions to AndroidManifest.xml and Info.plist
 * 4. Replace App.tsx with this code.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import { io } from 'socket.io-client';
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import RNFS from 'react-native-fs'; // File System
import Geolocation from 'react-native-geolocation-service';

// --- CONNECTION CONFIGURATION ---
// UPDATED: Using your specific Ngrok URL
const SERVER_URL = 'https://multisulcate-colourational-isa.ngrok-free.dev'; 
const DEVICE_ID = Platform.OS === 'android' ? 'AND-8392X' : 'IOS-4492A';

// WebRTC Config: STUN servers are required for traversing NATs (connecting over internet)
const configuration = { 
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" }
  ] 
};

const App = () => {
  const [status, setStatus] = useState('Disconnected');
  const socketRef = useRef<any>(null);
  const pcRef = useRef<any>(null); // PeerConnection

  useEffect(() => {
    requestPermissions();
    connectToServer();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]);
    }
  };

  const connectToServer = () => {
    // Mobile Connection Options
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket'], // FORCE WebSocket. Polling often fails on mobile networks.
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity, // Keep trying forever
    });

    socketRef.current.on('connect', () => {
      setStatus('Connected to Signaling Server');
      socketRef.current.emit('register-device', { deviceId: DEVICE_ID, os: Platform.OS });
    });

    socketRef.current.on('disconnect', () => {
      setStatus('Reconnecting...');
    });

    socketRef.current.on('connect_error', (err: any) => {
        setStatus(`Connection Error: ${err.message}`);
    });

    // --- WEBRTC HANDLERS ---
    
    socketRef.current.on('offer', async (remoteOfferPayload: any) => {
      console.log('Received Offer');
      setStatus('Streaming Video...');
      
      // 1. Get Local Media (Camera/Mic)
      let stream;
      try {
        stream = await mediaDevices.getUserMedia({
            audio: true,
            video: { 
                facingMode: 'user', 
                frameRate: 30, 
                width: 640, 
                height: 480 
            }
        });
      } catch (err) {
        console.error("Failed to get media", err);
        setStatus("Camera Error: Check Permissions");
        return;
      }

      // 2. Create Peer Connection
      const pc = new RTCPeerConnection(configuration);
      pcRef.current = pc;

      // 3. Add Track to Peer Connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Set Remote Description
      // FIX: Access the inner 'sdp' property. The payload is { target: '...', sdp: { type: 'offer', sdp: '...' } }
      try {
        if (remoteOfferPayload.sdp) {
             await pc.setRemoteDescription(new RTCSessionDescription(remoteOfferPayload.sdp));
        } else {
             // Fallback if payload is just the sdp
             await pc.setRemoteDescription(new RTCSessionDescription(remoteOfferPayload));
        }
      } catch(e) {
          console.error("Session Description Error", e);
          setStatus("Connection Error: SDP Failed");
          return;
      }

      // 5. Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 6. Send Answer to Admin
      socketRef.current.emit('answer', { target: 'admin', sdp: answer });

      // Handle ICE Candidates
      (pc as any).onicecandidate = (event: any) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', { target: 'admin', candidate: event.candidate });
        }
      };
    });

    // --- COMMAND HANDLERS ---

    socketRef.current.on('command', async (payload: any) => {
      const { command, params } = payload;
      console.log('Received Command:', command);

      switch (command) {
        case 'LOCK_DEVICE':
            setStatus('DEVICE LOCKED BY ADMIN');
            break;
            
        case 'TRIGGER_ALARM':
            setStatus('ALARM TRIGGERED');
            break;

        case 'WIPE_DATA':
            setStatus('WIPING DATA...');
            const path = RNFS.DocumentDirectoryPath;
            RNFS.unlink(path)
                .then(() => console.log('App Data Deleted'))
                .catch((err) => console.log(err.message));
            break;
            
        case 'GET_LOCATION':
            Geolocation.getCurrentPosition(
                (position) => {
                    socketRef.current.emit('location-update', position);
                },
                (error) => {
                    console.log(error.code, error.message);
                    // Send error back so dashboard knows
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
            break;
      }
    });
    
    // --- FILE SYSTEM HANDLERS ---
    
    socketRef.current.on('request-file-list', async () => {
        const path = Platform.OS === 'android' ? RNFS.ExternalStorageDirectoryPath + '/DCIM/Camera' : RNFS.DocumentDirectoryPath;
        try {
            const result = await RNFS.readDir(path);
            const files = result.map(file => ({
                name: file.name,
                path: file.path,
                size: file.size,
                date: file.mtime
            }));
            socketRef.current.emit('file-list', { files });
        } catch(e) {
            console.error("File List Error:", e);
        }
    });

    socketRef.current.on('download-file-request', async ({ filePath, fileName }: { filePath: string, fileName: string }) => {
        try {
            console.log(`Uploading ${fileName}...`);
            setStatus(`Uploading ${fileName}...`);
            // Read file as Base64 string
            const fileContent = await RNFS.readFile(filePath, 'base64');
            // Send back to admin
            socketRef.current.emit('file-data', { fileName, data: fileContent });
            setStatus('Upload Complete');
        } catch(e) {
            console.error("Read Error:", e);
            setStatus(`Error reading ${fileName}`);
        }
    });

    socketRef.current.on('delete-file', async ({ filePath }: { filePath: string }) => {
        try {
            await RNFS.unlink(filePath);
            socketRef.current.emit('command-success', { msg: `Deleted ${filePath}` });
        } catch(e) {
            console.error(e);
        }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SENTINEL CLIENT v2.1</Text>
      <Text style={styles.status}>Status: {status}</Text>
      <Text style={styles.info}>Device ID: {DEVICE_ID}</Text>
      <View style={styles.dot} />
      <Text style={styles.warning}>
         Target Server: {SERVER_URL}{'\n'}
         (Ensure this URL is publicly accessible)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#00cc66',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    paddingHorizontal: 20
  },
  info: {
      color: '#666',
      marginBottom: 30
  },
  dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#00cc66',
      marginBottom: 20
  },
  warning: {
      color: '#333',
      textAlign: 'center',
      fontSize: 12,
      marginTop: 20
  }
});

export default App;