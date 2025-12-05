import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { LiveFeed } from './components/LiveFeed';
import { LocationMap } from './components/LocationMap';
import { SignalChart } from './components/SignalChart';
import { FileManager } from './components/FileManager';
import { DownloadModal } from './components/DownloadModal';
import { generateSecurityReport } from './services/geminiService';

// Fixed: Explicit type imports
import type { LogEntry, SignalDataPoint } from './types';

interface Device {
  deviceId: string;
  os: 'android' | 'ios';
  socketId?: string;
}

// UPDATED: Using your specific Ngrok URL
const SERVER_URL = 'https://multisulcate-colourational-isa.ngrok-free.dev'; 

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [signalHistory, setSignalHistory] = useState<SignalDataPoint[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isWiping, setIsWiping] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [serverConnected, setServerConnected] = useState(false);

  // FIX: Memoize this function so it doesn't change on every render.
  // This prevents child components (like LiveFeed) from resetting endlessly.
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
    };
    setLogs(prev => [...prev.slice(-50), newLog]);
  }, []);

  // --- SOCKET CONNECTION ---
  useEffect(() => {
    // FIX: Use 'polling' first so custom headers (ngrok-skip) can be sent.
    // Browsers CANNOT send custom headers on pure WebSocket connections.
    const newSocket = io(SERVER_URL, {
      transports: ['polling', 'websocket'], 
      extraHeaders: {
        "ngrok-skip-browser-warning": "true"
      },
      withCredentials: false
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setServerConnected(true);
      newSocket.emit('register-admin');
      newSocket.emit('get-active-devices');
      addLog('Connected to Sentinel Command Server', 'success');
    });

    newSocket.on('disconnect', () => {
      setServerConnected(false);
      addLog('Disconnected from server', 'error');
    });

    newSocket.on('connect_error', (err) => {
      console.error("Socket Connection Error:", err);
      // Helpful debug message for Ngrok issues
      if (err.message === "xhr poll error") {
         addLog("Connection Failed: Ngrok might be blocking the request. Check console.", 'error');
      } else {
         addLog(`Connection Error: ${err.message}`, 'error');
      }
    });

    // Device Discovery Events
    newSocket.on('active-devices-list', (list: Device[]) => {
        setDevices(list);
    });

    newSocket.on('device-online', (device: Device) => {
        addLog(`Device Detected: ${device.deviceId}`, 'info');
        setDevices(prev => {
            if (prev.find(d => d.deviceId === device.deviceId)) return prev;
            return [...prev, device];
        });
    });

    newSocket.on('device-offline', ({ deviceId }: { deviceId: string }) => {
        addLog(`Device Lost: ${deviceId}`, 'warning');
        setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
        if (selectedDevice?.deviceId === deviceId) {
            setSelectedDevice(null);
            alert(`Connection lost to ${deviceId}`);
        }
    });

    return () => { newSocket.close(); }
  }, [addLog, selectedDevice]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Fake Signal Data (Visual only)
  useEffect(() => {
    if (!selectedDevice) return;
    const interval = setInterval(() => {
      const now = new Date();
      setSignalHistory(prev => {
        const newData = [...prev, {
          time: now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }),
          strength: Math.floor(Math.random() * (100 - 60 + 1) + 60)
        }];
        return newData.slice(-20);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedDevice]);

  // --- COMMANDS ---

  const handleWipeData = () => {
    if (!socket || !selectedDevice) return;
    if(!window.confirm(`WARNING: This will permanently delete all data on ${selectedDevice.deviceId}. Are you sure?`)) return;
    
    setIsWiping(true);
    addLog("Sending WIPE command...", 'warning');
    socket.emit('command', { 
        targetDeviceId: selectedDevice.deviceId, 
        command: 'WIPE_DATA' 
    });
    
    setTimeout(() => { setIsWiping(false); }, 5000); // Reset UI state after delay
  };

  const handleLockDevice = () => {
    if (!socket || !selectedDevice) return;
    addLog("Sending LOCK command...", 'info');
    socket.emit('command', { 
        targetDeviceId: selectedDevice.deviceId, 
        command: 'LOCK_DEVICE' 
    });
  };

  const handleAlarm = () => {
    if (!socket || !selectedDevice) return;
    addLog("Triggering Remote Alarm...", 'warning');
    socket.emit('command', { 
        targetDeviceId: selectedDevice.deviceId, 
        command: 'TRIGGER_ALARM' 
    });
  };

  const handleGenerateReport = async () => {
      addLog("Generating intelligence report via Gemini...", 'info');
      const recentLogs = logs.slice(-10).map(l => l.message);
      const report = await generateSecurityReport(recentLogs);
      addLog(`REPORT: ${report}`, 'ai');
  };

  const handleSelectDevice = (device: Device) => {
      setSelectedDevice(device);
      addLog(`Connected to target: ${device.deviceId}`, 'success');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 p-4 font-sans selection:bg-green-500/30 selection:text-green-200">
      
      {/* Modals */}
      {showFileManager && socket && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <FileManager 
            socket={socket}
            targetDeviceId={selectedDevice.deviceId}
            onLog={addLog} 
            onClose={() => setShowFileManager(false)} 
            deviceOS={selectedDevice.os}
          />
        </div>
      )}

      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <DownloadModal onClose={() => setShowDownloadModal(false)} />
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-gray-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(0,255,100,0.5)]">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-white">SENTINEL LINK</h1>
            <div className="flex items-center gap-2">
               <span className={`w-2 h-2 rounded-full ${serverConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
               <span className="text-xs text-gray-500 font-mono">{serverConnected ? 'SERVER ONLINE' : 'SERVER DISCONNECTED'}</span>
            </div>
          </div>
        </div>
        
        {/* Device ID Badge */}
        {selectedDevice && (
             <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-full border border-gray-700">
                 <div className={`text-xl ${selectedDevice.os === 'android' ? 'text-green-500' : 'text-gray-200'}`}>
                    {selectedDevice.os === 'android' ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997M6.4769 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997M12 1.9996c-5.5228 0-10 4.4772-10 10s4.4772 10 10 10 10-4.4772 10-10c0-5.5229-4.4772-10-10-10zm0 1.9989c1.7825 0 3.4411.5539 4.8143 1.498l-1.3789 2.3892c-1.0539-.5675-2.2706-.8892-3.5654-.8892-2.3168 0-4.3853 1.0528-5.7725 2.7086l-1.2587-2.1793c1.9443-2.149 4.7432-3.5273 7.8612-3.5273zm-7.9897 10.3663c-.1473-.7757-.2257-1.5756-.2257-2.3917 0-.7962.0754-1.5768.2173-2.3346l2.4578 1.419c-.0607.2979-.0938.6053-.0938.9156 0 .6147.1278 1.2033.3601 1.7428l-2.7157 1.5681v-.9192zm7.9897 5.6323c-3.0784 0-5.8454-1.343-7.785-3.4431l2.7161-1.5681c1.3728 1.5342 3.3986 2.5028 5.6589 2.5028 1.2829 0 2.4893-.3142 3.5358-.8718l1.3791 2.3896c-1.3653.9329-3.0118 1.4806-4.7849 1.4806v-1.49zm7.9895-3.9536l-2.459-1.4193c.061-.2982.0941-.6061.0941-.917 0-.6205-.1301-1.2144-.3661-1.7584l2.7163-1.5684c.1437.7628.2201 1.5492.2201 2.3516 0 .8224-.0797 1.6289-.2294 2.4107l.024.9008z"/></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.04.05-2.29.69-3.02 1.55-.65.75-1.21 1.95-1.06 3.04 1.17.09 2.36-.64 3.01-1.48"/></svg>
                    )}
                 </div>
                 <div className="flex flex-col">
                     <span className="text-xs text-gray-400 font-bold tracking-wide uppercase">CONNECTED</span>
                     <span className="text-[10px] text-gray-500 font-mono">{selectedDevice.deviceId}</span>
                 </div>
             </div>
        )}

        <div className="flex gap-4 items-center">
          <button 
             onClick={() => setShowDownloadModal(true)}
             className="text-gray-400 hover:text-white font-mono text-xs flex items-center gap-1 border-b border-gray-700 hover:border-gray-500 pb-0.5 transition-colors"
          >
             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             INSTALL AGENT
          </button>

          {selectedDevice && (
              <button 
              onClick={() => {
                  setSelectedDevice(null);
                  addLog("Returned to Device Selection.", 'info');
              }}
              className="border border-red-500/50 text-red-500 hover:bg-red-900/20 px-4 py-2 rounded font-mono text-sm"
            >
              DISCONNECT
            </button>
          )}
        </div>
      </header>

      {/* --- DEVICE SELECTION SCREEN --- */}
      {!selectedDevice && (
          <div className="max-w-4xl mx-auto mt-20">
              <h2 className="text-2xl font-bold text-white mb-6 tracking-tight flex items-center gap-3">
                  <span className="w-2 h-8 bg-green-500 rounded-sm"></span>
                  DETECTED SIGNAL SOURCES
              </h2>
              
              {devices.length === 0 ? (
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-12 text-center">
                      <div className="w-16 h-16 border-4 border-gray-700 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400 font-mono animate-pulse">SCANNING FREQUENCIES...</p>
                      <p className="text-xs text-gray-600 mt-2 font-mono">Ensure 'Sentinel Mobile' is running on target device.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {devices.map(device => (
                          <div key={device.deviceId} className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-green-500 transition-all hover:bg-gray-800 group relative overflow-hidden">
                              <div className="flex justify-between items-start mb-4">
                                  <div className={`p-3 rounded-lg ${device.os === 'android' ? 'bg-green-900/20 text-green-500' : 'bg-gray-700/50 text-white'}`}>
                                      {device.os === 'android' ? (
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997M6.4769 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997M12 1.9996c-5.5228 0-10 4.4772-10 10s4.4772 10 10 10 10-4.4772 10-10c0-5.5229-4.4772-10-10-10zm0 1.9989c1.7825 0 3.4411.5539 4.8143 1.498l-1.3789 2.3892c-1.0539-.5675-2.2706-.8892-3.5654-.8892-2.3168 0-4.3853 1.0528-5.7725 2.7086l-1.2587-2.1793c1.9443-2.149 4.7432-3.5273 7.8612-3.5273zm-7.9897 10.3663c-.1473-.7757-.2257-1.5756-.2257-2.3917 0-.7962.0754-1.5768.2173-2.3346l2.4578 1.419c-.0607.2979-.0938.6053-.0938.9156 0 .6147.1278 1.2033.3601 1.7428l-2.7157 1.5681v-.9192zm7.9897 5.6323c-3.0784 0-5.8454-1.343-7.785-3.4431l2.7161-1.5681c1.3728 1.5342 3.3986 2.5028 5.6589 2.5028 1.2829 0 2.4893-.3142 3.5358-.8718l1.3791 2.3896c-1.3653.9329-3.0118 1.4806-4.7849 1.4806v-1.49zm7.9895-3.9536l-2.459-1.4193c.061-.2982.0941-.6061.0941-.917 0-.6205-.1301-1.2144-.3661-1.7584l2.7163-1.5684c.1437.7628.2201 1.5492.2201 2.3516 0 .8224-.0797 1.6289-.2294 2.4107l.024.9008z"/></svg>
                                      ) : (
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.04.05-2.29.69-3.02 1.55-.65.75-1.21 1.95-1.06 3.04 1.17.09 2.36-.64 3.01-1.48"/></svg>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="block w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,0,0.8)]"></span>
                                      <span className="text-xs font-mono text-green-500">ONLINE</span>
                                  </div>
                              </div>
                              <h3 className="text-white font-bold text-lg font-mono mb-1">{device.deviceId}</h3>
                              <p className="text-gray-500 text-sm font-mono mb-6">{device.os === 'android' ? 'Android Device' : 'iOS Device'}</p>
                              
                              <button 
                                onClick={() => handleSelectDevice(device)}
                                className="w-full bg-gray-800 hover:bg-green-600 text-white font-bold py-3 rounded text-sm transition-colors border border-gray-700 hover:border-green-500 font-mono"
                              >
                                  ESTABLISH UPLINK
                              </button>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* --- DASHBOARD (Only when device selected) --- */}
      {selectedDevice && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-140px)] animate-fade-in">
            
            {/* Left Column: Visuals */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full min-h-[500px]">
            {/* Top: Map & Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                <div className="flex flex-col gap-2 h-full min-h-[300px]">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest">Live Surveillance</h3>
                <LiveFeed 
                    socket={socket} 
                    targetDeviceId={selectedDevice.deviceId}
                    onLog={addLog} 
                    active={true} 
                />
                </div>
                <div className="flex flex-col gap-2 h-full min-h-[300px]">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest">Geolocation Triangulation</h3>
                <LocationMap socket={socket} onLog={addLog} />
                </div>
            </div>

            {/* Bottom: Network Chart */}
            <div className="h-48 bg-gray-900/50 rounded-lg border border-gray-800 p-4 relative shrink-0">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-widest absolute top-4 left-4 z-10">Signal Strength History</h3>
                <SignalChart data={signalHistory} />
            </div>
            </div>

            {/* Right Column: Controls & Logs */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-[500px]">
            
            {/* Action Panel */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 shadow-xl shrink-0">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                COMMAND PROTOCOLS
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={handleLockDevice}
                    className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/50 p-3 rounded text-sm font-mono transition-colors"
                >
                    LOCK DEVICE
                </button>
                
                <button 
                    onClick={handleAlarm}
                    className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/50 p-3 rounded text-sm font-mono transition-colors"
                >
                    TRIGGER ALARM
                </button>
                
                <button 
                    onClick={() => setShowFileManager(true)}
                    className="bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 border border-purple-500/50 p-3 rounded text-sm font-mono transition-colors"
                >
                    ACCESS FILES
                </button>

                <button 
                    onClick={handleGenerateReport}
                    className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/50 p-3 rounded text-sm font-mono transition-colors"
                >
                    GENERATE REPORT
                </button>

                <button 
                    onClick={handleWipeData}
                    disabled={isWiping}
                    className="col-span-2 disabled:opacity-50 disabled:cursor-not-allowed bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 p-3 rounded text-sm font-mono transition-colors mt-2"
                >
                    {isWiping ? 'WIPING DATA...' : 'INITIATE REMOTE WIPE'}
                </button>
                </div>
            </div>

            {/* Logs Panel */}
            <div className="flex-1 bg-black rounded-lg border border-gray-800 p-4 font-mono text-xs overflow-hidden flex flex-col shadow-inner min-h-[200px]">
                <h3 className="text-gray-500 mb-2 uppercase tracking-widest border-b border-gray-800 pb-2">System Logs</h3>
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-800">
                {logs.length === 0 && <span className="text-gray-700">Waiting for connection...</span>}
                {logs.map((log) => (
                    <div key={log.id} className="break-words">
                    <span className="text-gray-600">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                    <span className={`${
                        log.type === 'error' ? 'text-red-500' : 
                        log.type === 'success' ? 'text-green-500' : 
                        log.type === 'warning' ? 'text-amber-500' : 
                        log.type === 'ai' ? 'text-blue-400' : 'text-gray-300'
                    }`}>
                        {log.type === 'ai' && '🤖 '}{log.message}
                    </span>
                    </div>
                ))}
                <div ref={logsEndRef} />
                </div>
            </div>

            </div>
        </div>
      )}
    </div>
  );
};

export default App;