import React from 'react';
import { Clock } from 'lucide-react';

interface TimeRangeConditionProps {
  condition: {
    type: 'time_range';
    days: number[];
    startTime: string;
    endTime: string;
  };
  onChange: (updatedCondition: any) => void;
}

const TimeRangeCondition: React.FC<TimeRangeConditionProps> = ({
  condition,
  onChange
}) => {
  const daysOfWeek = [
    { id: 0, label: 'Dim' },
    { id: 1, label: 'Lun' },
    { id: 2, label: 'Mar' },
    { id: 3, label: 'Mer' },
    { id: 4, label: 'Jeu' },
    { id: 5, label: 'Ven' },
    { id: 6, label: 'Sam' }
  ];

  const toggleDay = (dayId: number) => {
    const currentDays = condition.days || [];
    const updatedDays = currentDays.includes(dayId)
      ? currentDays.filter(id => id !== dayId)
      : [...currentDays, dayId];

    onChange({
      ...condition,
      days: updatedDays
    });
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    onChange({
      ...condition,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4" />
        <span className="font-medium">Plage horaire</span>
      </div>

      {/* Sélection des jours */}
      <div>
        <label className="block text-sm text-gray-500 mb-2">
          Jours de la semaine
        </label>
        <div className="flex gap-1">
          {daysOfWeek.map(day => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={`
                flex-1 py-2 px-1 rounded text-xs font-medium
                ${condition.days?.includes(day.id)
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sélection de l'heure */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Heure de début
          </label>
          <input
            type="time"
            value={condition.startTime || '00:00'}
            onChange={(e) => handleTimeChange('startTime', e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-2">
            Heure de fin
          </label>
          <input
            type="time"
            value={condition.endTime || '23:59'}
            onChange={(e) => handleTimeChange('endTime', e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default TimeRangeCondition;
