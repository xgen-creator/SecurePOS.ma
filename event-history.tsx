import React, { useState } from 'react';
import { Calendar, Search, Filter, Download, Bell, AlertTriangle, Shield, Package } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const EventHistory = () => {
  const [dateRange, setDateRange] = useState('week');
  const [eventType, setEventType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [events] = useState([
    {
      id: 1,
      type: 'security',
      title: 'Tentative d\'accès',
      description: 'Tentative d\'accès non autorisée',
      timestamp: new Date(),
      severity: 'high'
    },
    {
      id: 2,
      type: 'delivery',
      title: 'Livraison Amazon',
      description: 'Colis livré avec succès',
      timestamp: new Date(),
      severity: 'info'
    }
  ]);

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (type) => {
    switch(type) {
      case 'security': return <Shield className="w-5 h-5" />;
      case 'alert': return <AlertTriangle className="w-5 h-5" />;
      case 'delivery': return <Package className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Historique des Événements</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          <Download className="w-4 h-4" />
          Exporter
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher des événements..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select 
            className="p-2 border rounded-lg"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="custom">Personnalisé</option>
          </select>

          <select
            className="p-2 border rounded-lg"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
          >
            <option value="all">Tous les événements</option>
            <option value="security">Sécurité</option>
            <option value="delivery">Livraisons</option>
            <option value="system">Système</option>
          </select>
        </div>
      </div>

      {/* Timeline des événements */}
      <div className="space-y-4">
        {events.map((event) => (
          <Card key={event.id} className="hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`p-2 rounded-lg ${
                    event.type === 'security' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {getEventIcon(event.type)}
                  </div>
                  
                  <div>
                    <h3 className="font-medium">{event.title}</h3>
                    <p className="text-sm text-gray-500">{event.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {event.timestamp.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-sm ${
                  getSeverityColor(event.severity)
                }`}>
                  {event.severity}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventHistory;
