interface AWSConfig {
    region: string;
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    s3: {
        bucketName: string;
        visitorImagesPrefix: string;
        tempImagesPrefix: string;
    };
    rekognition: {
        collectionId: string;
        confidenceThreshold: number;
    };
    dynamodb: {
        visitorsTable: string;
        eventsTable: string;
    };
}

interface WebRTCConfig {
    iceServers: Array<{
        urls: string[];
        username?: string;
        credential?: string;
    }>;
    stunServers: string[];
    turnServers: Array<{
        urls: string[];
        username: string;
        credential: string;
    }>;
}

export const config = {
    aws: {
        region: process.env.AWS_REGION || 'eu-west-3',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        },
        s3: {
            bucketName: process.env.AWS_S3_BUCKET || 'scanbell-storage',
            visitorImagesPrefix: 'visitors/',
            tempImagesPrefix: 'temp/'
        },
        rekognition: {
            collectionId: 'scanbell-visitors',
            confidenceThreshold: 90
        },
        dynamodb: {
            visitorsTable: 'scanbell-visitors',
            eventsTable: 'scanbell-events'
        }
    },
    webrtc: {
        iceServers: [
            {
                urls: [
                    'stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302'
                ]
            },
            {
                urls: ['turn:turn.scanbell.com:3478'],
                username: process.env.TURN_USERNAME || '',
                credential: process.env.TURN_PASSWORD || ''
            }
        ],
        stunServers: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302'
        ],
        turnServers: [
            {
                urls: ['turn:turn.scanbell.com:3478'],
                username: process.env.TURN_USERNAME || '',
                credential: process.env.TURN_PASSWORD || ''
            }
        ]
    },
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    },
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        tokenExpiration: '24h',
        bcryptSaltRounds: 10
    },
    facial: {
        minDetectionConfidence: 0.8,
        minFaceSize: 20,
        maxNumFaces: 5
    }
};

export default config;
