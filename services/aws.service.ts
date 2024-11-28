import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { RekognitionClient, IndexFacesCommand, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

class AWSService {
    private s3Client: S3Client;
    private rekognitionClient: RekognitionClient;
    private dynamoClient: DynamoDBDocumentClient;

    constructor() {
        // Initialisation des clients AWS
        this.s3Client = new S3Client({
            region: config.aws.region,
            credentials: config.aws.credentials
        });

        this.rekognitionClient = new RekognitionClient({
            region: config.aws.region,
            credentials: config.aws.credentials
        });

        const ddbClient = new DynamoDBClient({
            region: config.aws.region,
            credentials: config.aws.credentials
        });
        this.dynamoClient = DynamoDBDocumentClient.from(ddbClient);
    }

    // Méthodes pour S3
    async uploadVisitorImage(imageBuffer: Buffer, visitorId: string): Promise<string> {
        const key = `${config.aws.s3.visitorImagesPrefix}${visitorId}.jpg`;
        
        await this.s3Client.send(new PutObjectCommand({
            Bucket: config.aws.s3.bucketName,
            Key: key,
            Body: imageBuffer,
            ContentType: 'image/jpeg'
        }));

        return key;
    }

    // Méthodes pour Rekognition
    async indexFace(imageBuffer: Buffer, visitorId: string): Promise<string> {
        const response = await this.rekognitionClient.send(new IndexFacesCommand({
            CollectionId: config.aws.rekognition.collectionId,
            Image: { Bytes: imageBuffer },
            ExternalImageId: visitorId,
            DetectionAttributes: ['ALL']
        }));

        if (response.FaceRecords && response.FaceRecords.length > 0) {
            return response.FaceRecords[0].Face?.FaceId || '';
        }
        throw new Error('Aucun visage détecté dans l\'image');
    }

    async searchFaceByImage(imageBuffer: Buffer): Promise<any> {
        const response = await this.rekognitionClient.send(new SearchFacesByImageCommand({
            CollectionId: config.aws.rekognition.collectionId,
            Image: { Bytes: imageBuffer },
            MaxFaces: 1,
            FaceMatchThreshold: config.aws.rekognition.confidenceThreshold
        }));

        return response.FaceMatches?.[0] || null;
    }

    // Méthodes pour DynamoDB
    async saveVisitor(visitorData: any): Promise<void> {
        await this.dynamoClient.send(new PutCommand({
            TableName: config.aws.dynamodb.visitorsTable,
            Item: {
                ...visitorData,
                createdAt: new Date().toISOString()
            }
        }));
    }

    async getVisitor(visitorId: string): Promise<any> {
        const response = await this.dynamoClient.send(new GetCommand({
            TableName: config.aws.dynamodb.visitorsTable,
            Key: { visitorId }
        }));

        return response.Item;
    }

    async logEvent(eventData: any): Promise<void> {
        await this.dynamoClient.send(new PutCommand({
            TableName: config.aws.dynamodb.eventsTable,
            Item: {
                ...eventData,
                timestamp: new Date().toISOString()
            }
        }));
    }

    async getVisitorEvents(visitorId: string): Promise<any[]> {
        const response = await this.dynamoClient.send(new QueryCommand({
            TableName: config.aws.dynamodb.eventsTable,
            KeyConditionExpression: 'visitorId = :vid',
            ExpressionAttributeValues: {
                ':vid': visitorId
            },
            ScanIndexForward: false // Pour obtenir les événements les plus récents en premier
        }));

        return response.Items || [];
    }
}

export const awsService = new AWSService();
