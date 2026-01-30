// Mock dependencies
jest.mock('fs');
jest.mock('../models/foodModel.js', () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn()
  }
}));

const fs = require('fs');
const foodModel = require('../models/foodModel.js').default;
const userModel = require('../models/userModel.js').default;
const { addFood, listFood, removeFood } = require('../controllers/foodController.js');

describe('Food Controller', () => {
  let mockReq, mockRes, consoleLogSpy;

  beforeEach(() => {
    mockReq = {
      body: {},
      file: {}
    };
    mockRes = {
      json: jest.fn()
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('addFood', () => {
    test('should add food when user is admin', async () => {
      mockReq.file = { filename: 'test-image.jpg' };
      mockReq.body = {
        name: 'Pizza',
        description: 'Delicious pizza',
        price: '15',
        category: 'Italian',
        userId: 'admin123'
      };

      const mockAdmin = { role: 'admin' };
      userModel.findById.mockResolvedValue(mockAdmin);

      const mockFoodInstance = {
        save: jest.fn().mockResolvedValue(true)
      };
      foodModel.mockImplementation(() => mockFoodInstance);

      await addFood(mockReq, mockRes);

      expect(userModel.findById).toHaveBeenCalledWith('admin123');
      expect(mockFoodInstance.save).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Food Added'
      });
    });

    test('should reject when user is not admin', async () => {
      mockReq.file = { filename: 'test-image.jpg' };
      mockReq.body = {
        name: 'Pizza',
        userId: 'user123'
      };

      const mockUser = { role: 'user' };
      userModel.findById.mockResolvedValue(mockUser);

      await addFood(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not admin'
      });
    });

    test('should handle errors', async () => {
      mockReq.file = { filename: 'test-image.jpg' };
      mockReq.body = { userId: 'admin123' };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await addFood(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('listFood', () => {
    test('should list all foods', async () => {
      const mockFoods = [
        { name: 'Pizza', price: 15 },
        { name: 'Burger', price: 10 }
      ];

      foodModel.find = jest.fn().mockResolvedValue(mockFoods);

      await listFood(mockReq, mockRes);

      expect(foodModel.find).toHaveBeenCalledWith({});
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockFoods
      });
    });

    test('should handle errors', async () => {
      foodModel.find = jest.fn().mockRejectedValue(new Error('Database error'));

      await listFood(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('removeFood', () => {
    test('should remove food when user is admin', async () => {
      mockReq.body = {
        id: 'food123',
        userId: 'admin123'
      };

      const mockAdmin = { role: 'admin' };
      const mockFood = { image: 'test-image.jpg' };

      userModel.findById.mockResolvedValue(mockAdmin);
      foodModel.findById = jest.fn().mockResolvedValue(mockFood);
      foodModel.findByIdAndDelete = jest.fn().mockResolvedValue(true);
      fs.unlink.mockImplementation((path, callback) => callback());

      await removeFood(mockReq, mockRes);

      expect(foodModel.findByIdAndDelete).toHaveBeenCalledWith('food123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Food Removed'
      });
    });

    test('should reject when user is not admin', async () => {
      mockReq.body = {
        id: 'food123',
        userId: 'user123'
      };

      const mockUser = { role: 'user' };
      userModel.findById.mockResolvedValue(mockUser);

      await removeFood(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not admin'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        id: 'food123',
        userId: 'admin123'
      };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await removeFood(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });
});
