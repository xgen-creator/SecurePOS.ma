import React, { useState } from 'react';
import { Play, Pause, Plus, Edit, Trash, Clock, Calendar, Bell, Settings } from 'lucide-react';

const AutomationRules = () => {
  const [rules] = useState([
    {
      id: 1,
      name: "Verrouillage nocturne",
      trigger: "time",
      condition: "22:00",
      actions: ["lock_door", "arm_system"],
      status: "active"
    },
    {
      id: 2,
      name: "Mode Livraison",
      trigger: "event",
      condition: "delivery_detected",
      actions: ["notify_owner", "record_video"],
      status: "active"
    }
  ]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Règles Automatiques</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          <Plus className="w-4 h-4" />
          Nouvelle Règle
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map(rule => (
          <div key={rule.id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  rule.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {rule.trigger === 'time' ? (
                    <Clock className="w-5 h-5 text-green-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{rule.name}</h3>
                  <p className="text-sm text-gray-500">
                    Déclenché par: {rule.condition}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Edit className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  {rule.status === 'active' ? (
                    <Pause className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Play className="w-4 h-4 text-gray-600" />
                  )}
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Trash className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Actions :</h4>
              <div className="flex flex-wrap gap-2">
                {rule.actions.map((action, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {action.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AutomationRules;
