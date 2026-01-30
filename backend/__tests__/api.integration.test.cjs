// Mock mongoose before any imports
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
      close: jest.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock the database config
jest.mock('../config/db.js', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');

describe('API Integration Tests', () => {
  let app;

  beforeAll(() => {
    // Use require with Babel transformation
    app = require('../app.js').default;
  });

  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('API Root', () => {
    test('GET / should return API Working', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toBe('API Working');
    });
  });

  // Note: User authentication tests require actual database connection
  // For now, we'll skip them or you can set up a test database
  describe.skip('User Authentication', () => {
    test('POST /api/user/register should create user', async () => {
      const newUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      const response = await request(app)
        .post('/api/user/register')
        .send(newUser);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
    });
  });
});
