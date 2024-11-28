import React, { useState } from 'react';
import { Package, Truck, Calendar, Clock, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DeliveryManagement = () => {
  const [activeDeliveries, setActiveDeliveries] = useState([
    {
      id: 1,
      courier: 'Amazon',
      trackingNumber: 'AM2023456789',
      status: 'En route',
      eta: '14:30',
      accessCode: 'ABC123',
    },
    {
      id: 2,
      courier: 'FedEx',
      trackingNumber: 'FX789012345',
      status: 'Planifié',
      eta: '16:45',
      accessCode: 'XYZ789',
    }
  ]);

  const [deliveryHistory] = useState([
    {
      id: 3,
      courier: 'UPS',
      trackingNumber: 'UP123456789',
      status: 'Livré',
      deliveredAt: '2024-11-25 15:30',
      proof: 'photo_123.jpg'
    }
  ]);

  return (
    <div className="p-6">
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Livraisons en cours</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-6">
            {activeDeliveries.map(delivery => (
              <Card key={delivery.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg">{delivery.courier}</h3>
                        <p className="text-sm text-gray-500">#{delivery.trackingNumber}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                        {delivery.status}
                      </span>
                      <div className="mt-2 text-sm text-gray-500">
                        ETA: {delivery.eta}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Code d'accès temporaire</h4>
                    <div className="flex items-center justify-between">
                      <code className="bg-white px-4 py-2 rounded border">
                        {delivery.accessCode}
                      </code>
                      <div className="text-sm text-gray-500">
                        Valide pour cette livraison uniquement
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      Détails
                    </button>
                    <button className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                      Autoriser l'accès
                    </button>
                    <button className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Refuser l'accès
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="grid gap-4">
            {deliveryHistory.map(delivery => (
              <Card key={delivery.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <h3 className="font-medium">{delivery.courier}</h3>
                        <p className="text-sm text-gray-500">#{delivery.trackingNumber}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {delivery.deliveredAt}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryManagement;
