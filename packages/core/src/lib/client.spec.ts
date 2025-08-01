import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AsgardServiceClient from './client';
import { ClientConfig } from '../types/client';

describe('AsgardServiceClient', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: any;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should throw error when neither endpoint nor botProviderEndpoint is provided', () => {
      const config = {
        apiKey: 'test-key',
      } as unknown as ClientConfig;

      expect(() => new AsgardServiceClient(config)).toThrow(
        'Either endpoint or botProviderEndpoint must be provided'
      );
    });

    it('should derive endpoint from botProviderEndpoint when only botProviderEndpoint is provided', () => {
      const config: ClientConfig = {
        botProviderEndpoint: 'https://api.example.com/bot-provider/bp-123',
        apiKey: 'test-key',
      };

      const client = new AsgardServiceClient(config);
      
      // Access private endpoint field for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).endpoint).toBe('https://api.example.com/bot-provider/bp-123/message/sse');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should use provided endpoint when only endpoint is provided', () => {
      const config: ClientConfig = {
        endpoint: 'https://api.example.com/custom/sse',
        apiKey: 'test-key',
      };

      const client = new AsgardServiceClient(config);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).endpoint).toBe('https://api.example.com/custom/sse');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should use provided endpoint and warn about deprecation when debugMode is enabled', () => {
      const config: ClientConfig = {
        endpoint: 'https://api.example.com/custom/sse',
        apiKey: 'test-key',
        debugMode: true,
      };

      const client = new AsgardServiceClient(config);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).endpoint).toBe('https://api.example.com/custom/sse');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AsgardServiceClient] The "endpoint" option is deprecated and will be removed in the next major version. ' +
        'Please use "botProviderEndpoint" instead. The SSE endpoint will be automatically derived as "${botProviderEndpoint}/message/sse".'
      );
    });

    it('should use provided endpoint without warning when debugMode is disabled', () => {
      const config: ClientConfig = {
        endpoint: 'https://api.example.com/custom/sse',
        apiKey: 'test-key',
        debugMode: false,
      };

      const client = new AsgardServiceClient(config);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).endpoint).toBe('https://api.example.com/custom/sse');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should prioritize endpoint over botProviderEndpoint when both are provided', () => {
      const config: ClientConfig = {
        endpoint: 'https://api.example.com/custom/sse',
        botProviderEndpoint: 'https://api.example.com/bot-provider/bp-123',
        apiKey: 'test-key',
        debugMode: true,
      };

      const client = new AsgardServiceClient(config);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).endpoint).toBe('https://api.example.com/custom/sse');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AsgardServiceClient] The "endpoint" option is deprecated and will be removed in the next major version. ' +
        'Please use "botProviderEndpoint" instead. The SSE endpoint will be automatically derived as "${botProviderEndpoint}/message/sse".'
      );
    });

    it('should correctly set other configuration properties', () => {
      const transformSsePayload = vi.fn();
      const config: ClientConfig = {
        botProviderEndpoint: 'https://api.example.com/bot-provider/bp-123',
        apiKey: 'test-key',
        debugMode: true,
        transformSsePayload,
      };

      const client = new AsgardServiceClient(config);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).apiKey).toBe('test-key');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).debugMode).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).transformSsePayload).toBe(transformSsePayload);
    });

    it('should handle trailing slash in botProviderEndpoint correctly', () => {
      const config: ClientConfig = {
        botProviderEndpoint: 'https://api.example.com/bot-provider/bp-123/',
        apiKey: 'test-key',
      };

      const client = new AsgardServiceClient(config);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).endpoint).toBe('https://api.example.com/bot-provider/bp-123/message/sse');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple trailing slashes in botProviderEndpoint', () => {
      const config: ClientConfig = {
        botProviderEndpoint: 'https://api.example.com/bot-provider/bp-123///',
        apiKey: 'test-key',
      };

      const client = new AsgardServiceClient(config);
      
      // Should remove all trailing slashes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((client as any).endpoint).toBe('https://api.example.com/bot-provider/bp-123/message/sse');
    });
  });
});