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

// CONFIGURATION
const SERVER_URL = 'http://YOUR_SERVER_IP:3001'; // Replace with your deployed backend URL
const DEVICE_ID = Platform.OS === 'android' ? 'AND-8392X' : 'IOS-4492A';

const configuration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };

const App = () => {
  const [status, setStatus] = useState('Disconnected');
  const socketRef = useRef(null);
  const pcRef = useRef(null); // PeerConnection

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
    socketRef.current = io(SERVER_URL);

    socketRef.current.on('connect', () => {
      setStatus('Connected to Signaling Server');
      socketRef.current.emit('register-device', { deviceId: DEVICE_ID, os: Platform.OS });
    });

    // --- WEBRTC HANDLERS ---
    
    socketRef.current.on('offer', async (remoteOffer) => {
      console.log('Received Offer');
      setStatus('Streaming Video...');
      
      // 1. Get Local Media (Camera/Mic)
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' }
      });

      // 2. Create Peer Connection
      const pc = new RTCPeerConnection(configuration);
      pcRef.current = pc;

      // 3. Add Track to Peer Connection
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // 4. Set Remote Description
      await pc.setRemoteDescription(new RTCSessionDescription(remoteOffer));

      // 5. Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 6. Send Answer to Admin
      socketRef.current.emit('answer', { target: 'admin', sdp: answer });

      // Handle ICE Candidates
      (pc as any).onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', { target: 'admin', candidate: event.candidate });
        }
      };
    });

    // --- COMMAND HANDLERS ---

    socketRef.current.on('command', async (payload) => {
      const { command, params } = payload;
      console.log('Received Command:', command);

      switch (command) {
        case 'LOCK_DEVICE':
            // Note: Actual locking requires Device Admin privileges (native module required)
            // This is a placeholder for the logic
            setStatus('DEVICE LOCKED BY ADMIN');
            break;
            
        case 'TRIGGER_ALARM':
            // Play loud sound using react-native-sound
            setStatus('ALARM TRIGGERED');
            break;

        case 'WIPE_DATA':
            // Warning: Dangerous. Requires specific implementation per OS.
            setStatus('WIPING DATA...');
            // Example: Delete specific app folders
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
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
            );
            break;
      }
    });
    
    // --- FILE SYSTEM HANDLERS ---
    
    socketRef.current.on('request-file-list', async () => {
        // Read directory
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
            console.error(e);
        }
    });

    socketRef.current.on('delete-file', async ({ filePath }) => {
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
      <Text style={styles.title}>SENTINEL CLIENT</Text>
      <Text style={styles.status}>Status: {status}</Text>
      <Text style={styles.info}>Device ID: {DEVICE_ID}</Text>
      <View style={styles.dot} />
      <Text style={styles.warning}>
         Keep app open in foreground for connectivity.{'\n'}
         (Background service required for sleep mode)
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
      fontSize: 12
  }
});

export default App;