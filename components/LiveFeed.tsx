import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { analyzeSurveillanceFrame } from '../services/geminiService';

interface LiveFeedProps {
  onLog: (message: string, type: 'info' | 'ai' | 'error' | 'success' | 'warning') => void;
  active: boolean;
  socket: Socket | null;
  targetDeviceId: string;
}

const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export const LiveFeed: React.FC<LiveFeedProps> = ({ onLog, active, socket, targetDeviceId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'CONNECTING' | 'CONNECTED'>('IDLE');

  const startCall = useCallback(async () => {
    if (!socket) return;
    setConnectionStatus('CONNECTING');
    onLog("Initializing WebRTC Handshake...", 'info');

    const pc = new RTCPeerConnection(config);
    pcRef.current = pc;

    // Handle incoming stream
    pc.ontrack = (event) => {
        onLog("Remote video track received.", 'success');
        const remoteStream = event.streams[0];
        setStream(remoteStream);
        if (videoRef.current) {
            videoRef.current.srcObject = remoteStream;
        }
        setConnectionStatus('CONNECTED');
    };

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { target: targetDeviceId, candidate: event.candidate });
        }
    };

    // Create Offer
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    socket.emit('offer', { target: targetDeviceId, sdp: offer });

  }, [socket, targetDeviceId, onLog]);

  useEffect(() => {
    if (!active || !socket) return;

    // Socket listeners for WebRTC
    socket.on('answer', async (payload) => {
        if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
    });

    socket.on('ice-candidate', async (payload) => {
        if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
    });

    startCall();

    return () => {
        if (pcRef.current) pcRef.current.close();
        socket.off('answer');
        socket.off('ice-candidate');
    };
  }, [active, socket, startCall]);

  const takeSnapshot = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, 640, 480);
      const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
      
      onLog("Snapshot captured. Uploading to secure cloud...", 'info');

      setAnalyzing(true);
      onLog("Analyzing scene with Gemini AI...", 'info');
      const analysis = await analyzeSurveillanceFrame(imageData);
      onLog(`AI Report: ${analysis}`, 'ai');
      setAnalyzing(false);
    }
  }, [onLog]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-gray-800 shadow-2xl group flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {stream ? (
            <video 
                ref={videoRef}
                autoPlay 
                muted 
                playsInline
                className={`w-full h-full object-cover opacity-90 transition-opacity ${analyzing ? 'opacity-50' : ''}`}
            />
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-700">
                {connectionStatus === 'CONNECTING' ? (
                    <div className="flex flex-col items-center">
                         <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-xs font-mono text-green-500">ESTABLISHING SECURE LINK...</p>
                    </div>
                ) : (
                    <>
                        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        <p className="text-xs font-mono">WAITING FOR FEED</p>
                    </>
                )}
            </div>
        )}
        
        <canvas ref={canvasRef} width="640" height="480" className="hidden" />

        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
            <div className={`flex items-center gap-2 text-white text-xs px-2 py-1 rounded border font-mono ${connectionStatus === 'CONNECTED' ? 'bg-red-900/80 border-red-500' : 'bg-gray-900/80 border-gray-600'}`}>
                {connectionStatus === 'CONNECTED' && <div className="w-2 h-2 rounded-full bg-red-500 mr-1 animate-pulse"></div>}
                {connectionStatus === 'CONNECTED' ? 'LIVE' : 'OFFLINE'}
            </div>
            </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-14 bg-gray-900 border-t border-gray-800 flex items-center justify-center px-4 z-20">
            <button 
            onClick={takeSnapshot}
            disabled={!stream || analyzing}
            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-full border border-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2 px-4"
            >
            {analyzing ? (
                <svg className="animate-spin h-5 w-5 text-accent-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
            )}
            ANALYZE FRAME WITH AI
            </button>
      </div>
    </div>
  );
};