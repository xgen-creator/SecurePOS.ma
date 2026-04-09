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
      status: 'In Transit',
      eta: '14:30',
      accessCode: 'ABC123',
    },
    {
      id: 2,
      courier: 'FedEx',
      trackingNumber: 'FX789012345',
      status: 'Scheduled',
      eta: '16:45',
      accessCode: 'XYZ789',
    }
  ]);

  const [deliveryHistory] = useState([
    {
      id: 3,
      courier: 'UPS',
      trackingNumber: 'UP123456789',
      status: 'Delivered',
      deliveredAt: '2024-11-25 15:30',
      proof: 'photo_123.jpg'
    }
  ]);

  return (
    <div className="p-6">
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Deliveries</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="grid gap-6">
            {activeDeliveries.map(delivery => (
              <Card key={delivery.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <Package className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">{delivery.courier}</h3>
                        <p className="text-sm text-gray-500">#{delivery.trackingNumber}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      delivery.status === 'In Transit' 
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {delivery.status}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">ETA: {delivery.eta}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Access Code:</span>
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                        {delivery.accessCode}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="grid gap-6">
            {deliveryHistory.map(delivery => (
              <Card key={delivery.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">{delivery.courier}</h3>
                        <p className="text-sm text-gray-500">#{delivery.trackingNumber}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm">
                      {delivery.status}
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Delivered: {delivery.deliveredAt}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        Proof of Delivery: {delivery.proof}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Automatic Access Codes</h3>
                    <p className="text-sm text-gray-500">
                      Generate unique access codes for each delivery
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Delivery Notifications</h3>
                    <p className="text-sm text-gray-500">
                      Receive updates about your deliveries
                    </p>
                  </div>
                  <input type="checkbox" className="toggle" defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryManagement;
