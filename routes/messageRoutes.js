const express = require('express');
const {
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
} = require('../controllers/messageController');

const {
  validateMessage,
  validateSearch,
  validatePagination
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: MongoDB ObjectId of the message receiver
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 description: Message content
 *               messageType:
 *                 type: string
 *                 enum: [text, emoji]
 *                 description: Type of message
 *               replyTo:
 *                 type: string
 *                 description: MongoDB ObjectId of the message being replied to
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Receiver not found
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateMessage, sendMessage);

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for the user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of conversations to retrieve
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/conversations', getConversations);

/**
 * @swagger
 * /api/messages/unread/count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/unread/count', getUnreadCount);

/**
 * @swagger
 * /api/messages/stats:
 *   get:
 *     summary: Get message statistics
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Message statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', getMessageStats);

/**
 * @swagger
 * /api/messages/conversation/{userId}:
 *   get:
 *     summary: Get conversation between current user and another user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get conversation with
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Conversation retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get('/conversation/:userId', getConversation);

/**
 * @swagger
 * /api/messages/search/{userId}:
 *   post:
 *     summary: Search messages in a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID of the conversation participant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *               page:
 *                 type: integer
 *                 minimum: 1
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Message search completed
 *       400:
 *         description: Invalid search query
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.post('/search/:userId', validateSearch, searchMessages);

/**
 * @swagger
 * /api/messages/read/{senderId}:
 *   put:
 *     summary: Mark messages as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: senderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Sender ID whose messages to mark as read
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       404:
 *         description: Sender not found
 *       401:
 *         description: Unauthorized
 */
router.put('/read/:senderId', markAsRead);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   get:
 *     summary: Get message by ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:messageId', getMessage);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   put:
 *     summary: Edit a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Message edited successfully
 *       400:
 *         description: Message too old to edit
 *       403:
 *         description: Can only edit your own messages
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:messageId', editMessage);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       403:
 *         description: Can only delete your own messages
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:messageId', deleteMessage);

/**
 * @swagger
 * /api/messages/{messageId}/forward:
 *   post:
 *     summary: Forward a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID to forward
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: MongoDB ObjectId of the message receiver
 *     responses:
 *       201:
 *         description: Message forwarded successfully
 *       403:
 *         description: Access denied to original message
 *       404:
 *         description: Message or receiver not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:messageId/forward', forwardMessage);

module.exports = router;
