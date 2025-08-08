const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const { isValidObjectId } = require('../utils/helpers');

// Store active users and their socket IDs
const activeUsers = new Map();

/**
 * Socket.io handler for real-time communication
 */
const socketHandler = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🔌 User ${socket.user.name} connected (${userId})`);

    try {
      // Add user to active users
      activeUsers.set(userId, {
        socketId: socket.id,
        user: socket.user,
        lastSeen: new Date()
      });

      // Update user online status
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      // Join user to their own room for personal notifications
      socket.join(userId);

      // Emit user online status to their contacts
      const userWithContacts = await User.findByIdWithContacts(userId);
      if (userWithContacts && userWithContacts.contacts) {
        userWithContacts.contacts.forEach(contact => {
          socket.to(contact.user._id.toString()).emit('userOnline', {
            userId: userId,
            isOnline: true,
            lastSeen: new Date()
          });
        });
      }

      // Handle joining a conversation
      socket.on('joinConversation', async (data) => {
        try {
          const { receiverId } = data;

          if (!isValidObjectId(receiverId)) {
            socket.emit('error', { message: 'Invalid receiver ID' });
            return;
          }

          // Leave previous conversation room if any
          const rooms = Array.from(socket.rooms);
          rooms.forEach(room => {
            if (room !== socket.id && room !== userId) {
              socket.leave(room);
            }
          });

          // Generate conversation room ID
          const conversationId = [userId, receiverId].sort().join('-');
          socket.join(conversationId);

          // Mark messages as delivered
          await Message.markAsDelivered(receiverId, userId);

          console.log(`📱 User ${userId} joined conversation ${conversationId}`);
          
          socket.emit('conversationJoined', { conversationId, receiverId });
        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Handle sending messages
      socket.on('sendMessage', async (data) => {
        try {
          const { receiverId, content, messageType = 'text', replyTo } = data;

          // Validate input
          if (!isValidObjectId(receiverId)) {
            socket.emit('error', { message: 'Invalid receiver ID' });
            return;
          }

          if (!content || content.trim().length === 0) {
            socket.emit('error', { message: 'Message content is required' });
            return;
          }

          if (content.length > 1000) {
            socket.emit('error', { message: 'Message too long' });
            return;
          }

          // Check if receiver exists
          const receiver = await User.findById(receiverId);
          if (!receiver) {
            socket.emit('error', { message: 'Receiver not found' });
            return;
          }

          // Create message
          const messageData = {
            sender: userId,
            receiver: receiverId,
            content: content.trim(),
            messageType,
            replyTo: replyTo || null
          };

          const message = new Message(messageData);
          await message.save();

          // Populate sender and receiver info
          await message.populate([
            { path: 'sender', select: 'name avatar' },
            { path: 'receiver', select: 'name avatar' },
            { path: 'replyTo', select: 'content sender' }
          ]);

          const conversationId = [userId, receiverId].sort().join('-');

          // Emit to conversation room
          io.to(conversationId).emit('newMessage', message);

          // If receiver is not in the conversation room, send notification
          const receiverSocket = activeUsers.get(receiverId);
          if (receiverSocket && !io.sockets.adapter.rooms.get(conversationId)?.has(receiverSocket.socketId)) {
            socket.to(receiverId).emit('messageNotification', {
              message,
              sender: socket.user
            });
          }

          console.log(`💬 Message sent from ${userId} to ${receiverId}`);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data) => {
        try {
          const { receiverId, isTyping } = data;

          if (!isValidObjectId(receiverId)) {
            return;
          }

          const conversationId = [userId, receiverId].sort().join('-');
          
          socket.to(conversationId).emit('typingIndicator', {
            userId,
            userName: socket.user.name,
            isTyping
          });
        } catch (error) {
          console.error('Error handling typing:', error);
        }
      });

      // Handle message read status
      socket.on('markAsRead', async (data) => {
        try {
          const { messageId, senderId } = data;

          if (!isValidObjectId(messageId) || !isValidObjectId(senderId)) {
            socket.emit('error', { message: 'Invalid message or sender ID' });
            return;
          }

          // Update message status
          await Message.markAsRead(senderId, userId);

          // Notify sender about read status
          const conversationId = [userId, senderId].sort().join('-');
          socket.to(conversationId).emit('messageRead', {
            readBy: userId,
            senderId,
            timestamp: new Date()
          });

        } catch (error) {
          console.error('Error marking message as read:', error);
          socket.emit('error', { message: 'Failed to mark message as read' });
        }
      });

      // Handle user status updates
      socket.on('updateStatus', async (data) => {
        try {
          const { status } = data;

          if (!status || status.length > 139) {
            socket.emit('error', { message: 'Invalid status' });
            return;
          }

          await User.findByIdAndUpdate(userId, { status });

          // Notify contacts about status change
          const userWithContacts = await User.findByIdWithContacts(userId);
          if (userWithContacts && userWithContacts.contacts) {
            userWithContacts.contacts.forEach(contact => {
              socket.to(contact.user._id.toString()).emit('statusUpdate', {
                userId,
                status
              });
            });
          }

        } catch (error) {
          console.error('Error updating status:', error);
          socket.emit('error', { message: 'Failed to update status' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        try {
          console.log(`🔌 User ${socket.user.name} disconnected (${userId})`);

          // Remove from active users
          activeUsers.delete(userId);

          // Update user offline status
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
          });

          // Notify contacts about offline status
          const userWithContacts = await User.findByIdWithContacts(userId);
          if (userWithContacts && userWithContacts.contacts) {
            userWithContacts.contacts.forEach(contact => {
              socket.to(contact.user._id.toString()).emit('userOffline', {
                userId,
                isOnline: false,
                lastSeen: new Date()
              });
            });
          }

        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      });

    } catch (error) {
      console.error('Error setting up socket connection:', error);
      socket.emit('error', { message: 'Connection setup failed' });
    }
  });

  // Periodically update last seen for active users
  setInterval(async () => {
    for (const [userId, userData] of activeUsers.entries()) {
      try {
        await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
      } catch (error) {
        console.error('Error updating last seen:', error);
      }
    }
  }, 30000); // Update every 30 seconds
};

module.exports = socketHandler;
