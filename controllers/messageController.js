const Message = require('../models/Message');
const User = require('../models/User');
const { successResponse, errorResponse, asyncHandler, paginate, getPaginationMeta, containsEmoji } = require('../utils/helpers');

/**
 * @desc    Send a message
 * @route   POST /api/messages
 * @access  Private
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, messageType, replyTo } = req.body;

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return res.status(404).json(errorResponse('Receiver not found'));
  }

  // Determine message type if not provided
  let finalMessageType = messageType;
  if (!finalMessageType) {
    finalMessageType = containsEmoji(content) && content.trim().length <= 10 ? 'emoji' : 'text';
  }

  // Create message
  const message = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    content: content.trim(),
    messageType: finalMessageType,
    replyTo: replyTo || null
  });

  // Populate sender and receiver info
  await message.populate([
    { path: 'sender', select: 'name avatar' },
    { path: 'receiver', select: 'name avatar' },
    { path: 'replyTo', select: 'content sender' }
  ]);

  res.status(201).json(successResponse('Message sent successfully', { message }));
});

/**
 * @desc    Get conversation between two users
 * @route   GET /api/messages/conversation/:userId
 * @access  Private
 */
const getConversation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Check if other user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return res.status(404).json(errorResponse('User not found'));
  }

  const messages = await Message.getConversation(req.user._id, userId, page, limit);
  
  // Get total count for pagination
  const totalMessages = await Message.countDocuments({
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id }
    ],
    isDeleted: false
  });

  const pagination = getPaginationMeta(page, limit, totalMessages);

  // Mark messages as read
  await Message.markAsRead(userId, req.user._id);

  res.status(200).json(successResponse('Conversation retrieved successfully', {
    messages: messages.reverse(), // Reverse to show oldest first
    pagination,
    participant: {
      id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar,
      isOnline: otherUser.isOnline,
      lastSeen: otherUser.lastSeen
    }
  }));
});

/**
 * @desc    Get all conversations for the user
 * @route   GET /api/messages/conversations
 * @access  Private
 */
const getConversations = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  const conversations = await Message.getLatestConversations(req.user._id, parseInt(limit));

  res.status(200).json(successResponse('Conversations retrieved successfully', {
    conversations
  }));
});

/**
 * @desc    Mark messages as read
 * @route   PUT /api/messages/read/:senderId
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { senderId } = req.params;

  // Check if sender exists
  const sender = await User.findById(senderId);
  if (!sender) {
    return res.status(404).json(errorResponse('Sender not found'));
  }

  const result = await Message.markAsRead(senderId, req.user._id);

  res.status(200).json(successResponse('Messages marked as read', {
    modifiedCount: result.modifiedCount
  }));
});

/**
 * @desc    Delete a message
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json(errorResponse('Message not found'));
  }

  // Check if user is the sender
  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json(errorResponse('You can only delete your own messages'));
  }

  // Soft delete - mark as deleted instead of removing from database
  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  res.status(200).json(successResponse('Message deleted successfully'));
});

/**
 * @desc    Edit a message
 * @route   PUT /api/messages/:messageId
 * @access  Private
 */
const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json(errorResponse('Message not found'));
  }

  // Check if user is the sender
  if (message.sender.toString() !== req.user._id.toString()) {
    return res.status(403).json(errorResponse('You can only edit your own messages'));
  }

  // Check if message is not too old (24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (message.createdAt < twentyFourHoursAgo) {
    return res.status(400).json(errorResponse('Messages older than 24 hours cannot be edited'));
  }

  // Update message
  message.content = content.trim();
  message.editedAt = new Date();
  
  // Update message type if needed
  message.messageType = containsEmoji(content) && content.trim().length <= 10 ? 'emoji' : 'text';
  
  await message.save();

  // Populate for response
  await message.populate([
    { path: 'sender', select: 'name avatar' },
    { path: 'receiver', select: 'name avatar' }
  ]);

  res.status(200).json(successResponse('Message edited successfully', { message }));
});

/**
 * @desc    Get message by ID
 * @route   GET /api/messages/:messageId
 * @access  Private
 */
const getMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId)
    .populate('sender', 'name avatar')
    .populate('receiver', 'name avatar')
    .populate('replyTo', 'content sender');

  if (!message) {
    return res.status(404).json(errorResponse('Message not found'));
  }

  // Check if user is part of this conversation
  const isParticipant = message.sender._id.toString() === req.user._id.toString() ||
                       message.receiver._id.toString() === req.user._id.toString();

  if (!isParticipant) {
    return res.status(403).json(errorResponse('Access denied'));
  }

  res.status(200).json(successResponse('Message retrieved successfully', { message }));
});

/**
 * @desc    Search messages in a conversation
 * @route   POST /api/messages/search/:userId
 * @access  Private
 */
const searchMessages = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { query, page = 1, limit = 20 } = req.body;
  const { skip, limit: limitNum } = paginate(page, limit);

  if (!query || query.trim().length < 2) {
    return res.status(400).json(errorResponse('Search query must be at least 2 characters long'));
  }

  // Check if other user exists
  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return res.status(404).json(errorResponse('User not found'));
  }

  const searchRegex = new RegExp(query.trim(), 'i');

  const searchQuery = {
    $or: [
      { sender: req.user._id, receiver: userId },
      { sender: userId, receiver: req.user._id }
    ],
    content: searchRegex,
    isDeleted: false
  };

  const messages = await Message.find(searchQuery)
    .populate('sender', 'name avatar')
    .populate('receiver', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Message.countDocuments(searchQuery);
  const pagination = getPaginationMeta(page, limitNum, total);

  res.status(200).json(successResponse('Message search completed', {
    messages,
    pagination,
    searchQuery: query
  }));
});

/**
 * @desc    Get unread message count
 * @route   GET /api/messages/unread/count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Message.getUnreadCount(req.user._id);

  res.status(200).json(successResponse('Unread count retrieved successfully', {
    unreadCount
  }));
});

/**
 * @desc    Get message statistics
 * @route   GET /api/messages/stats
 * @access  Private
 */
const getMessageStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Total messages sent
  const totalSent = await Message.countDocuments({
    sender: userId,
    isDeleted: false
  });

  // Total messages received
  const totalReceived = await Message.countDocuments({
    receiver: userId,
    isDeleted: false
  });

  // Unread messages
  const unreadCount = await Message.countDocuments({
    receiver: userId,
    status: { $ne: 'read' },
    isDeleted: false
  });

  // Messages sent today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messagesToday = await Message.countDocuments({
    sender: userId,
    createdAt: { $gte: today },
    isDeleted: false
  });

  // Get conversation count
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { sender: userId },
          { receiver: userId }
        ],
        isDeleted: false
      }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$sender', userId] },
            '$receiver',
            '$sender'
          ]
        }
      }
    },
    {
      $count: 'totalConversations'
    }
  ]);

  const totalConversations = conversations.length > 0 ? conversations[0].totalConversations : 0;

  const stats = {
    totalSent,
    totalReceived,
    unreadCount,
    messagesToday,
    totalConversations,
    totalMessages: totalSent + totalReceived
  };

  res.status(200).json(successResponse('Message statistics retrieved successfully', {
    stats
  }));
});

/**
 * @desc    Forward a message
 * @route   POST /api/messages/:messageId/forward
 * @access  Private
 */
const forwardMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { receiverId } = req.body;

  // Get original message
  const originalMessage = await Message.findById(messageId);
  if (!originalMessage) {
    return res.status(404).json(errorResponse('Original message not found'));
  }

  // Check if user has access to the original message
  const hasAccess = originalMessage.sender.toString() === req.user._id.toString() ||
                   originalMessage.receiver.toString() === req.user._id.toString();

  if (!hasAccess) {
    return res.status(403).json(errorResponse('Access denied to original message'));
  }

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    return res.status(404).json(errorResponse('Receiver not found'));
  }

  // Create forwarded message
  const forwardedMessage = await Message.create({
    sender: req.user._id,
    receiver: receiverId,
    content: originalMessage.content,
    messageType: originalMessage.messageType
  });

  // Populate for response
  await forwardedMessage.populate([
    { path: 'sender', select: 'name avatar' },
    { path: 'receiver', select: 'name avatar' }
  ]);

  res.status(201).json(successResponse('Message forwarded successfully', {
    message: forwardedMessage
  }));
});

module.exports = {
  sendMessage,
  getConversation,
  getConversations,
  markAsRead,
  deleteMessage,
  editMessage,
  getMessage,
  searchMessages,
  getUnreadCount,
  getMessageStats,
  forwardMessage
};
