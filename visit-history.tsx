import React, { useState } from 'react';
import { Calendar, Clock, User, Video, MessageSquare, Search } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

const VisitHistory = () => {
  const [visits] = useState([
    {
      id: 1,
      type: 'visit',
      visitorName: 'John Doe',
      timestamp: '2024-11-26 14:30',
      duration: '5:24',
      hasVideo: true,
      hasAudio: true,
      status: 'answered'
    },
    {
      id: 2,
      type: 'delivery',
      visitorName: 'Amazon Delivery',
      timestamp: '2024-11-26 11:15',
      duration: '2:10',
      hasVideo: true,
      status: 'completed'
    }
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher dans l'historique..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
            Filtres
          </button>
        </div>

        <div className="flex gap-4 flex-wrap">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            Aujourd'hui
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
            Visites
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
            Livraisons
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
            Messages
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {visits.map(visit => (
          <Card key={visit.id} className="hover:bg-gray-50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium">{visit.visitorName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      {visit.timestamp}
                      <Clock className="w-4 h-4 ml-2" />
                      {visit.duration}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {visit.hasVideo && (
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Video className="w-4 h-4" />
                          Vidéo
                        </span>
                      )}
                      {visit.hasAudio && (
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <MessageSquare className="w-4 h-4" />
                          Audio
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    visit.status === 'answered' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {visit.status === 'answered' ? 'Répondu' : 'Complété'}
                  </span>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                    Voir les détails
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default VisitHistory;
