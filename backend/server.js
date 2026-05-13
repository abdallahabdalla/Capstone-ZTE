require('dotenv').config();
const express = require('express');
const { expressjwt: jwt } = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// JWT Validation Middleware (orange box in diagram)
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI // resolves to the JWKS URL via .env
  }),
  audience: 'my-app',
  issuer: process.env.AUTHENTIK_ISSUER,
  algorithms: ['RS256']
});

// Public Route — no JWT needed
app.get('/', (req, res) => {
  res.json({ 
    message: 'API is running!',
    status: 'healthy'
  });
});

// Protected Endpoint — /secure-data (grey box in diagram)
app.get('/secure-data', checkJwt, (req, res) => {
  res.json({
    message: 'You have access to protected data!',
    user: req.auth,
    timestamp: new Date().toISOString()
  });
});

// Handles 401 Unauthorized (red arrow in diagram)
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: 'Please login again to get a new token'
    });
  }
  next(err);
});

app.listen(process.env.PORT, () => {
  console.log(`Backend running on http://localhost:${process.env.PORT}`);
  console.log(`Protected endpoint: http://localhost:${process.env.PORT}/secure-data`);
});