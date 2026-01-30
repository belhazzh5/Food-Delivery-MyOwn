jest.mock('bcrypt');
jest.mock('validator');
jest.mock('jsonwebtoken');
jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

const bcrypt = require('bcrypt');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel.js').default;
const { loginUser, registerUser } = require('../controllers/userController.js');

describe('User Controller', () => {
  let mockReq, mockRes, consoleLogSpy;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      json: jest.fn()
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    process.env.JWT_SECRET = 'test-secret';
    process.env.SALT = '10';
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('loginUser', () => {
    test('should login user successfully', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'user'
      };

      userModel.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock-token');

      await loginUser(mockReq, mockRes);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        token: 'mock-token',
        role: 'user'
      });
    });

    test('should reject when user does not exist', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      userModel.findOne = jest.fn().mockResolvedValue(null);

      await loginUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "User Doesn't exist"
      });
    });

    test('should reject with invalid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      userModel.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await loginUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid Credentials'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      userModel.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await loginUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('registerUser', () => {
    test('should register new user successfully', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const mockNewUser = {
        _id: 'newuser123',
        name: 'Test User',
        email: 'newuser@example.com',
        role: 'user',
        save: jest.fn().mockResolvedValue(true)
      };

      userModel.findOne = jest.fn().mockResolvedValue(null);
      validator.isEmail.mockReturnValue(true);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      userModel.mockImplementation(() => mockNewUser);
      jwt.sign.mockReturnValue('mock-token');

      await registerUser(mockReq, mockRes);

      expect(validator.isEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(mockNewUser.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        token: 'mock-token',
        role: 'user'
      });
    });

    test('should reject if user already exists', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123'
      };

      userModel.findOne = jest.fn().mockResolvedValue({ email: 'existing@example.com' });

      await registerUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User already exists'
      });
    });

    test('should reject with invalid email', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      };

      userModel.findOne = jest.fn().mockResolvedValue(null);
      validator.isEmail.mockReturnValue(false);

      await registerUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter valid email'
      });
    });

    test('should reject with weak password', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'weak'
      };

      userModel.findOne = jest.fn().mockResolvedValue(null);
      validator.isEmail.mockReturnValue(true);

      await registerUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Please enter strong password'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      userModel.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await registerUser(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });
});
