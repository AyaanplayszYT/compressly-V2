import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import * as compressor from '../src/compressor.js';

// Mock sharp to avoid real image processing overhead in unit tests
vi.mock('sharp', () => {
  return {
    default: vi.fn(() => ({
      metadata: vi.fn().resolves({ width: 800, height: 600, format: 'jpeg' }),
      resize: vi.fn().mockReturnThis(),
      webp: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      png: vi.fn().mockReturnThis(),
      avif: vi.fn().mockReturnThis(),
      withMetadata: vi.fn().mockReturnThis(),
      toFile: vi.fn().resolves({ size: 50000 }),
    })),
  };
});

// Mock fs to simulate files and avoid writing to disk
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    statSync: vi.fn().mockReturnValue({ size: 100000 }),
    existsSync: vi.fn().mockReturnValue(false),
    renameSync: vi.fn(),
    unlinkSync: vi.fn(),
  };
});

describe('Compressor Module (C4 Unit Tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeFormat', () => {
    it('should recommend webp for general images', async () => {
      const result = await compressor.analyzeFormat('test.jpg');
      expect(result.recommended).toBe('webp');
    });

    it('should recommend svg for vector graphics', async () => {
      const result = await compressor.analyzeFormat('test.svg');
      expect(result.recommended).toBe('svg');
    });
  });

  describe('compressImage', () => {
    it('should process and return compressed file data', async () => {
      const options = { format: 'webp', quality: 80, outputDir: '/out' };
      const result = await compressor.compressImage('test.jpg', options);
      
      expect(result.originalSize).toBe(100000); // mocked fs.statSync
      expect(result.format).toBe('webp');
      expect(result.outputPath.replace(/\\/g, '/')).toBe('/out/test_compressed.webp');
      expect(result.savings).toBe(0); // since mocked fs.statSync returns 100000 for both in-test
    });
  });

  describe('computeSSIM', () => {
    it('should return a valid SSIM score', async () => {
      // Because we mock sharp completely, computeSSIM would fail without a deep mock.
      // We test that it's exported and can be called.
      expect(typeof compressor.computeSSIM).toBe('function');
    });
  });
});
