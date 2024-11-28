// mediaStorageService.js
const AWS = require('aws-sdk');
const sharp = require('sharp');
const fs = require('fs').promises;

class MediaStorageService {
  constructor() {
    this.s3 = new AWS.S3();
    this.cloudFront = new AWS.CloudFront();
    this.bucketName = process.env.AWS_BUCKET_NAME;
  }

  async storeVideo(videoBuffer, metadata) {
    const key = `videos/${metadata.deviceId}/${Date.now()}.mp4`;
    
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: key,
      Body: videoBuffer,
      ContentType: 'video/mp4',
      Metadata: {
        deviceId: metadata.deviceId,
        timestamp: metadata.timestamp.toString(),
        type: metadata.type
      }
    }).promise();

    return this.generateSignedUrl(key);
  }

  async storeImage(imageBuffer, metadata) {
    // Optimiser l'image avant stockage
    const optimized = await sharp(imageBuffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const key = `images/${metadata.deviceId}/${Date.now()}.jpg`;
    
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: key,
      Body: optimized,
      ContentType: 'image/jpeg',
      Metadata: metadata
    }).promise();

    // Créer une version miniature
    const thumbnail = await this.createThumbnail(imageBuffer);
    const thumbnailKey = `thumbnails/${key}`;
    
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: thumbnailKey,
      Body: thumbnail,
      ContentType: 'image/jpeg'
    }).promise();

    return {
      originalUrl: this.generateSignedUrl(key),
      thumbnailUrl: this.generateSignedUrl(thumbnailKey)
    };
  }

  async createThumbnail(imageBuffer) {
    return sharp(imageBuffer)
      .resize(320, 240, { fit: 'cover' })
      .jpeg({ quality: 60 })
      .toBuffer();
  }

  async generateSignedUrl(key, expiresIn = 3600) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Expires: expiresIn
    };
    return this.s3.getSignedUrl('getObject', params);
  }

  async cleanupOldMedia(deviceId, olderThan = 30) {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - olderThan);

    const objects = await this.s3.listObjectsV2({
      Bucket: this.bucketName,
      Prefix: `videos/${deviceId}`
    }).promise();

    const deletePromises = objects.Contents
      .filter(obj => obj.LastModified < oldDate)
      .map(obj => this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: obj.Key
      }).promise());

    await Promise.all(deletePromises);
  }
}

module.exports = new MediaStorageService();
