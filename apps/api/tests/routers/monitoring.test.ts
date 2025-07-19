import { monitoringRouter } from '../../src/routers/monitoring';
import { createCallerFactory } from '../../src/trpc';

describe('Monitoring Router', () => {
  const createCaller = createCallerFactory(monitoringRouter);
  const caller = createCaller({});

  describe('getMonitors', () => {
    it('should return list of monitors', async () => {
      const result = await caller.getMonitors();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '1',
        name: 'Main Website',
        url: 'https://example.com',
        status: 'up',
        lastChecked: expect.any(Date),
        responseTime: 250,
      });
      expect(result[1]).toEqual({
        id: '2',
        name: 'API Endpoint',
        url: 'https://api.example.com',
        status: 'down',
        lastChecked: expect.any(Date),
        responseTime: null,
      });
    });
  });

  describe('getMonitor', () => {
    it('should return monitor data for valid ID', async () => {
      const result = await caller.getMonitor({ id: 'test-id' });
      
      expect(result).toEqual({
        id: 'test-id',
        name: 'Monitor test-id',
        url: 'https://example-test-id.com',
        status: 'up',
        lastChecked: expect.any(Date),
        responseTime: expect.any(Number),
        uptime: 99.5,
        incidents: [
          {
            id: '1',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            duration: 100000,
            reason: 'Server timeout',
          },
        ],
      });
    });

    it('should generate random response time within expected range', async () => {
      const result = await caller.getMonitor({ id: 'test' });
      
      expect(result.responseTime).toBeGreaterThanOrEqual(100);
      expect(result.responseTime).toBeLessThanOrEqual(600);
    });
  });

  describe('createMonitor', () => {
    it('should create a new monitor with valid input', async () => {
      const input = {
        name: 'Test Monitor',
        url: 'https://test.example.com',
        interval: 300,
      };
      
      const result = await caller.createMonitor(input);
      
      expect(result).toEqual({
        id: expect.any(String),
        name: 'Test Monitor',
        url: 'https://test.example.com',
        interval: 300,
        status: 'pending',
        createdAt: expect.any(Date),
      });
      expect(result.id.length).toBeGreaterThan(0); // Random ID
    });

    it('should use default interval when not provided', async () => {
      const input = {
        name: 'Test Monitor',
        url: 'https://test.example.com',
      };
      
      const result = await caller.createMonitor(input);
      
      expect(result.interval).toBe(300); // Default value
    });

    it('should throw error for invalid URL', async () => {
      const input = {
        name: 'Test Monitor',
        url: 'not-a-url',
      };
      
      await expect(caller.createMonitor(input)).rejects.toThrow();
    });

    it('should throw error for empty name', async () => {
      const input = {
        name: '',
        url: 'https://test.example.com',
      };
      
      await expect(caller.createMonitor(input)).rejects.toThrow();
    });

    it('should throw error for interval less than 60', async () => {
      const input = {
        name: 'Test Monitor',
        url: 'https://test.example.com',
        interval: 30,
      };
      
      await expect(caller.createMonitor(input)).rejects.toThrow();
    });
  });

  describe('deleteMonitor', () => {
    it('should return success for valid deletion', async () => {
      const result = await caller.deleteMonitor({ id: 'test-id' });
      
      expect(result).toEqual({
        success: true,
        deletedId: 'test-id',
      });
    });

    it('should handle different monitor IDs', async () => {
      const result = await caller.deleteMonitor({ id: '123' });
      
      expect(result.success).toBe(true);
      expect(result.deletedId).toBe('123');
    });
  });
});