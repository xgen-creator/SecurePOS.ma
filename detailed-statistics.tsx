import React, { useState } from 'react';
import { LineChart, BarChart, PieChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Bar, Pie } from 'recharts';
import { Calendar, Clock, Users, Activity, TrendingUp, BarChart2 } from 'lucide-react';

const DetailedStatistics = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [dataType, setDataType] = useState('visits');

  const [statsData] = useState({
    visits: [
      { date: '2024-01', count: 150, authorized: 120, unauthorized: 30 },
      { date: '2024-02', count: 180, authorized: 150, unauthorized: 30 },
      { date: '2024-03', count: 220, authorized: 180, unauthorized: 40 }
    ],
    visitors: {
      regular: 45,
      delivery: 30,
      guests: 15,
      others: 10
    },
    peakTimes: [
      { hour: '08:00', count: 25 },
      { hour: '12:00', count: 45 },
      { hour: '16:00', count: 60 },
      { hour: '20:00', count: 30 }
    ]
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Statistiques Détaillées</h1>
        
        <div className="flex gap-4 mt-4">
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

      {/* Graphiques principaux */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Tendance des Visites</h2>
          <LineChart width={500} height={300} data={statsData.visits}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="authorized" stroke="#82ca9d" />
            <Line type="monotone" dataKey="unauthorized" stroke="#ff7f7f" />
          </LineChart>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Distribution des Visiteurs</h2>
          <PieChart width={500} height={300}>
            <Pie
              data={Object.entries(statsData.visitors).map(([key, value]) => ({
                name: key,
                value
              }))}
              cx={250}
              cy={150}
              outerRadius={100}
              fill="#8884d8"
              label
            />
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>

      {/* Métriques détaillées */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-gray-500">Taux de Conversion</p>
              <h3 className="text-2xl font-bold">85%</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-gray-500">Temps Moyen de Réponse</p>
              <h3 className="text-2xl font-bold">8.5s</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-gray-500">Taux d'Engagement</p>
              <h3 className="text-2xl font-bold">92%</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Analyses des heures de pointe */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Analyse des Heures de Pointe</h2>
        <BarChart width={1000} height={300} data={statsData.peakTimes}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </div>
    </div>
  );
};

export default DetailedStatistics;
