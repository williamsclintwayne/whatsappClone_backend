const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');
const Message = require('../models/Message');
const mongoose = require('mongoose');

// Test database
const MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/whatsapp-clone-test';

describe('Message Endpoints', () => {
  let authToken1, authToken2;
  let user1, user2;

  const testUser1 = {
    name: 'User One',
    email: 'user1@example.com',
    password: 'Password123'
  };

  const testUser2 = {
    name: 'User Two',
    email: 'user2@example.com',
    password: 'Password123'
  };

  beforeAll(async () => {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Message.deleteMany({});

    // Create test users
    const user1Response = await request(app)
      .post('/api/auth/register')
      .send(testUser1);
    
    const user2Response = await request(app)
      .post('/api/auth/register')
      .send(testUser2);

    authToken1 = user1Response.body.token;
    authToken2 = user2Response.body.token;
    user1 = user1Response.body.data.user;
    user2 = user2Response.body.data.user;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/messages', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        receiverId: user2.id,
        content: 'Hello, this is a test message!',
        messageType: 'text'
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(messageData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message.content).toBe(messageData.content);
      expect(response.body.data.message.sender._id).toBe(user1.id);
      expect(response.body.data.message.receiver._id).toBe(user2.id);
      expect(response.body.data.message.messageType).toBe('text');

      // Verify message was saved to database
      const message = await Message.findById(response.body.data.message._id);
      expect(message).toBeTruthy();
      expect(message.status).toBe('sent');
    });

    it('should auto-detect emoji message type', async () => {
      const messageData = {
        receiverId: user2.id,
        content: '😀'
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(messageData)
        .expect(201);

      expect(response.body.data.message.messageType).toBe('emoji');
    });

    it('should not send message to non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const messageData = {
        receiverId: fakeUserId,
        content: 'Hello!'
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(messageData)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Receiver not found');
    });

    it('should not send empty message', async () => {
      const messageData = {
        receiverId: user2.id,
        content: ''
      };

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(messageData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    it('should not send message without authentication', async () => {
      const messageData = {
        receiverId: user2.id,
        content: 'Hello!'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(messageData)
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/messages/conversation/:userId', () => {
    beforeEach(async () => {
      // Create some test messages
      await Message.create([
        {
          sender: user1.id,
          receiver: user2.id,
          content: 'Hello from user1',
          messageType: 'text'
        },
        {
          sender: user2.id,
          receiver: user1.id,
          content: 'Hello back from user2',
          messageType: 'text'
        },
        {
          sender: user1.id,
          receiver: user2.id,
          content: 'How are you?',
          messageType: 'text'
        }
      ]);
    });

    it('should get conversation between two users', async () => {
      const response = await request(app)
        .get(`/api/messages/conversation/${user2.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.messages).toHaveLength(3);
      expect(response.body.data.participant.id).toBe(user2.id);
      expect(response.body.data.pagination).toBeDefined();

      // Messages should be ordered oldest first
      expect(response.body.data.messages[0].content).toBe('Hello from user1');
      expect(response.body.data.messages[1].content).toBe('Hello back from user2');
      expect(response.body.data.messages[2].content).toBe('How are you?');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get(`/api/messages/conversation/${user2.id}?page=1&limit=2`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.data.messages).toHaveLength(2);
      expect(response.body.data.pagination.totalResults).toBe(3);
      expect(response.body.data.pagination.hasNextPage).toBe(true);
    });

    it('should not get conversation with non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/messages/conversation/${fakeUserId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(404);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/messages/conversations', () => {
    beforeEach(async () => {
      // Create messages with different users to test conversations list
      await Message.create([
        {
          sender: user1.id,
          receiver: user2.id,
          content: 'Latest message to user2',
          messageType: 'text'
        }
      ]);
    });

    it('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.conversations).toBeDefined();
      expect(Array.isArray(response.body.data.conversations)).toBe(true);
    });
  });

  describe('PUT /api/messages/read/:senderId', () => {
    let messageId;

    beforeEach(async () => {
      const message = await Message.create({
        sender: user1.id,
        receiver: user2.id,
        content: 'Unread message',
        messageType: 'text',
        status: 'delivered'
      });
      messageId = message._id;
    });

    it('should mark messages as read', async () => {
      const response = await request(app)
        .put(`/api/messages/read/${user1.id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.modifiedCount).toBe(1);

      // Verify message status was updated
      const message = await Message.findById(messageId);
      expect(message.status).toBe('read');
      expect(message.readAt).toBeDefined();
    });
  });

  describe('DELETE /api/messages/:messageId', () => {
    let messageId;

    beforeEach(async () => {
      const message = await Message.create({
        sender: user1.id,
        receiver: user2.id,
        content: 'Message to delete',
        messageType: 'text'
      });
      messageId = message._id;
    });

    it('should delete own message', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body.status).toBe('success');

      // Verify message was soft deleted
      const message = await Message.findById(messageId);
      expect(message.isDeleted).toBe(true);
      expect(message.deletedAt).toBeDefined();
    });

    it('should not delete other user\'s message', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('You can only delete your own messages');
    });
  });

  describe('PUT /api/messages/:messageId', () => {
    let messageId;

    beforeEach(async () => {
      const message = await Message.create({
        sender: user1.id,
        receiver: user2.id,
        content: 'Original message',
        messageType: 'text'
      });
      messageId = message._id;
    });

    it('should edit own message', async () => {
      const newContent = 'Edited message content';

      const response = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({ content: newContent })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.message.content).toBe(newContent);
      expect(response.body.data.message.editedAt).toBeDefined();
    });

    it('should not edit other user\'s message', async () => {
      const response = await request(app)
        .put(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ content: 'Trying to edit' })
        .expect(403);

      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/messages/unread/count', () => {
    beforeEach(async () => {
      await Message.create([
        {
          sender: user1.id,
          receiver: user2.id,
          content: 'Unread message 1',
          messageType: 'text',
          status: 'delivered'
        },
        {
          sender: user1.id,
          receiver: user2.id,
          content: 'Unread message 2',
          messageType: 'text',
          status: 'sent'
        }
      ]);
    });

    it('should get unread message count', async () => {
      const response = await request(app)
        .get('/api/messages/unread/count')
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.unreadCount).toBe(2);
    });
  });
});
