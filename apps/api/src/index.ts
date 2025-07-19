import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/_app';
import { createContext } from './trpc';
import { auth } from './lib/auth';
import { validateEnv } from './lib/env';

// Validate environment variables at startup
validateEnv();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

// Better Auth routes
app.use('/api/auth/*', async (req, res) => {
  const response = await auth.handler(req);
  res.status(response.status);
  
  // Set headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  
  if (response.body) {
    const reader = response.body.getReader();
    const chunks = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    
    const buffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    res.send(buffer);
  } else {
    res.end();
  }
});

// tRPC middleware
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => createContext({ req }),
  })
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 tRPC API server running on http://localhost:${port}`);
  console.log(`📡 tRPC endpoint: http://localhost:${port}/trpc`);
});