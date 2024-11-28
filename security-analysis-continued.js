// securityAnalysisService.js (suite)
async detectObjects(frame) {
    const tensor = tf.browser.fromPixels(frame);
    const expanded = tensor.expandDims(0);
    
    // Effectuer la détection
    const predictions = await this.objectDetector.predict(expanded);
    tensor.dispose();
    expanded.dispose();

    // Filtrer et formater les résultats
    return this.formatDetections(predictions);
  }

  async analyzeBehavior(frame, detectionResults) {
    const suspiciousPatterns = {
      loitering: this.detectLoitering(detectionResults),
      tailgating: this.detectTailgating(detectionResults),
      masking: this.detectMasking(detectionResults),
      rapidMovement: this.detectRapidMovement(frame)
    };

    return Object.values(suspiciousPatterns).some(pattern => pattern);
  }

  detectLoitering(results) {
    const timeThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    // Vérifier la présence prolongée
    if (results.objects.includes('person')) {
      if (!this.loiteringStart) {
        this.loiteringStart = now;
      } else if ((now - this.loiteringStart) > timeThreshold) {
        return true;
      }
    } else {
      this.loiteringStart = null;
    }

    return false;
  }

  detectTailgating(results) {
    if (!this.previousDetections) {
      this.previousDetections = results;
      return false;
    }

    const currentPeople = results.faces;
    const previousPeople = this.previousDetections.faces;
    const doorOpenEvent = this.checkDoorEvent();

    if (doorOpenEvent && (currentPeople > previousPeople + 1)) {
      return true;
    }

    this.previousDetections = results;
    return false;
  }

  async processStream(stream, config) {
    const pipeline = new VideoPipeline({
      motionDetection: {
        enabled: true,
        sensitivity: config.motionSensitivity || 0.3,
        regions: config.motionRegions || []
      },
      objectDetection: {
        enabled: true,
        interval: config.detectionInterval || 1000,
        confidence: config.confidenceThreshold || 0.6
      },
      recording: {
        enabled: true,
        preBufferDuration: 10, // secondes avant l'événement
        postBufferDuration: 30 // secondes après l'événement
      }
    });

    // Configurer les callbacks d'événements
    pipeline.onMotionDetected(async (event) => {
      await this.handleMotionEvent(event);
    });

    pipeline.onObjectDetected(async (objects) => {
      await this.handleObjectDetection(objects);
    });

    pipeline.onSuspiciousActivity(async (activity) => {
      await this.handleSuspiciousActivity(activity);
    });

    return pipeline;
  }

  async handleMotionEvent(event) {
    // Enregistrer l'événement
    await this.saveEvent({
      type: 'MOTION',
      timestamp: new Date(),
      data: event
    });

    // Vérifier les règles de notification
    const shouldNotify = await this.checkNotificationRules('MOTION', event);
    if (shouldNotify) {
      await this.sendNotification({
        type: 'MOTION_DETECTED',
        title: 'Mouvement détecté',
        body: `Mouvement détecté à ${new Date().toLocaleTimeString()}`,
        data: event
      });
    }

    // Démarrer l'enregistrement si nécessaire
    if (event.severity > 0.5) {
      await this.startRecording(event.deviceId);
    }
  }

  async analyzeRecording(recordingPath) {
    const analysisResults = {
      events: [],
      summary: {
        totalMotionEvents: 0,
        suspiciousActivities: 0,
        peopleCounted: 0
      }
    };

    const frameProcessor = new FrameProcessor();
    await frameProcessor.processVideo(recordingPath, async (frame, timestamp) => {
      const frameAnalysis = await this.analyzeFrame(frame, {
        detectMotion: true,
        detectObjects: true,
        detectFaces: true,
        analyzeBehavior: true
      });

      if (this.isSignificantEvent(frameAnalysis)) {
        analysisResults.events.push({
          timestamp,
          ...frameAnalysis
        });
      }

      // Mettre à jour les statistiques
      this.updateAnalysisSummary(analysisResults.summary, frameAnalysis);
    });

    return analysisResults;
  }

  isSignificantEvent(analysis) {
    return (
      analysis.motionDetected ||
      analysis.objects.length > 0 ||
      analysis.faces > 0 ||
      analysis.suspicious
    );
  }

  updateAnalysisSummary(summary, frameAnalysis) {
    if (frameAnalysis.motionDetected) summary.totalMotionEvents++;
    if (frameAnalysis.suspicious) summary.suspiciousActivities++;
    if (frameAnalysis.faces > 0) {
      summary.peopleCounted = Math.max(
        summary.peopleCounted,
        frameAnalysis.faces
      );
    }
  }
}

export default new SecurityAnalysisService();
