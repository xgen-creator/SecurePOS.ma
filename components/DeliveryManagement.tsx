import React, { useEffect, useState } from 'react';
import { Tabs, Card, Timeline, Button, Form, Input, TimePicker, Switch, Modal, Alert } from 'antd';
import { Package, MapPin, Camera, Clock, Settings } from 'lucide-react';
import { useDeliveryService } from '../hooks/useDeliveryService';

interface DeliveryZoneConfig {
    location: string;
    instructions: string;
    photo_required: boolean;
    signature_required: boolean;
    allowed_hours: {
        start: string;
        end: string;
    };
}

interface Delivery {
    id: string;
    status: 'pending' | 'delivered' | 'failed';
    accessCode: string;
    tracking: {
        events: {
            type: string;
            timestamp: Date;
            details: string;
            location?: string;
            photo?: string;
        }[];
    };
    details: any;
}

const DeliveryManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [zoneConfig, setZoneConfig] = useState<DeliveryZoneConfig | null>(null);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const deliveryService = useDeliveryService();
    const [form] = Form.useForm();

    useEffect(() => {
        loadDeliveries();
        loadZoneConfig();
    }, [activeTab]);

    const loadDeliveries = async () => {
        try {
            const history = await deliveryService.getDeliveryHistory({
                status: activeTab === 'all' ? undefined : activeTab
            });
            setDeliveries(history);
            setLoading(false);
        } catch (error) {
            setError('Erreur lors du chargement des livraisons');
            setLoading(false);
        }
    };

    const loadZoneConfig = async () => {
        try {
            const config = await deliveryService.getDropZoneConfig();
            setZoneConfig(config);
        } catch (error) {
            setError('Erreur lors du chargement de la configuration');
        }
    };

    const handleConfigSubmit = async (values: DeliveryZoneConfig) => {
        try {
            await deliveryService.configureDropZone(values);
            setZoneConfig(values);
            setConfigModalVisible(false);
            setError(null);
        } catch (error) {
            setError('Erreur lors de la mise à jour de la configuration');
        }
    };

    const renderDeliveryCard = (delivery: Delivery) => (
        <Card 
            key={delivery.id}
            className="mb-4"
            title={
                <div className="flex items-center justify-between">
                    <span>Livraison #{delivery.id.slice(-6)}</span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                        delivery.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        delivery.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                        {delivery.status}
                    </span>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                    <Package className="w-5 h-5 mr-2" />
                    <span>Code d'accès: {delivery.accessCode}</span>
                </div>

                <Timeline
                    items={delivery.tracking.events.map(event => ({
                        color: event.type === 'delivered' ? 'green' : 
                               event.type === 'failed' ? 'red' : 'blue',
                        children: (
                            <div>
                                <div className="font-medium">{event.type}</div>
                                <div className="text-sm text-gray-500">
                                    {new Date(event.timestamp).toLocaleString()}
                                </div>
                                {event.details && (
                                    <div className="text-sm mt-1">{event.details}</div>
                                )}
                                {event.photo && (
                                    <img 
                                        src={event.photo} 
                                        alt="Preuve de livraison"
                                        className="mt-2 rounded-lg w-32 h-32 object-cover"
                                    />
                                )}
                            </div>
                        )
                    }))}
                />
            </div>
        </Card>
    );

    return (
        <div className="max-w-4xl mx-auto p-6">
            {error && (
                <Alert
                    message="Erreur"
                    description={error}
                    type="error"
                    closable
                    className="mb-6"
                    onClose={() => setError(null)}
                />
            )}

            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">Gestion des livraisons</h2>
                <Button
                    type="primary"
                    icon={<Settings className="w-4 h-4" />}
                    onClick={() => setConfigModalVisible(true)}
                >
                    Configuration
                </Button>
            </div>

            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'pending',
                        label: 'En attente',
                        children: loading ? (
                            <div className="text-center py-8">Chargement...</div>
                        ) : deliveries.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Aucune livraison en attente
                            </div>
                        ) : (
                            <div>
                                {deliveries.map(renderDeliveryCard)}
                            </div>
                        )
                    },
                    {
                        key: 'delivered',
                        label: 'Livrées',
                        children: loading ? (
                            <div className="text-center py-8">Chargement...</div>
                        ) : deliveries.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Aucune livraison effectuée
                            </div>
                        ) : (
                            <div>
                                {deliveries.map(renderDeliveryCard)}
                            </div>
                        )
                    },
                    {
                        key: 'failed',
                        label: 'Échouées',
                        children: loading ? (
                            <div className="text-center py-8">Chargement...</div>
                        ) : deliveries.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Aucune livraison échouée
                            </div>
                        ) : (
                            <div>
                                {deliveries.map(renderDeliveryCard)}
                            </div>
                        )
                    }
                ]}
            />

            <Modal
                title="Configuration de la zone de livraison"
                open={configModalVisible}
                onCancel={() => setConfigModalVisible(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={zoneConfig || {}}
                    onFinish={handleConfigSubmit}
                >
                    <Form.Item
                        name="location"
                        label="Emplacement"
                        rules={[{ required: true }]}
                    >
                        <Input
                            prefix={<MapPin className="w-4 h-4 text-gray-400" />}
                            placeholder="Ex: Devant la porte"
                        />
                    </Form.Item>

                    <Form.Item
                        name="instructions"
                        label="Instructions"
                        rules={[{ required: true }]}
                    >
                        <Input.TextArea
                            placeholder="Instructions pour le livreur..."
                            rows={4}
                        />
                    </Form.Item>

                    <div className="space-y-4">
                        <Form.Item
                            name="photo_required"
                            valuePropName="checked"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Camera className="w-4 h-4 mr-2 text-gray-600" />
                                    <span>Photo requise</span>
                                </div>
                                <Switch />
                            </div>
                        </Form.Item>

                        <Form.Item
                            name="signature_required"
                            valuePropName="checked"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-gray-600" />
                                    <span>Signature requise</span>
                                </div>
                                <Switch />
                            </div>
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Heures autorisées"
                        required
                    >
                        <div className="flex items-center space-x-4">
                            <Form.Item
                                name={['allowed_hours', 'start']}
                                noStyle
                            >
                                <TimePicker format="HH:mm" />
                            </Form.Item>
                            <span>à</span>
                            <Form.Item
                                name={['allowed_hours', 'end']}
                                noStyle
                            >
                                <TimePicker format="HH:mm" />
                            </Form.Item>
                        </div>
                    </Form.Item>

                    <div className="flex justify-end space-x-4">
                        <Button onClick={() => setConfigModalVisible(false)}>
                            Annuler
                        </Button>
                        <Button type="primary" htmlType="submit">
                            Enregistrer
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default DeliveryManagement;
