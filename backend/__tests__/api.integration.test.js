onst request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
describe('API Integration Tests', () => {
beforeAll(async () => {
// Connect to test database
await mongoose.connect(process.env.MONGO_TEST_URL);
});
afterAll(async () => {
await mongoose.connection.close();
});
describe('Health Check', () => {
test('GET /health should return 200', async () => {
const response = await request(app).get('/health');
expect(response.status).toBe(200);
expect(response.body).toHaveProperty('status', 'healthy');
});
});
describe('User Authentication', () => {
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
test('POST /api/user/login should return token', async () => {
const credentials = {
email: 'test@example.com',
password: 'password123'
};
const response = await request(app)
.post('/api/user/login')
.send(credentials);
expect(response.status).toBe(200);
expect(response.body).toHaveProperty('success', true);
});
});
});
