import { describe, expect, test, beforeAll } from '@jest/globals';
import { detectFaces, compareFaces, trainModel } from '../services/facial-recognition';
import { readFileSync } from 'fs';
import path from 'path';

describe('Facial Recognition Service', () => {
  beforeAll(async () => {
    await trainModel();
  });

  describe('Face Detection', () => {
    test('should detect faces in valid image', async () => {
      const testImage = readFileSync(path.join(__dirname, 'test-data/sample-face.jpg'));
      const results = await detectFaces(testImage);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBeTruthy();
      expect(results.length).toBeGreaterThan(0);
      
      const face = results[0];
      expect(face).toHaveProperty('confidence');
      expect(face).toHaveProperty('box');
    });

    test('should handle image without faces', async () => {
      const testImage = readFileSync(path.join(__dirname, 'test-data/no-face.jpg'));
      const results = await detectFaces(testImage);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBeTruthy();
      expect(results.length).toBe(0);
    });
  });

  describe('Face Comparison', () => {
    test('should match same face with high confidence', async () => {
      const face1 = readFileSync(path.join(__dirname, 'test-data/person1-a.jpg'));
      const face2 = readFileSync(path.join(__dirname, 'test-data/person1-b.jpg'));
      
      const similarity = await compareFaces(face1, face2);
      expect(similarity).toBeGreaterThan(0.8);
    });

    test('should not match different faces', async () => {
      const face1 = readFileSync(path.join(__dirname, 'test-data/person1-a.jpg'));
      const face2 = readFileSync(path.join(__dirname, 'test-data/person2-a.jpg'));
      
      const similarity = await compareFaces(face1, face2);
      expect(similarity).toBeLessThan(0.6);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid image data', async () => {
      const invalidImage = Buffer.from('invalid data');
      await expect(detectFaces(invalidImage)).rejects.toThrow();
    });

    test('should handle corrupted image files', async () => {
      const corruptedImage = readFileSync(path.join(__dirname, 'test-data/corrupted.jpg'));
      await expect(detectFaces(corruptedImage)).rejects.toThrow();
    });
  });
});
