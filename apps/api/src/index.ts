import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/_app';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: () => ({}),
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 tRPC API server running on http://localhost:${port}`);
  console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
});