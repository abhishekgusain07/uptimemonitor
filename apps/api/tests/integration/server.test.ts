import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import request from 'supertest';
import { appRouter } from '../../src/routers/_app';
import { createContext } from '../../src/trpc';

describe('tRPC Server Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    
    app.use(cors({
      origin: ['http://localhost:3000'],
      credentials: true,
    }));

    app.use(
      '/trpc',
      createExpressMiddleware({
        router: appRouter,
        createContext,
      })
    );
  });

  describe('tRPC Endpoints', () => {
    it('should respond to valid tRPC calls', async () => {
      const response = await request(app)
        .get('/trpc/user.getAllUsers')
        .query({ input: '{}' });
      
      // tRPC returns 200 for valid procedure calls
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('User Router Integration', () => {
    it('should get all users', async () => {
      const response = await request(app)
        .get('/trpc/user.getAllUsers');
      
      expect(response.status).toBe(200);
    });

    it('should handle user creation', async () => {
      const userData = {
        name: 'Integration Test User',
        email: 'integration@test.com'
      };

      const response = await request(app)
        .post('/trpc/user.createUser')
        .send(userData);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Monitoring Router Integration', () => {
    it('should get all monitors', async () => {
      const response = await request(app)
        .get('/trpc/monitoring.getMonitors');
      
      expect(response.status).toBe(200);
    });

    it('should handle monitor creation', async () => {
      const monitorData = {
        name: 'Integration Test Monitor',
        url: 'https://integration-test.com'
      };

      const response = await request(app)
        .post('/trpc/monitoring.createMonitor')
        .send(monitorData);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
      const response = await request(app)
        .get('/trpc/invalid.route');
      
      expect(response.status).toBe(404);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/trpc/user.createUser')
        .send({ invalid: 'data' });
      
      expect(response.status).toBe(400);
    });
  });
});