import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface LocationMapProps {
  onLog: (msg: string, type: 'info' | 'error' | 'warning') => void;
  socket: Socket | null;
}

export const LocationMap: React.FC<LocationMapProps> = ({ onLog, socket }) => {
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    if (!socket) return;

    // Send initial request
    socket.emit('command', { command: 'GET_LOCATION' }); 

    // Listen for updates
    const handleLocation = (position: any) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setIsSimulated(false);
        onLog(`Coordinates updated: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'info');
    };

    socket.on('location-update', handleLocation);

    // Timeout: If no location in 10s, mock it
    const timeout = setTimeout(() => {
        setCoords((current) => {
            if (!current) {
                onLog("GPS Signal Weak. Switching to Simulated Location.", 'warning');
                setIsSimulated(true);
                return { lat: 37.7749, lng: -122.4194 }; // San Francisco
            }
            return current;
        });
    }, 10000);

    return () => {
        socket.off('location-update', handleLocation);
        clearTimeout(timeout);
    };
  }, [socket, onLog]);

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg relative overflow-hidden border border-gray-700 group">
      
      {coords ? (
         <div className="w-full h-full relative">
            <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full filter grayscale contrast-125 opacity-70 group-hover:opacity-100 transition-all duration-500"
            ></iframe>
             <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(#333_1px,transparent_1px),linear-gradient(90deg,#333_1px,transparent_1px)] bg-[size:20px_20px]"></div>
         </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
           <div className="w-64 h-64 border border-green-900/50 rounded-full animate-[ping_3s_linear_infinite] opacity-20 absolute"></div>
           <div className="text-center z-10">
              <div className="text-green-500 font-mono text-xs animate-pulse mb-2">AWAITING SATELLITE DATA...</div>
           </div>
        </div>
      )}
      
      {coords && (
        <div className={`absolute bottom-2 right-2 text-[10px] font-mono px-2 py-1 rounded border z-10 ${isSimulated ? 'bg-amber-900/80 border-amber-500 text-amber-200' : 'bg-black/80 border-gray-800 text-gray-400'}`}>
            {isSimulated ? "SIMULATED SIGNAL" : "GPS LOCKED"} <br/>
            LAT: {coords.lat.toFixed(6)} <br/>
            LNG: {coords.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
};