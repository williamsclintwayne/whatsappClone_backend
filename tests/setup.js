// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI_TEST = 'mongodb://localhost:27017/whatsapp-clone-test';

// Suppress console.log during tests
console.log = jest.fn();
console.error = jest.fn();
