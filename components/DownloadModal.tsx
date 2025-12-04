import React, { useState } from 'react';

interface DownloadModalProps {
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'build' | 'cloud'>('build');

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in max-h-[80vh]">
      {/* Header */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-mono text-white font-bold tracking-wider flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          INSTALL SENTINEL AGENT
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button 
          onClick={() => setActiveTab('build')}
          className={`flex-1 py-3 text-sm font-mono font-bold transition-colors ${activeTab === 'build' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          1. BUILD BINARIES (REQUIRED)
        </button>
        <button 
          onClick={() => setActiveTab('cloud')}
          className={`flex-1 py-3 text-sm font-mono font-bold transition-colors ${activeTab === 'cloud' ? 'bg-gray-800 text-green-400 border-b-2 border-green-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          2. HOSTED LINKS (DEMO)
        </button>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto">
        {activeTab === 'build' ? (
          <div className="space-y-6 text-sm text-gray-300">
            <div className="bg-blue-900/20 border border-blue-500/50 p-4 rounded text-blue-200">
              <strong className="block mb-2 text-lg">⚠️ ACTION REQUIRED</strong>
              <p>
                You cannot download the app directly from this website yet. You must compile the source code provided in the <code>mobile/</code> folder on your computer to create the <code>.apk</code> (Android) or <code>.ipa</code> (iOS) files.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                    <span className="bg-green-900 text-green-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">A</span>
                    For Android Devices
                </h3>
                <div className="bg-black p-4 rounded border border-gray-700 font-mono text-xs overflow-x-auto">
                  <p className="text-gray-500 mb-2"># 1. Open your terminal in the project folder</p>
                  <p className="text-white select-all">cd mobile</p>
                  <p className="text-white select-all">npm install</p>
                  <br/>
                  <p className="text-gray-500 mb-2"># 2. Connect your Android phone via USB (Debugging ON)</p>
                  <p className="text-gray-500 mb-2"># 3. Run the build command</p>
                  <p className="text-yellow-400 select-all">npx react-native run-android</p>
                  <br/>
                  <p className="text-gray-500"># This will compile the APK and install it directly on your phone.</p>
                </div>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                    <span className="bg-gray-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">i</span>
                    For iOS Devices (Mac Only)
                </h3>
                <div className="bg-black p-4 rounded border border-gray-700 font-mono text-xs overflow-x-auto">
                  <p className="text-gray-500 mb-2"># 1. Install dependencies</p>
                  <p className="text-white select-all">cd mobile/ios && pod install</p>
                  <br/>
                  <p className="text-gray-500 mb-2"># 2. Open the workspace in Xcode</p>
                  <p className="text-white select-all">xed .</p>
                  <br/>
                  <p className="text-gray-500 mb-2"># 3. Select your connected iPhone as target</p>
                  <p className="text-gray-500 mb-2"># 4. Press Play (Cmd+R) to build and install</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                    Once you have built the files, you can host them here or use a distribution service like TestFlight or Firebase App Distribution.
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50 pointer-events-none">
              {/* Android Card */}
              <div className="border border-gray-700 rounded bg-gray-800/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-900/50 rounded flex items-center justify-center text-green-500">
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997M6.4769 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997M12 1.9996c-5.5228 0-10 4.4772-10 10s4.4772 10 10 10 10-4.4772 10-10c0-5.5229-4.4772-10-10-10zm0 1.9989c1.7825 0 3.4411.5539 4.8143 1.498l-1.3789 2.3892c-1.0539-.5675-2.2706-.8892-3.5654-.8892-2.3168 0-4.3853 1.0528-5.7725 2.7086l-1.2587-2.1793c1.9443-2.149 4.7432-3.5273 7.8612-3.5273zm-7.9897 10.3663c-.1473-.7757-.2257-1.5756-.2257-2.3917 0-.7962.0754-1.5768.2173-2.3346l2.4578 1.419c-.0607.2979-.0938.6053-.0938.9156 0 .6147.1278 1.2033.3601 1.7428l-2.7157 1.5681v-.9192zm7.9897 5.6323c-3.0784 0-5.8454-1.343-7.785-3.4431l2.7161-1.5681c1.3728 1.5342 3.3986 2.5028 5.6589 2.5028 1.2829 0 2.4893-.3142 3.5358-.8718l1.3791 2.3896c-1.3653.9329-3.0118 1.4806-4.7849 1.4806v-1.49zm7.9895-3.9536l-2.459-1.4193c.061-.2982.0941-.6061.0941-.917 0-.6205-.1301-1.2144-.3661-1.7584l2.7163-1.5684c.1437.7628.2201 1.5492.2201 2.3516 0 .8224-.0797 1.6289-.2294 2.4107l.024.9008z"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Android Client</h3>
                    <p className="text-xs text-gray-500">waiting for build...</p>
                  </div>
                </div>
                <button className="w-full bg-gray-700 text-gray-500 py-2 rounded text-xs font-mono mt-2 cursor-not-allowed">
                  DOWNLOAD NOT AVAILABLE
                </button>
              </div>

               {/* iOS Card */}
               <div className="border border-gray-700 rounded bg-gray-800/50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-white">
                     <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.21-1.98 1.07-3.11-1.04.05-2.29.69-3.02 1.55-.65.75-1.21 1.95-1.06 3.04 1.17.09 2.36-.64 3.01-1.48"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">iOS Client</h3>
                    <p className="text-xs text-gray-500">waiting for build...</p>
                  </div>
                </div>
                <button className="w-full bg-gray-700 text-gray-500 py-2 rounded text-xs font-mono mt-2 cursor-not-allowed">
                  DOWNLOAD NOT AVAILABLE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-4 border-t border-gray-700 text-center">
        <p className="text-xs text-gray-500 font-mono">
            Requires local React Native build environment.
        </p>
      </div>
    </div>
  );
};