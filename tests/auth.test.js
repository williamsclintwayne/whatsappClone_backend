const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');
const mongoose = require('mongoose');

// Test database
const MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/whatsapp-clone-test';

describe('Authentication Endpoints', () => {
  let server;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    const validUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123'
    };

    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(validUser.email);
      expect(response.body.data.user.name).toBe(validUser.name);
      expect(response.body.token).toBeDefined();

      // Verify user was saved to database
      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeTruthy();
      expect(user.isEmailVerified).toBe(false);
    });

    it('should not register user with invalid email', async () => {
      const invalidUser = { ...validUser, email: 'invalid-email' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    it('should not register user with short password', async () => {
      const invalidUser = { ...validUser, password: '123' };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should not register user with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('User already exists with this email');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123'
    };

    beforeEach(async () => {
      // Create a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.token).toBeDefined();

      // Verify user is marked as online
      const user = await User.findOne({ email: testUser.email });
      expect(user.isOnline).toBe(true);
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should not login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123'
    };

    beforeEach(async () => {
      // Register and login to get auth token
      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      authToken = loginResponse.body.token;
    });

    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Access denied. No token provided.');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Invalid token.');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123'
    };

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      authToken = loginResponse.body.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('User logged out successfully');

      // Verify user is marked as offline
      const user = await User.findOne({ email: testUser.email });
      expect(user.isOnline).toBe(false);
    });

    it('should not logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});
