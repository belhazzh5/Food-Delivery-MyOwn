// Mock jwt
jest.mock('jsonwebtoken');
describe('Auth Middleware', () => {
let mockReq, mockRes, mockNext;
beforeEach(() => {
mockReq = { headers: {}, body: {} };
mockRes = {
json: jest.fn(),
status: jest.fn().mockReturnThis()
};
mockNext = jest.fn();
process.env.JWT_SECRET = 'test-secret';
});
afterEach(() => {
jest.clearAllMocks();
});
test('should return error if no token provided', async () => {
await authMiddleware(mockReq, mockRes, mockNext);
expect(mockRes.json).toHaveBeenCalledWith({
success: false,
message: 'Not Authorized Login Again'
});     
expect(mockNext).not.toHaveBeenCalled();
});
test('should call next() with valid token', async () => {
mockReq.headers.token = 'valid-token';
jwt.verify.mockReturnValue({ id: 'user123' });
await authMiddleware(mockReq, mockRes, mockNext);
expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
expect(mockReq.body.userId).toBe('user123');
expect(mockNext).toHaveBeenCalled();
});
test('should return error with invalid token', async () => {
mockReq.headers.token = 'invalid-token';
jwt.verify.mockImplementation(() => {
throw new Error('Invalid token');
});
await authMiddleware(mockReq, mockRes, mockNext);
expect(mockRes.json).toHaveBeenCalledWith({
success: false,
message: 'Error'
});
});
});
                                                                                                                                                                46,3          Bot

