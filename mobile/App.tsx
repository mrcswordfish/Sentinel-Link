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
import { mediaDevices, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, registerGlobals } from 'react-native-webrtc';
import RNFS from 'react-native-fs';
import Geolocation from 'react-native-geolocation-service';

// Polyfill WebRTC Globals
registerGlobals();

// --- CONFIGURATION ---
// UPDATED: Using your specific Ngrok URL
const SERVER_URL = 'https://multisulcate-colourational-isa.ngrok-free.dev'; 
const DEVICE_ID = (Platform.OS === 'android' ? 'AND-' : 'IOS-') + Math.floor(Math.random() * 9000 + 1000);

const configuration = { 
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ] 
};

const App = () => {
  const [status, setStatus] = useState('Booting...');
  const [localStream, setLocalStream] = useState<any>(null);
  
  const socketRef = useRef<any>(null);
  const pcRef = useRef<any>(null); 
  const streamRef = useRef<any>(null); // Ref for immediate access in callbacks

  useEffect(() => {
    let mounted = true;

    const startSystem = async () => {
        try {
            // 1. Permissions
            setStatus('Requesting Permissions...');
            const perms = await requestPermissions();
            if (!perms && mounted) {
                setStatus('Permissions Denied');
                return;
            }

            // 2. Hardware Initialization (BEFORE Socket)
            setStatus('Initializing Camera...');
            const stream = await initHardware();
            
            if (stream && mounted) {
                streamRef.current = stream;
                setLocalStream(stream);
                
                // 3. Connect Network
                setStatus('Connecting to Neural Net...');
                connectSocket();
            } else if (mounted) {
                setStatus('Hardware Failed. Retrying...');
            }

        } catch (e: any) {
            if (mounted) setStatus(`System Failure: ${e.message}`);
        }
    };

    startSystem();

    return () => {
        mounted = false;
        if (socketRef.current) socketRef.current.disconnect();
        if (pcRef.current) pcRef.current.close();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t: any) => t.stop());
        }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ...(Platform.Version >= 33 ? [
              'android.permission.READ_MEDIA_IMAGES' as any,
              'android.permission.READ_MEDIA_VIDEO' as any
          ] : [
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          ])
        ]);
        
        return Object.values(grants).every(r => r === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const initHardware = async () => {
      try {
          // Attempt 1: Standard Video/Audio
          return await mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (e) {
          console.log("Video failed, trying Audio only...");
          try {
              // Attempt 2: Audio Only (Crash fallback)
              return await mediaDevices.getUserMedia({ audio: true, video: false });
          } catch (e2) {
              console.error("Hardware Init Failed", e2);
              return null;
          }
      }
  };

  const connectSocket = () => {
    socketRef.current = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      setStatus('Online - Awaiting Command');
      socketRef.current.emit('register-device', { deviceId: DEVICE_ID, os: Platform.OS });
    });

    socketRef.current.on('disconnect', () => {
      setStatus('Disconnected. Reconnecting...');
    });

    // --- WEBRTC LOGIC ---
    
    socketRef.current.on('offer', async (payload: any) => {
        // CRITICAL: Check if hardware is ready. If not, ignore offer to prevent crash.
        if (!streamRef.current) {
            console.warn("Received offer but hardware not ready");
            setStatus("Error: Camera not ready");
            return;
        }

        try {
            console.log('Handshake Initiated'); 
            setStatus('Establishing Uplink...');

            // Cleanup old PC
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }

            // Fix: Cast to any to handle type mismatch with onicecandidate/onconnectionstatechange
            const pc: any = new RTCPeerConnection(configuration);
            pcRef.current = pc;

            // Add Tracks (Safe now because stream exists)
            const tracks = streamRef.current.getTracks();
            tracks.forEach((track: any) => pc.addTrack(track, streamRef.current));

            // Parse SDP safely
            let sdp = payload.sdp;
            if (typeof sdp === 'object' && sdp.sdp) sdp = sdp.sdp; // Unwrap if nested
            if (typeof sdp !== 'string') {
                console.error("Invalid SDP received");
                return;
            }

            // Set Remote
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));

            // Answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socketRef.current.emit('answer', { 
                target: 'admin', 
                sdp: { type: 'answer', sdp: answer.sdp } 
            });

            // ICE
            pc.onicecandidate = (event: any) => {
                if (event.candidate) {
                    socketRef.current.emit('ice-candidate', { target: 'admin', candidate: event.candidate });
                }
            };
            
            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'connected') setStatus('LIVE FEED ACTIVE');
                else if (pc.connectionState === 'failed') setStatus('Connection Failed');
            };

        } catch (e: any) {
            console.error("WebRTC Error:", e);
            setStatus(`Link Error: ${e.message}`);
        }
    });

    // --- COMMANDS ---

    socketRef.current.on('command', (payload: any) => {
      const { command } = payload;
      if (command === 'GET_LOCATION') {
          Geolocation.getCurrentPosition(
              (pos) => socketRef.current?.emit('location-update', pos),
              (err) => console.log(err),
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
      } else if (command === 'WIPE_DATA') {
          setStatus('WIPING DATA...');
          RNFS.unlink(RNFS.DocumentDirectoryPath).catch(()=>{});
      } else if (command === 'LOCK_DEVICE') {
          setStatus('DEVICE LOCKED');
      } else if (command === 'TRIGGER_ALARM') {
          setStatus('ALARM TRIGGERED');
      }
    });

    // --- FILES ---

    socketRef.current.on('request-file-list', async () => {
        try {
            // Android specific path
            const path = RNFS.ExternalStorageDirectoryPath + '/DCIM/Camera';
            const exists = await RNFS.exists(path);
            if(exists) {
                const result = await RNFS.readDir(path);
                const files = result.filter(f => f.isFile()).slice(0, 50).map(f => ({
                    name: f.name, path: f.path, size: f.size, date: f.mtime
                }));
                socketRef.current?.emit('file-list', { files });
            } else {
                socketRef.current?.emit('file-list', { files: [] });
            }
        } catch(e) { 
            socketRef.current?.emit('file-list', { files: [] });
        }
    });

    socketRef.current.on('download-file-request', async ({ filePath, fileName }: any) => {
        try {
            const data = await RNFS.readFile(filePath, 'base64');
            socketRef.current?.emit('file-data', { fileName, data });
        } catch(e) {}
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SENTINEL v4.0</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.id}>ID: {DEVICE_ID}</Text>
      <View style={[styles.indicator, { backgroundColor: streamRef.current ? '#0f0' : '#333' }]} />
      <Text style={styles.url}>{SERVER_URL}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#0f0', fontSize: 28, fontWeight: 'bold', marginBottom: 20, fontFamily: 'monospace' },
  status: { color: '#fff', fontSize: 16, marginBottom: 10, textAlign: 'center', fontFamily: 'monospace' },
  id: { color: '#666', marginBottom: 30, fontFamily: 'monospace' },
  indicator: { width: 12, height: 12, borderRadius: 6, marginBottom: 20 },
  url: { color: '#444', marginTop: 30, fontSize: 10, fontFamily: 'monospace' }
});

export default App;