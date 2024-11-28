import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar, Clock, Users, Activity } from 'lucide-react';

const AnalyticsModule = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [metrics, setMetrics] = useState({
    totalUsers: 1250,
    activeDevices: 890,
    averageUsageTime: '45m',
    peakHours: '18:00-20:00'
  });

  const [usageData] = useState([
    { date: '2024-01', visitors: 800, calls: 300, messages: 1200 },
    { date: '2024-02', visitors: 1000, calls: 400, messages: 1500 },
    { date: '2024-03', visitors: 1200, calls: 350, messages: 1300 },
    { date: '2024-04', visitors: 900, calls: 450, messages: 1400 }
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Analyses d'Utilisation</h2>
        
        {/* Filtres de temps */}
        <div className="flex gap-2 mb-6">
          {['day', 'week', 'month', 'year'].map(range => (
            <button
              key={range}
              className={`px-4 py-2 rounded-lg ${
                timeRange === range 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-600'
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <Users className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-gray-500">Utilisateurs Totaux</p>
              <h3 className="text-2xl font-bold">{metrics.totalUsers}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <Activity className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-gray-500">Appareils Actifs</p>
              <h3 className="text-2xl font-bold">{metrics.activeDevices}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <Clock className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-gray-500">Temps Moyen d'Utilisation</p>
              <h3 className="text-2xl font-bold">{metrics.averageUsageTime}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-4">
            <Calendar className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-gray-500">Heures de Pointe</p>
              <h3 className="text-2xl font-bold">{metrics.peakHours}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Tendances d'Utilisation</h3>
          <LineChart width={500} height={300} data={usageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="visitors" stroke="#8884d8" />
            <Line type="monotone" dataKey="calls" stroke="#82ca9d" />
            <Line type="monotone" dataKey="messages" stroke="#ffc658" />
          </LineChart>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Distribution des Actions</h3>
          <BarChart width={500} height={300} data={usageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="visitors" fill="#8884d8" />
            <Bar dataKey="calls" fill="#82ca9d" />
            <Bar dataKey="messages" fill="#ffc658" />
          </BarChart>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsModule;
