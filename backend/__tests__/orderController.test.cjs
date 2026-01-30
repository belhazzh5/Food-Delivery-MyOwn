jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn()
      }
    }
  }));
});

jest.mock('../models/orderModel.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../models/userModel.js', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn()
  }
}));

const Stripe = require('stripe');
const orderModel = require('../models/orderModel.js').default;
const userModel = require('../models/userModel.js').default;
const { placeOrder, verifyOrder, userOrders, listOrders, updateStatus } = require('../controllers/orderController.js');

describe('Order Controller', () => {
  let mockReq, mockRes, consoleLogSpy, mockStripe;

  beforeEach(() => {
    mockReq = {
      body: {}
    };
    mockRes = {
      json: jest.fn()
    };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
    
    mockStripe = new Stripe();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('placeOrder', () => {
    test('should place order successfully', async () => {
      mockReq.body = {
        userId: 'user123',
        items: [
          { name: 'Pizza', price: 15, quantity: 2 }
        ],
        amount: 32,
        address: '123 Main St'
      };

      const mockOrder = {
        _id: 'order123',
        save: jest.fn().mockResolvedValue(true)
      };

      orderModel.mockImplementation(() => mockOrder);
      userModel.findByIdAndUpdate.mockResolvedValue(true);
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session123'
      });

      await placeOrder(mockReq, mockRes);

      expect(mockOrder.save).toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', { cartData: {} });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        session_url: 'https://checkout.stripe.com/session123'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        userId: 'user123',
        items: [],
        amount: 0,
        address: '123 Main St'
      };

      orderModel.mockImplementation(() => {
        throw new Error('Order creation failed');
      });

      await placeOrder(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('verifyOrder', () => {
    test('should verify successful payment', async () => {
      mockReq.body = {
        orderId: 'order123',
        success: 'true'
      };

      orderModel.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

      await verifyOrder(mockReq, mockRes);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith('order123', { payment: true });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Paid'
      });
    });

    test('should handle failed payment', async () => {
      mockReq.body = {
        orderId: 'order123',
        success: 'false'
      };

      orderModel.findByIdAndDelete = jest.fn().mockResolvedValue(true);

      await verifyOrder(mockReq, mockRes);

      expect(orderModel.findByIdAndDelete).toHaveBeenCalledWith('order123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not Paid'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        orderId: 'order123',
        success: 'true'
      };

      orderModel.findByIdAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

      await verifyOrder(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('userOrders', () => {
    test('should return user orders', async () => {
      mockReq.body = {
        userId: 'user123'
      };

      const mockOrders = [
        { _id: 'order1', amount: 30 },
        { _id: 'order2', amount: 45 }
      ];

      orderModel.find = jest.fn().mockResolvedValue(mockOrders);

      await userOrders(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrders
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        userId: 'user123'
      };

      orderModel.find = jest.fn().mockRejectedValue(new Error('Database error'));

      await userOrders(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('listOrders', () => {
    test('should list all orders for admin', async () => {
      mockReq.body = {
        userId: 'admin123'
      };

      const mockAdmin = { role: 'admin' };
      const mockOrders = [
        { _id: 'order1', amount: 30 },
        { _id: 'order2', amount: 45 }
      ];

      userModel.findById.mockResolvedValue(mockAdmin);
      orderModel.find = jest.fn().mockResolvedValue(mockOrders);

      await listOrders(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrders
      });
    });

    test('should reject non-admin users', async () => {
      mockReq.body = {
        userId: 'user123'
      };

      const mockUser = { role: 'user' };
      userModel.findById.mockResolvedValue(mockUser);

      await listOrders(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not admin'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        userId: 'admin123'
      };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await listOrders(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });

  describe('updateStatus', () => {
    test('should update order status for admin', async () => {
      mockReq.body = {
        userId: 'admin123',
        orderId: 'order123',
        status: 'Delivered'
      };

      const mockAdmin = { role: 'admin' };
      userModel.findById.mockResolvedValue(mockAdmin);
      orderModel.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

      await updateStatus(mockReq, mockRes);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith('order123', {
        status: 'Delivered'
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Status Updated Successfully'
      });
    });

    test('should reject non-admin users', async () => {
      mockReq.body = {
        userId: 'user123',
        orderId: 'order123',
        status: 'Delivered'
      };

      const mockUser = { role: 'user' };
      userModel.findById.mockResolvedValue(mockUser);

      await updateStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'You are not an admin'
      });
    });

    test('should handle errors', async () => {
      mockReq.body = {
        userId: 'admin123',
        orderId: 'order123',
        status: 'Delivered'
      };

      userModel.findById.mockRejectedValue(new Error('Database error'));

      await updateStatus(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Error'
      });
    });
  });
});
