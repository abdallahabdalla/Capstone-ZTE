const request = require('supertest');
const express = require('express');
const cors = require('cors');

// ============================================
// Mock JWT Middleware
// ============================================
const validToken = 'valid-test-token';

function mockJwtMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      message: 'Please login again to get a new token'
    });
  }
  const token = authHeader.split(' ')[1];
  if (token !== validToken) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      message: 'Please login again to get a new token'
    });
  }
  req.auth = { sub: 'test-user-123', email: 'test@example.com' };
  next();
}

// ============================================
// Mock App Setup
// ============================================
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API is running!', status: 'healthy' });
});

app.get('/secure-data', mockJwtMiddleware, (req, res) => {
  res.json({
    message: 'You have access to protected data!',
    user: req.auth,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Invalid or expired token',
      message: 'Please login again to get a new token'
    });
  }
  next(err);
});

// ============================================
// Tests
// ============================================
describe('Backend API — Unit Tests', () => {

  // --- Public Endpoint ---
  describe('Public Endpoint GET /', () => {
    test('should return 200 and healthy status', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('API is running!');
      expect(res.body.status).toBe('healthy');
    });
  });

  // --- Protected Endpoint - No Token ---
  describe('Protected Endpoint GET /secure-data — Negative Tests', () => {
    test('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/secure-data');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    test('should return 401 when an invalid token is provided', async () => {
      const res = await request(app)
        .get('/secure-data')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });

    test('should return 401 when a malformed Bearer token is provided', async () => {
      const res = await request(app)
        .get('/secure-data')
        .set('Authorization', 'NotBearer badtoken');
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });
  });

  // --- Protected Endpoint - Valid Token ---
  describe('Protected Endpoint GET /secure-data — Happy Path', () => {
    test('should return 200 with valid token', async () => {
      const res = await request(app)
        .get('/secure-data')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('You have access to protected data!');
    });

    test('should return user data with valid token', async () => {
      const res = await request(app)
        .get('/secure-data')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.body.user).toHaveProperty('sub', 'test-user-123');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    test('should return a timestamp with valid token', async () => {
      const res = await request(app)
        .get('/secure-data')
        .set('Authorization', `Bearer ${validToken}`);
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // --- Error Handler ---
  describe('Error Handler — Response Structure', () => {
    test('should return correct error structure on 401', async () => {
      const res = await request(app).get('/secure-data');
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Please login again to get a new token');
    });
  });

});