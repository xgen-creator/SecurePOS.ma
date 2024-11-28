import React, { useState } from 'react';
import { Bell, Camera, MessageSquare, Settings } from 'lucide-react';

const ScanBellApp = () => {
  const [activeTab, setActiveTab] = useState('doorbell');

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-800">ScanBell</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'doorbell' && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <div className="flex justify-center space-x-4">
              <button className="p-3 bg-blue-500 rounded-full text-white">
                <Bell className="w-6 h-6" />
              </button>
              <button className="p-3 bg-green-500 rounded-full text-white">
                <MessageSquare className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="bg-white border-t">
        <div className="flex justify-around p-4">
          <button
            className={`p-2 ${activeTab === 'doorbell' ? 'text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('doorbell')}
          >
            <Bell className="w-6 h-6" />
          </button>
          <button
            className={`p-2 ${activeTab === 'settings' ? 'text-blue-500' : 'text-gray-500'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default ScanBellApp;
