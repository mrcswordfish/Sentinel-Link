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
      try {
        const permissionsToRequest = [
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        // Android 13+ requires granular media permissions
        if (Platform.Version >= 33) {
            permissionsToRequest.push('android.permission.READ_MEDIA_IMAGES');
            permissionsToRequest.push('android.permission.READ_MEDIA_VIDEO');
        } else {
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }

        await PermissionsAndroid.requestMultiple(permissionsToRequest);
      } catch (err) {
        console.warn(err);
      }
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

    // --- WEBRTC HANDLERS (CRASH PROOFING) ---
    
    socketRef.current.on('offer', async (remoteOfferPayload: any) => {
      // WRAP EVERYTHING in a top-level try-catch to prevent App Crash
      try {
        console.log('Received Offer Payload'); 
        setStatus('Negotiating Connection...');

        // Close any existing connection to avoid state conflict
        if (pcRef.current) {
            console.log("Closing existing peer connection");
            try { pcRef.current.close(); } catch(e) {}
            pcRef.current = null;
        }

        // --- 1. Parse SDP Safely ---
        // Robust logic to find the 'sdp' string and 'type' regardless of nesting
        let sdpString = "";
        let sdpType = "offer"; // Default since this is the 'offer' event

        if (remoteOfferPayload) {
            if (typeof remoteOfferPayload.sdp === 'string') {
                 // Case: { target: '...', sdp: "v=0..." }
                 sdpString = remoteOfferPayload.sdp;
                 if (remoteOfferPayload.type) sdpType = remoteOfferPayload.type;
            } else if (typeof remoteOfferPayload.sdp === 'object') {
                 // Case: { target: '...', sdp: { type: 'offer', sdp: "v=0..." } }
                 sdpString = remoteOfferPayload.sdp.sdp;
                 if (remoteOfferPayload.sdp.type) sdpType = remoteOfferPayload.sdp.type;
            } else if (remoteOfferPayload.type && !remoteOfferPayload.sdp) {
                 // Weird case, might be direct object
                 // Ignore for now
            }
        }

        if (!sdpString) {
             console.error("Could not extract SDP string from payload", remoteOfferPayload);
             setStatus("Connection Failed: Bad Handshake Format");
             return;
        }

        // --- 2. Get Media Stream ---
        let stream;
        try {
            stream = await mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user', frameRate: 30, width: 640, height: 480 }
            });
        } catch (mediaErr) {
            console.error("getUserMedia Error:", mediaErr);
            setStatus("Camera Error: Check Permissions");
            return;
        }

        // --- 3. Create Peer Connection ---
        const pc = new RTCPeerConnection(configuration);
        pcRef.current = pc;
        
        // Add tracks
        const tracks = stream.getTracks();
        tracks.forEach(track => pc.addTrack(track, stream));

        // --- 4. Set Remote Description (The likely crash point) ---
        try {
            // Force type to 'offer' if it was undefined to prevent "invalid type" error
            const cleanType = (sdpType && sdpType !== 'undefined') ? sdpType : 'offer';
            
            const sessionDesc = new RTCSessionDescription({
                type: cleanType, 
                sdp: sdpString
            });
            await pc.setRemoteDescription(sessionDesc);
        } catch (sdpErr) {
             console.error("setRemoteDescription Error:", sdpErr);
             setStatus("Handshake Error: Remote Description Failed");
             pc.close();
             return;
        }

        // --- 5. Create Answer ---
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        // --- 6. Send Answer ---
        socketRef.current.emit('answer', { 
            target: 'admin', 
            sdp: { type: answer.type, sdp: answer.sdp } 
        });

        // ICE Candidates
        (pc as any).onicecandidate = (event: any) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', { target: 'admin', candidate: event.candidate });
            }
        };

        setStatus('Streaming Active');

      } catch (globalErr: any) {
         console.error("CRITICAL WEBRTC ERROR:", globalErr);
         setStatus(`Critical Error: ${globalErr?.message}`);
      }
    });

    // --- COMMAND HANDLERS ---

    socketRef.current.on('command', async (payload: any) => {
      try {
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
                try {
                    Geolocation.getCurrentPosition(
                        (position) => {
                            if (socketRef.current) socketRef.current.emit('location-update', position);
                        },
                        (error) => {
                            console.log(error.code, error.message);
                        },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                    );
                } catch (locErr) {
                    console.log("Location Error", locErr);
                }
                break;
          }
      } catch (cmdErr) {
          console.error("Command Error", cmdErr);
      }
    });
    
    // --- FILE SYSTEM HANDLERS ---
    
    socketRef.current.on('request-file-list', async () => {
        try {
            // Check multiple paths to ensure we find files
            const pathsToCheck = [
                RNFS.ExternalStorageDirectoryPath + '/DCIM/Camera',
                RNFS.ExternalStorageDirectoryPath + '/Pictures',
                RNFS.ExternalStorageDirectoryPath + '/Download',
                RNFS.DocumentDirectoryPath // Fallback
            ];

            let allFiles: any[] = [];

            for (const path of pathsToCheck) {
                try {
                    const result = await RNFS.readDir(path);
                    const mapped = result
                        .filter(f => f.isFile())
                        .map(file => ({
                            name: file.name,
                            path: file.path,
                            size: file.size,
                            date: file.mtime
                        }));
                    allFiles = [...allFiles, ...mapped];
                } catch(e) {
                    // Ignore paths that don't exist
                }
            }
            
            // Limit to 100 recent files to prevent overload
            allFiles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const limitedFiles = allFiles.slice(0, 100);

            socketRef.current.emit('file-list', { files: limitedFiles });
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
      <Text style={styles.title}>SENTINEL CLIENT v2.3</Text>
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