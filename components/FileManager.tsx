import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface FileItem {
  name: string;
  path: string;
  size: number;
  date: string;
}

interface FileManagerProps {
  onLog: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  onClose: () => void;
  deviceOS: 'android' | 'ios';
  socket: Socket;
  targetDeviceId: string;
}

export const FileManager: React.FC<FileManagerProps> = ({ onLog, onClose, deviceOS, socket, targetDeviceId }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    // Request files
    socket.emit('request-files', { targetDeviceId });

    // Listen for response
    socket.on('file-list-update', (receivedFiles: FileItem[]) => {
        setFiles(receivedFiles);
        setLoading(false);
        onLog(`Received file list from device. ${receivedFiles.length} items found.`, 'info');
    });

    return () => {
        socket.off('file-list-update');
    };
  }, [socket, targetDeviceId, onLog]);

  const toggleSelect = (path: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) newSelected.delete(path);
    else newSelected.add(path);
    setSelectedPaths(newSelected);
  };

  const handleDelete = () => {
    if (selectedPaths.size === 0) return;
    
    selectedPaths.forEach(path => {
        socket.emit('delete-file', { targetDeviceId, filePath: path });
        onLog(`Sent delete command for ${path}`, 'warning');
    });

    // Optimistic update
    setFiles(prev => prev.filter(f => !selectedPaths.has(f.path)));
    setSelectedPaths(new Set());
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden animate-[scan_0.3s_ease-out]">
       {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-mono text-white font-bold tracking-wider">REMOTE FILE EXPLORER ({deviceOS.toUpperCase()})</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-black/50 relative">
        {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-green-500 font-mono animate-pulse">FETCHING DIRECTORY TREE...</div>
            </div>
        ) : (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-800 text-gray-500 font-mono text-xs">
                        <th className="p-3 w-10">#</th>
                        <th className="p-3">FILENAME</th>
                        <th className="p-3">SIZE</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-sm">
                    {files.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="p-8 text-center text-gray-600 italic">Directory is empty.</td>
                        </tr>
                    ) : (
                        files.map((file, idx) => (
                            <tr key={idx} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group ${selectedPaths.has(file.path) ? 'bg-gray-800/40' : ''}`}>
                                <td className="p-3">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedPaths.has(file.path)}
                                        onChange={() => toggleSelect(file.path)}
                                        className="bg-gray-800 border-gray-600 rounded focus:ring-0 focus:ring-offset-0 checked:bg-green-500 cursor-pointer"
                                    />
                                </td>
                                <td className="p-3 text-white font-medium">{file.name}</td>
                                <td className="p-3 text-gray-400 text-xs">{formatSize(file.size)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        )}
      </div>

      <div className="bg-gray-800 p-4 border-t border-gray-700 flex justify-end">
            <button 
                onClick={handleDelete}
                disabled={selectedPaths.size === 0}
                className="px-6 py-2 rounded bg-red-900/50 border border-red-500 text-red-400 hover:bg-red-900 hover:text-red-200 font-mono text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                DELETE SELECTED
            </button>
      </div>
    </div>
  );
};