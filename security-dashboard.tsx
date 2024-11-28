import React, { useState } from 'react';
import { LineChart, XAxis, YAxis, Tooltip, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Shield, AlertTriangle, Users, Camera, Bell } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

const SecurityDashboard = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [securityData] = useState({
    events: {
      motion: 24,
      suspicious: 3,
      visitors: 12,
      alerts: 2
    },
    activityGraph: [
      { time: '00:00', events: 1 },
      { time: '06:00', events: 3 },
      { time: '12:00', events: 8 },
      { time: '18:00', events: 5 },
      { time: '23:59', events: 2 }
    ],
    eventTypes: [
      { name: 'Mouvement', value: 45 },
      { name: 'Visiteurs', value: 25 },
      { name: 'Livraisons', value: 20 },
      { name: 'Suspicieux', value: 10 }
    ]
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="p-6">
      {/* En-tête avec statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Détections</p>
                <h3 className="text-2xl font-bold">{securityData.events.motion}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Activités suspectes</p>
                <h3 className="text-2xl font-bold">{securityData.events.suspicious}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Visiteurs</p>
                <h3 className="text-2xl font-bold">{securityData.events.visitors}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Bell className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Alertes</p>
                <h3 className="text-2xl font-bold">{securityData.events.alerts}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité sur 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart width={500} height={300} data={securityData.activityGraph}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="events" stroke="#8884d8" />
            </LineChart>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution des événements</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChart width={500} height={300}>
              <Pie
                data={securityData.eventTypes}
                cx={250}
                cy={150}
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {securityData.eventTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </CardContent>
        </Card>
      </div>

      {/* Liste des derniers événements */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Derniers événements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Événements récents */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <h4 className="font-medium">Mouvement suspect détecté</h4>
                  <p className="text-sm text-gray-500">Il y a 5 minutes</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm">Voir détails</button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <Users className="w-5 h-5 text-green-500" />
                <div>
                  <h4 className="font-medium">Nouveau visiteur</h4>
                  <p className="text-sm text-gray-500">Il y a 15 minutes</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm">Voir détails</button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;
