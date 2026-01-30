jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
  }
}));

const userModel = require('../models/userModel.js').default;
const { addToCart, removeFromCart, getCart } = require('../controllers/cartController.js');

describe('Cart Controller', () => {
  let mockReq, mockRes, consoleLogSpy;

  beforeEach(() => {
    mockReq = {
      body: {}
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

  describe('addToCart', () => {
    test('should add new item to cart', async () => {
      mockReq.body = {
        userId: 'user123',
        itemId: 'item1'
      };

      const mockUser = {
        cartData: {}
      };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(true);

      await addToCart(mockReq, mockRes);

      expect(mockUser.cartData['item1']).toBe(1);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
        cartData: mockUser.cartData
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Added to Cart'
      });
    });

    test('should increment existing item in cart', async () => {
      mockReq.body = {
        userId: 'user123',
        itemId: 'item1'
      };

      const mockUser = {
        cartData: { item1: 2 }
      };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(true);

      await addToCart(mockReq, mockRes);

      expect(mockUser.cartData['item1']).toBe(3);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Added to Cart'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        userId: 'user123',
        itemId: 'item1'
      };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await addToCart(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('removeFromCart', () => {
    test('should decrement item quantity', async () => {
      mockReq.body = {
        userId: 'user123',
        itemId: 'item1'
      };

      const mockUser = {
        cartData: { item1: 3 }
      };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(true);

      await removeFromCart(mockReq, mockRes);

      expect(mockUser.cartData['item1']).toBe(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Removed from Cart'
      });
    });

    test('should delete item when quantity is 1', async () => {
      mockReq.body = {
        userId: 'user123',
        itemId: 'item1'
      };

      const mockUser = {
        cartData: { item1: 1 }
      };

      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(true);

      await removeFromCart(mockReq, mockRes);

      expect(mockUser.cartData['item1']).toBeUndefined();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Removed from Cart'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        userId: 'user123',
        itemId: 'item1'
      };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await removeFromCart(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('getCart', () => {
    test('should return user cart data', async () => {
      mockReq.body = {
        userId: 'user123'
      };

      const mockUser = {
        cartData: { item1: 2, item2: 1 }
      };

      userModel.findById.mockResolvedValue(mockUser);

      await getCart(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        cartData: mockUser.cartData
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        userId: 'user123'
      };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await getCart(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });
});
