import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, AlertTriangle } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Scene } from '../../../services/automation/SceneActionService';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Select } from '../../ui/select';
import { Calendar as CalendarComponent } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Badge } from '../../ui/badge';
import { useNotificationManager } from '../../../hooks/useNotificationManager';

interface SceneSchedulerProps {
  scene: Scene;
  onScheduleChange: (schedules: SceneSchedule[]) => void;
}

export interface SceneSchedule {
  id: string;
  enabled: boolean;
  type: 'once' | 'daily' | 'weekly' | 'monthly';
  startDate?: Date;
  startTime: string;
  endTime?: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  months?: number[];
}

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export default function SceneScheduler({ scene, onScheduleChange }: SceneSchedulerProps) {
  const [schedules, setSchedules] = useState<SceneSchedule[]>(scene.schedules || []);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedScheduleType, setSelectedScheduleType] = useState<SceneSchedule['type']>('once');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const { sendWarning } = useNotificationManager();

  const daysOfWeek = [
    'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
  ];

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const validateTime = (time: string) => {
    if (!timeRegex.test(time)) {
      return false;
    }
    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
  };

  const handleAddSchedule = () => {
    if (!startTime || !validateTime(startTime)) {
      sendWarning(
        'Heure invalide',
        'Veuillez entrer une heure de début valide (format HH:MM)',
        { source: 'scheduler' }
      );
      return;
    }

    if (endTime && !validateTime(endTime)) {
      sendWarning(
        'Heure invalide',
        'Veuillez entrer une heure de fin valide (format HH:MM)',
        { source: 'scheduler' }
      );
      return;
    }

    if (selectedScheduleType === 'once' && !selectedDate) {
      sendWarning(
        'Date manquante',
        'Veuillez sélectionner une date pour la planification unique',
        { source: 'scheduler' }
      );
      return;
    }

    const newSchedule: SceneSchedule = {
      id: `schedule_${Date.now()}`,
      enabled: true,
      type: selectedScheduleType,
      startTime,
      endTime: endTime || undefined,
      ...(selectedScheduleType === 'once' && { startDate: selectedDate }),
      ...(selectedScheduleType === 'weekly' && { daysOfWeek: selectedDays }),
      ...(selectedScheduleType === 'monthly' && { daysOfMonth: selectedDays }),
      ...(selectedScheduleType === 'monthly' && { months: selectedMonths })
    };

    const updatedSchedules = [...schedules, newSchedule];
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);

    // Réinitialiser le formulaire
    setSelectedDate(undefined);
    setStartTime('');
    setEndTime('');
    setSelectedDays([]);
    setSelectedMonths([]);
  };

  const handleRemoveSchedule = (scheduleId: string) => {
    const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);
  };

  const handleToggleSchedule = (scheduleId: string) => {
    const updatedSchedules = schedules.map(s =>
      s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
    );
    setSchedules(updatedSchedules);
    onScheduleChange(updatedSchedules);
  };

  const formatSchedule = (schedule: SceneSchedule): string => {
    let description = '';

    switch (schedule.type) {
      case 'once':
        description = `Le ${format(schedule.startDate!, 'dd/MM/yyyy', { locale: fr })}`;
        break;
      case 'daily':
        description = 'Tous les jours';
        break;
      case 'weekly':
        description = `Chaque ${schedule.daysOfWeek!
          .map(day => daysOfWeek[day])
          .join(', ')}`;
        break;
      case 'monthly':
        const monthsStr = schedule.months!
          .map(month => months[month])
          .join(', ');
        const daysStr = schedule.daysOfMonth!
          .map(day => `${day}`)
          .join(', ');
        description = `Le${schedule.daysOfMonth!.length > 1 ? 's' : ''} ${daysStr} de ${monthsStr}`;
        break;
    }

    description += ` à ${schedule.startTime}`;
    if (schedule.endTime) {
      description += ` jusqu'à ${schedule.endTime}`;
    }

    return description;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type de planification</Label>
            <Select
              value={selectedScheduleType}
              onValueChange={(value: SceneSchedule['type']) => setSelectedScheduleType(value)}
            >
              <option value="once">Une fois</option>
              <option value="daily">Quotidien</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuel</option>
            </Select>
          </div>

          {selectedScheduleType === 'once' && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      !selectedDate && 'text-muted-foreground'
                    }`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, 'PP', { locale: fr })
                    ) : (
                      <span>Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Heure de début</Label>
            <div className="relative">
              <Input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="HH:MM"
                className="pl-10"
              />
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Heure de fin (optionnel)</Label>
            <div className="relative">
              <Input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="HH:MM"
                className="pl-10"
              />
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            </div>
          </div>
        </div>

        {selectedScheduleType === 'weekly' && (
          <div className="space-y-2">
            <Label>Jours de la semaine</Label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day, index) => (
                <Badge
                  key={day}
                  variant={selectedDays.includes(index) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedDays(prev =>
                      prev.includes(index)
                        ? prev.filter(d => d !== index)
                        : [...prev, index]
                    );
                  }}
                >
                  {day}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {selectedScheduleType === 'monthly' && (
          <>
            <div className="space-y-2">
              <Label>Jours du mois</Label>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <Badge
                    key={day}
                    variant={selectedDays.includes(day) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedDays(prev =>
                        prev.includes(day)
                          ? prev.filter(d => d !== day)
                          : [...prev, day]
                      );
                    }}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mois</Label>
              <div className="flex flex-wrap gap-2">
                {months.map((month, index) => (
                  <Badge
                    key={month}
                    variant={selectedMonths.includes(index) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedMonths(prev =>
                        prev.includes(index)
                          ? prev.filter(m => m !== index)
                          : [...prev, index]
                      );
                    }}
                  >
                    {month}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        <Button
          onClick={handleAddSchedule}
          className="w-full"
        >
          Ajouter la planification
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Planifications configurées</h3>
        {schedules.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Aucune planification configurée
          </div>
        ) : (
          <div className="space-y-2">
            {schedules.map(schedule => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={() => handleToggleSchedule(schedule.id)}
                  />
                  <div>
                    <p className="font-medium">{formatSchedule(schedule)}</p>
                    <p className="text-sm text-gray-500">
                      {schedule.enabled ? 'Activé' : 'Désactivé'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSchedule(schedule.id)}
                >
                  <AlertTriangle className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
