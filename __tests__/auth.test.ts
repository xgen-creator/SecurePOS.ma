import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import { createUser, validateUser, generateToken } from '../services/auth-service';
import { connectDB, closeDB } from '../database/connection';
import { User } from '../models/user.model';

describe('Authentication Service', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await closeDB();
  });

  describe('User Creation', () => {
    test('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      const user = await createUser(userData);
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Password should be hashed
    });

    test('should fail with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      await expect(createUser(userData)).rejects.toThrow();
    });
  });

  describe('User Validation', () => {
    test('should validate correct credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'SecurePass123!'
      };

      const isValid = await validateUser(credentials);
      expect(isValid).toBeTruthy();
    });

    test('should reject incorrect password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const isValid = await validateUser(credentials);
      expect(isValid).toBeFalsy();
    });
  });

  describe('Token Generation', () => {
    test('should generate valid JWT token', async () => {
      const user = {
        id: '123',
        email: 'test@example.com',
        role: 'user'
      };

      const token = generateToken(user);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });
});
