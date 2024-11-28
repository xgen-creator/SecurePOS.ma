import React, { useState } from 'react';
import { Card, Button, Typography, Alert, Space, message } from 'antd';
import { CopyOutlined, DownloadOutlined, KeyOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Text, Title } = Typography;

interface BackupCodesProps {
    userId: string;
    codes?: string[];
    onRegenerate?: (codes: string[]) => void;
}

export const BackupCodes: React.FC<BackupCodesProps> = ({
    userId,
    codes = [],
    onRegenerate
}) => {
    const [loading, setLoading] = useState(false);

    const handleCopyAll = () => {
        const text = codes.join('\n');
        navigator.clipboard.writeText(text);
        message.success('Codes copiés dans le presse-papiers');
    };

    const handleDownload = () => {
        const text = codes.join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'backup-codes.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success('Codes téléchargés');
    };

    const handleRegenerate = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/auth/regenerate-backup-codes', { userId });
            const newCodes = response.data.codes;
            onRegenerate?.(newCodes);
            message.success('Nouveaux codes de secours générés');
        } catch (err) {
            message.error('Erreur lors de la génération des codes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <Space>
                    <KeyOutlined className="text-2xl text-blue-500" />
                    <Title level={4} className="!mb-0">
                        Codes de secours
                    </Title>
                </Space>
            </div>

            <Alert
                message="Important"
                description={
                    <div>
                        <p>Les codes de secours vous permettent de vous connecter si vous n'avez pas accès à votre méthode de vérification principale.</p>
                        <ul className="list-disc ml-4 mt-2">
                            <li>Chaque code ne peut être utilisé qu'une seule fois</li>
                            <li>Conservez ces codes dans un endroit sûr</li>
                            <li>Si vous les perdez, vous pouvez en générer de nouveaux</li>
                        </ul>
                    </div>
                }
                type="warning"
                showIcon
                className="mb-6"
            />

            <div className="grid grid-cols-2 gap-4 mb-6">
                {codes.map((code) => (
                    <Text key={code} copyable className="font-mono p-2 bg-gray-50 rounded">
                        {code}
                    </Text>
                ))}
            </div>

            <Space className="w-full justify-end">
                <Button
                    icon={<CopyOutlined />}
                    onClick={handleCopyAll}
                >
                    Copier tous les codes
                </Button>
                <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                >
                    Télécharger
                </Button>
                <Button
                    type="primary"
                    onClick={handleRegenerate}
                    loading={loading}
                >
                    Générer de nouveaux codes
                </Button>
            </Space>
        </Card>
    );
};
