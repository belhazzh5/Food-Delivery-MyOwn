const authMiddleware = require('../middleware/auth').default;

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;
  let consoleLogSpy;

  beforeEach(() => {
    mockReq = { headers: {}, body: {} };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    process.env.JWT_SECRET = 'test-secret';
    
    // Suppress console.log during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
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
    // Mock jwt.verify to return a valid decoded token
    const jwt = require('jsonwebtoken');
    jwt.verify = jest.fn().mockReturnValue({ id: 'user123' });
    
    mockReq.headers.token = 'valid-token';
    await authMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockReq.body.userId).toBe('user123');
    expect(mockNext).toHaveBeenCalled();
  });

  test('should return error with invalid token', async () => {
    const jwt = require('jsonwebtoken');
    jwt.verify = jest.fn().mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    mockReq.headers.token = 'invalid-token';
    await authMiddleware(mockReq, mockRes, mockNext);
    
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error'
    });
    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
