import React, { useState } from 'react';
import { Wifi, Settings, Shield, Activity, Server, Globe } from 'lucide-react';

const NetworkConfiguration = () => {
  const [networkConfig, setNetworkConfig] = useState({
    wifi: {
      enabled: true,
      ssid: 'ScanBell_Network',
      security: 'WPA3',
      channel: 6,
      bandwidth: '80MHz'
    },
    ethernet: {
      enabled: true,
      ipMode: 'static',
      ipAddress: '192.168.1.100',
      subnet: '255.255.255.0',
      gateway: '192.168.1.1'
    },
    security: {
      firewall: true,
      vpn: false,
      portForwarding: []
    }
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Configuration Réseau</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Configuration WiFi */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Wifi className="w-6 h-6 text-blue-500" />
            <h2 className="text-lg font-semibold">Configuration WiFi</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">SSID</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg"
                value={networkConfig.wifi.ssid}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sécurité</label>
              <select className="w-full p-2 border rounded-lg">
                <option>WPA3</option>
                <option>WPA2</option>
                <option>WPA/WPA2</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Canal</label>
              <select className="w-full p-2 border rounded-lg">
                {[1, 6, 11].map(channel => (
                  <option key={channel}>{channel}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Configuration Ethernet */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-6 h-6 text-green-500" />
            <h2 className="text-lg font-semibold">Configuration Ethernet</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mode IP</label>
              <select className="w-full p-2 border rounded-lg">
                <option value="dhcp">DHCP</option>
                <option value="static">Statique</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Adresse IP</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg"
                value={networkConfig.ethernet.ipAddress}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Passerelle</label>
              <input
                type="text"
                className="w-full p-2 border rounded-lg"
                value={networkConfig.ethernet.gateway}
              />
            </div>
          </div>
        </div>

        {/* Sécurité Réseau */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-red-500" />
            <h2 className="text-lg font-semibold">Sécurité Réseau</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Firewall</h3>
                <p className="text-sm text-gray-500">Protection du réseau</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={networkConfig.security.firewall}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">VPN</h3>
                <p className="text-sm text-gray-500">Accès sécurisé à distance</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={networkConfig.security.vpn}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Diagnostics Réseau */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg font-semibold">Diagnostics Réseau</h2>
          </div>

          <div className="space-y-4">
            <button className="w-full p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Lancer un test de vitesse
            </button>
            <button className="w