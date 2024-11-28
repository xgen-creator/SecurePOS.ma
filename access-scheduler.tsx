import React, { useState } from 'react';
import { Calendar, Clock, Users, Check, X, Bell, Calendar as CalendarIcon } from 'lucide-react';

const AccessScheduler = () => {
  const [schedules] = useState([
    {
      id: 1,
      visitorName: "Service de Ménage",
      type: "recurring",
      schedule: "Tous les Lundis",
      timeWindow: "14:00 - 16:00",
      status: "active"
    },
    {
      id: 2,
      visitorName: "Livraison Hebdomadaire",
      type: "recurring",
      schedule: "Mercredi",
      timeWindow: "10:00 - 12:00",
      status: "active"
    }
  ]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Planification des Accès</h1>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Nouveau Planning
        </button>
      </div>

      {/* Calendrier hebdomadaire */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-7 gap-4">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
            <div key={day} className="text-center">
              <div className="font-medium mb-2">{day}</div>
              <div className="h-24 border rounded-lg p-2 overflow-y-auto">
                {schedules
                  .filter(s => s.schedule.includes(day))
                  .map(s => (
                    <div key={s.id} className="text-xs bg-blue-100 p-1 rounded mb-1">
                      {s.visitorName}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liste des planifications */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Planifications Actives</h2>
        </div>
        <div className="divide-y">
          {schedules.map(schedule => (
            <div key={schedule.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{schedule.visitorName}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <CalendarIcon className="w-4 h-4" />
                      {schedule.schedule}
                      <Clock className="w-4 h-4 ml-2" />
                      {schedule.timeWindow}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Bell className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccessScheduler;
