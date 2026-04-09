import { Visitor } from '../models/visitor.model';
import { AccessLog } from '../models/access-log.model';
import { NotificationService } from './notification-service';
import { FacialRecognitionService } from './facial-recognition';
import { AuditService } from './audit-service';

interface VisitorRegistrationData {
  name: string;
  email?: string;
  phone?: string;
  purpose: string;
  expectedDuration?: number;
  imageBuffer: Buffer;
  accessLevel: 'GUEST' | 'CONTRACTOR' | 'EMPLOYEE' | 'ADMIN';
  validFrom: Date;
  validUntil?: Date;
  metadata?: any;
}

interface AccessDecision {
  allowed: boolean;
  reason?: string;
  confidence: number;
  matchedVisitor?: any;
}

export class VisitorManagementService {
  static async registerVisitor(data: VisitorRegistrationData): Promise<any> {
    try {
      // Verify face image quality
      const faceAnalysis = await FacialRecognitionService.detectAnomalies(
        data.imageBuffer
      );

      if (faceAnalysis.quality < 0.6) {
        throw new Error('Face image quality is too low');
      }

      // Check for existing visitor with similar face
      const existingVisitors = await Visitor.find({ active: true });
      for (const visitor of existingVisitors) {
        const similarity = await FacialRecognitionService.compareFaces(
          data.imageBuffer,
          visitor.faceImage
        );
        if (similarity > 0.8) {
          throw new Error('Similar face already registered');
        }
      }

      // Add face to recognition system
      const faceAdded = await FacialRecognitionService.addNewFace(
        data.imageBuffer,
        data.name
      );

      if (!faceAdded) {
        throw new Error('Failed to add face to recognition system');
      }

      // Create visitor record
      const visitor = await Visitor.create({
        name: data.name,
        email: data.email,
        phone: data.phone,
        purpose: data.purpose,
        expectedDuration: data.expectedDuration,
        faceImage: data.imageBuffer,
        accessLevel: data.accessLevel,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        metadata: data.metadata,
        active: true,
        createdAt: new Date()
      });

      // Log registration
      await AuditService.logEvent({
        eventType: 'VISITOR_REGISTERED',
        details: {
          visitorId: visitor._id,
          name: data.name,
          accessLevel: data.accessLevel
        }
      });

      // Send notification
      await NotificationService.sendNotification({
        title: 'New Visitor Registered',
        message: `${data.name} has been registered as a ${data.accessLevel}`,
        type: 'INFO',
        priority: 'MEDIUM',
        metadata: { visitorId: visitor._id }
      });

      return visitor;
    } catch (error) {
      console.error('Failed to register visitor:', error);
      throw error;
    }
  }

  static async processAccess(
    imageBuffer: Buffer,
    location: string
  ): Promise<AccessDecision> {
    try {
      // Perform facial recognition
      const recognition = await FacialRecognitionService.recognizeFace(
        imageBuffer
      );

      if (recognition.matches.length === 0) {
        return {
          allowed: false,
          reason: 'No matching visitor found',
          confidence: 0
        };
      }

      const match = recognition.matches[0];
      const visitor = await Visitor.findOne({ name: match.label });

      if (!visitor) {
        return {
          allowed: false,
          reason: 'Visitor record not found',
          confidence: recognition.confidence
        };
      }

      // Check if visitor access is still valid
      const now = new Date();
      if (visitor.validUntil && now > visitor.validUntil) {
        return {
          allowed: false,
          reason: 'Access period expired',
          confidence: recognition.confidence,
          matchedVisitor: visitor
        };
      }

      // Check if visitor is active
      if (!visitor.active) {
        return {
          allowed: false,
          reason: 'Visitor access revoked',
          confidence: recognition.confidence,
          matchedVisitor: visitor
        };
      }

      // Log access attempt
      const accessLog = await AccessLog.create({
        visitorId: visitor._id,
        timestamp: now,
        location: location,
        action: 'ENTRY',
        status: 'ALLOWED',
        confidence: recognition.confidence
      });

      // Send real-time notification
      await NotificationService.sendNotification({
        title: 'Visitor Access',
        message: `${visitor.name} accessed ${location}`,
        type: 'INFO',
        priority: 'LOW',
        metadata: {
          visitorId: visitor._id,
          accessLogId: accessLog._id
        }
      });

      return {
        allowed: true,
        confidence: recognition.confidence,
        matchedVisitor: visitor
      };
    } catch (error) {
      console.error('Failed to process access:', error);
      throw error;
    }
  }

  static async updateVisitor(
    visitorId: string,
    updates: Partial<VisitorRegistrationData>
  ): Promise<any> {
    try {
      const visitor = await Visitor.findById(visitorId);
      if (!visitor) {
        throw new Error('Visitor not found');
      }

      // Update face recognition if new image provided
      if (updates.imageBuffer) {
        const faceUpdated = await FacialRecognitionService.updateFaceDescriptors(
          visitor.name,
          [updates.imageBuffer]
        );

        if (!faceUpdated) {
          throw new Error('Failed to update face recognition data');
        }
      }

      // Update visitor record
      const updatedVisitor = await Visitor.findByIdAndUpdate(
        visitorId,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      // Log update
      await AuditService.logEvent({
        eventType: 'VISITOR_UPDATED',
        details: {
          visitorId: visitor._id,
          updates: Object.keys(updates)
        }
      });

      return updatedVisitor;
    } catch (error) {
      console.error('Failed to update visitor:', error);
      throw error;
    }
  }

  static async deactivateVisitor(visitorId: string, reason: string): Promise<boolean> {
    try {
      const visitor = await Visitor.findById(visitorId);
      if (!visitor) {
        throw new Error('Visitor not found');
      }

      await Visitor.updateOne(
        { _id: visitorId },
        {
          $set: {
            active: false,
            deactivationReason: reason,
            deactivatedAt: new Date()
          }
        }
      );

      // Log deactivation
      await AuditService.logEvent({
        eventType: 'VISITOR_DEACTIVATED',
        details: {
          visitorId: visitor._id,
          reason: reason
        }
      });

      // Send notification
      await NotificationService.sendNotification({
        title: 'Visitor Deactivated',
        message: `${visitor.name}'s access has been deactivated: ${reason}`,
        type: 'WARNING',
        priority: 'HIGH',
        metadata: { visitorId: visitor._id }
      });

      return true;
    } catch (error) {
      console.error('Failed to deactivate visitor:', error);
      return false;
    }
  }

  static async getAccessHistory(
    options: {
      visitorId?: string;
      location?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any[]> {
    const query: any = {};

    if (options.visitorId) {
      query.visitorId = options.visitorId;
    }

    if (options.location) {
      query.location = options.location;
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = options.startDate;
      }
      if (options.endDate) {
        query.timestamp.$lte = options.endDate;
      }
    }

    return AccessLog.find(query)
      .sort({ timestamp: -1 })
      .skip(options.offset || 0)
      .limit(options.limit || 50)
      .populate('visitorId');
  }

  static async getVisitorStats(): Promise<any> {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const stats = {
      totalActive: await Visitor.countDocuments({ active: true }),
      totalDeactivated: await Visitor.countDocuments({ active: false }),
      accessesToday: await AccessLog.countDocuments({
        timestamp: { $gte: today }
      }),
      byAccessLevel: await Visitor.aggregate([
        { $group: { _id: '$accessLevel', count: { $sum: 1 } } }
      ])
    };

    return stats;
  }
}
