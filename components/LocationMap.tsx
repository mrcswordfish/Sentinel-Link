import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface LocationMapProps {
  onLog: (msg: string, type: 'info' | 'error') => void;
  socket: Socket | null;
}

export const LocationMap: React.FC<LocationMapProps> = ({ onLog, socket }) => {
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('command', { command: 'GET_LOCATION' }); // Request initial

    socket.on('location-update', (position: any) => {
        // Handle React Native Geolocation Service format
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        onLog(`Coordinates updated: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, 'info');
    });

    return () => {
        socket.off('location-update');
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
        <div className="absolute bottom-2 right-2 text-[10px] font-mono text-gray-400 bg-black/80 px-2 py-1 rounded border border-gray-800 z-10">
            LAT: {coords.lat.toFixed(6)} <br/>
            LNG: {coords.lng.toFixed(6)}
        </div>
      )}
    </div>
  );
};