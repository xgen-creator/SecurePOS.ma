// recordingManagementService.js
const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');

class RecordingManagementService {
  constructor() {
    this.s3 = new AWS.S3();
    this.cloudFront = new AWS.CloudFront();
    this.bucketName = process.env.AWS_BUCKET_NAME;
    this.retentionPeriod = 30; // jours
  }

  async startRecording(deviceId, options = {}) {
    const recordingId = this.generateRecordingId();
    const startTime = Date.now();

    try {
      const stream = await this.initializeStream(deviceId);
      
      // Configurer l'enregistrement
      const recording = ffmpeg(stream)
        .outputOptions([
          '-c:v libx264',
          '-preset superfast',
          '-c:a aac',
          '-b:a 128k',
          '-f mp4'
        ]);

      // Gérer les segments
      if (options.segmentDuration) {
        recording.outputOptions([
          `-segment_time ${options.segmentDuration}`,
          '-f segment'
        ]);
      }

      // Démarrer l'enregistrement
      const outputPath = `recordings/${deviceId}/${recordingId}.mp4`;
      await this.startStreamRecording(recording, outputPath);

      return {
        recordingId,
        startTime,
        outputPath
      };
    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
      throw error;
    }
  }

  async stopRecording(recordingId) {
    const recording = this.activeRecordings.get(recordingId);
    if (!recording) throw new Error('Enregistrement non trouvé');

    try {
      await this.stopStreamRecording(recording);
      
      // Traiter l'enregistrement
      const processedVideo = await this.processRecording(recording.outputPath);
      
      // Sauvegarder dans S3
      const s3Key = await this.uploadToS3(processedVideo, {
        contentType: 'video/mp4',
        metadata: {
          recordingId,
          deviceId: recording.deviceId,
          startTime: recording.startTime.toString(),
          duration: (Date.now() - recording.startTime).toString()
        }
      });

      // Créer des vignettes
      const thumbnails = await this.generateThumbnails(processedVideo);
      await this.saveThumbnails(thumbnails, recordingId);

      return {
        recordingId,
        s3Key,
        thumbnails,
        duration: Date.now() - recording.startTime
      };
    } catch (error) {
      console.error('Erreur arrêt enregistrement:', error);
      throw error;
    }
  }

  async processRecording(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-c:v libx264',
          '-crf 23',
          '-preset medium',
          '-c:a aac',
          '-b:a 128k'
        ])
        .output(`${videoPath}.processed.mp4`)
        .on('end', () => resolve(`${videoPath}.processed.mp4`))
        .on('error', reject)
        .run();
    });
  }

  async generateThumbnails(videoPath) {
    const thumbnails = [];
    const intervals = [0, 0.25, 0.5, 0.75];

    for (const interval of intervals) {
      const thumbnail = await this.extractThumbnail(videoPath, interval);
      thumbnails.push(thumbnail);
    }

    return thumbnails;
  }

  async extractThumbnail(videoPath, timePercentage) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timePercentage],
          filename: `thumbnail-${timePercentage}.png`,
          folder: './thumbnails'
        })
        .on('end', () => resolve(`thumbnail-${timePercentage}.png`))
        .on('error', reject);
    });
  }

  async manageStorageRetention() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPeriod);

    const objectsToDelete = await this.s3.listObjectsV2({
      Bucket: this.bucketName,
      Prefix: 'recordings/'
    }).promise();

    const deletePromises = objectsToDelete.Contents
      .filter(obj => obj.LastModified < cutoffDate)
      .map(obj => this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: obj.Key
      }).promise());

    await Promise.all(deletePromises);
  }
}

export default new RecordingManagementService();
