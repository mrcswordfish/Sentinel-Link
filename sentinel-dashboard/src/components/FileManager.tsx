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
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);

  useEffect(() => {
    setLoading(true);
    socket.emit('request-files', { targetDeviceId });

    const handleFileList = (receivedFiles: FileItem[]) => {
        setFiles(receivedFiles);
        setLoading(false);
        onLog(`Received file list from device. ${receivedFiles.length} items found.`, 'info');
    };

    const handleFileData = (payload: { fileName: string, data: string }) => {
        // payload.data is base64
        setDownloading(null);
        
        // Convert base64 to blob
        const byteCharacters = atob(payload.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        const url = URL.createObjectURL(blob);

        if (payload.fileName.startsWith('PREVIEW_')) {
            // It's a preview request
            setPreviewFile({
                name: payload.fileName.replace('PREVIEW_', ''),
                url: url
            });
        } else {
            // It's a download request
            const a = document.createElement('a');
            a.href = url;
            a.download = payload.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            onLog(`Downloaded: ${payload.fileName}`, 'success');
        }
    };

    socket.on('file-list-update', handleFileList);
    socket.on('file-data', handleFileData);

    return () => {
        socket.off('file-list-update', handleFileList);
        socket.off('file-data', handleFileData);
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
    setFiles(prev => prev.filter(f => !selectedPaths.has(f.path)));
    setSelectedPaths(new Set());
  };

  const handleDownload = (file: FileItem) => {
      setDownloading(file.name);
      onLog(`Requesting download: ${file.name}...`, 'info');
      socket.emit('download-file', { targetDeviceId, filePath: file.path, fileName: file.name });
  };

  const handlePreview = (file: FileItem) => {
      setDownloading(file.name);
      onLog(`Requesting preview: ${file.name}...`, 'info');
      // We prepend PREVIEW_ to filename so response handler knows it's for the modal
      socket.emit('download-file', { targetDeviceId, filePath: file.path, fileName: `PREVIEW_${file.name}` });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|bmp)$/i.test(name);
  const isVideo = (name: string) => /\.(mp4|mov|avi|mkv)$/i.test(name);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col overflow-hidden animate-[scan_0.3s_ease-out] relative">
       
       {/* Preview Modal */}
       {previewFile && (
           <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
               <div className="relative max-w-full max-h-full flex flex-col items-center">
                   <img src={previewFile.url} alt="Preview" className="max-w-full max-h-[80vh] border border-gray-700 rounded" />
                   <div className="mt-4 flex gap-4">
                       <button onClick={() => setPreviewFile(null)} className="px-4 py-2 bg-gray-800 rounded text-white hover:bg-gray-700">Close</button>
                       <a href={previewFile.url} download={previewFile.name} className="px-4 py-2 bg-green-600 rounded text-black font-bold hover:bg-green-500">Save Image</a>
                   </div>
               </div>
           </div>
       )}

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
                        <th className="p-3 w-10">TYPE</th>
                        <th className="p-3">FILENAME</th>
                        <th className="p-3">SIZE</th>
                        <th className="p-3 text-right">ACTIONS</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-sm">
                    {files.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-8 text-center text-gray-600 italic">Directory is empty.</td>
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
                                <td className="p-3 text-gray-400">
                                    {isImage(file.name) ? (
                                        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    ) : isVideo(file.name) ? (
                                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    )}
                                </td>
                                <td className="p-3 text-white font-medium max-w-[200px] truncate" title={file.name}>{file.name}</td>
                                <td className="p-3 text-gray-400 text-xs">{formatSize(file.size)}</td>
                                <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isImage(file.name) && (
                                            <button 
                                                onClick={() => handlePreview(file)} 
                                                className="p-1 hover:text-purple-400 text-gray-500"
                                                title="Preview"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDownload(file)}
                                            disabled={downloading !== null}
                                            className={`p-1 hover:text-green-400 text-gray-500 ${downloading === file.name ? 'animate-pulse text-green-500' : ''}`}
                                            title="Download"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </button>
                                    </div>
                                </td>
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