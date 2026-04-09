import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { VisitorManagementService } from '../services/visitor-management';
import { Visitor } from '../models/visitor.model';
import { AccessLog } from '../models/access-log.model';
import { connectDB, closeDB } from '../database/connection';

describe('Visitor Management System', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await Visitor.deleteMany({});
    await AccessLog.deleteMany({});
    await closeDB();
  });

  describe('Visitor Registration', () => {
    test('should register new visitor with photo', async () => {
      const visitorData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        photo: Buffer.from('fake-image-data'),
        accessType: 'TEMPORARY',
        validUntil: new Date(Date.now() + 86400000) // 24 hours
      };

      const visitor = await VisitorManagementService.registerVisitor(visitorData);
      expect(visitor).toBeDefined();
      expect(visitor.id).toBeDefined();
      expect(visitor.photo).toBeDefined();
      expect(visitor.accessType).toBe('TEMPORARY');
    });

    test('should validate visitor data', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '123'
      };

      await expect(VisitorManagementService.registerVisitor(invalidData))
        .rejects.toThrow('Invalid visitor data');
    });
  });

  describe('Access Control', () => {
    test('should grant access to valid visitor', async () => {
      const visitor = await Visitor.findOne({ email: 'john@example.com' });
      const accessResult = await VisitorManagementService.checkAccess(visitor.id);
      
      expect(accessResult.granted).toBeTruthy();
      expect(accessResult.reason).toBe('Valid temporary access');
    });

    test('should deny access to expired visitor', async () => {
      const expiredVisitor = await Visitor.create({
        name: 'Expired Visitor',
        email: 'expired@example.com',
        accessType: 'TEMPORARY',
        validUntil: new Date(Date.now() - 86400000) // 24 hours ago
      });

      const accessResult = await VisitorManagementService.checkAccess(expiredVisitor.id);
      expect(accessResult.granted).toBeFalsy();
      expect(accessResult.reason).toBe('Access expired');
    });

    test('should log access attempts', async () => {
      const visitor = await Visitor.findOne({ email: 'john@example.com' });
      await VisitorManagementService.checkAccess(visitor.id);

      const accessLog = await AccessLog.findOne({ visitorId: visitor.id });
      expect(accessLog).toBeDefined();
      expect(accessLog.granted).toBeTruthy();
    });
  });

  describe('Visitor Search and Filtering', () => {
    test('should search visitors by name', async () => {
      const results = await VisitorManagementService.searchVisitors({
        query: 'John',
        field: 'name'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('John');
    });

    test('should filter visitors by access type', async () => {
      const temporaryVisitors = await VisitorManagementService.searchVisitors({
        accessType: 'TEMPORARY'
      });

      expect(temporaryVisitors.every(v => v.accessType === 'TEMPORARY')).toBeTruthy();
    });
  });

  describe('Access History', () => {
    test('should retrieve visitor access history', async () => {
      const visitor = await Visitor.findOne({ email: 'john@example.com' });
      const history = await VisitorManagementService.getAccessHistory(visitor.id);

      expect(Array.isArray(history)).toBeTruthy();
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('granted');
    });

    test('should generate access report', async () => {
      const report = await VisitorManagementService.generateAccessReport({
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date()
      });

      expect(report).toHaveProperty('totalAccesses');
      expect(report).toHaveProperty('grantedAccesses');
      expect(report).toHaveProperty('deniedAccesses');
    });
  });

  describe('Photo Management', () => {
    test('should update visitor photo', async () => {
      const visitor = await Visitor.findOne({ email: 'john@example.com' });
      const newPhoto = Buffer.from('new-photo-data');

      await VisitorManagementService.updateVisitorPhoto(visitor.id, newPhoto);
      const updatedVisitor = await Visitor.findById(visitor.id);

      expect(updatedVisitor.photo.toString()).toBe(newPhoto.toString());
    });

    test('should validate photo format', async () => {
      const visitor = await Visitor.findOne({ email: 'john@example.com' });
      const invalidPhoto = 'invalid-photo-data';

      await expect(VisitorManagementService.updateVisitorPhoto(visitor.id, invalidPhoto))
        .rejects.toThrow('Invalid photo format');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent visitor', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await expect(VisitorManagementService.checkAccess(fakeId))
        .rejects.toThrow('Visitor not found');
    });

    test('should handle duplicate registration', async () => {
      const duplicateVisitor = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      };

      await expect(VisitorManagementService.registerVisitor(duplicateVisitor))
        .rejects.toThrow('Visitor already registered');
    });
  });
});
