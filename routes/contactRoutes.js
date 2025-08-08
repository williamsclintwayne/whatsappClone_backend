const express = require('express');
const {
  getContacts,
  addContact,
  removeContact,
  getContactDetails,
  checkContact,
  getOnlineContacts,
  searchContacts,
  getMutualContacts,
  getContactStats
} = require('../controllers/contactController');

const {
  validateContact,
  validateSearch
} = require('../middleware/validation');

const router = express.Router();

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     summary: Get user's contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Number of contacts per page
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', getContacts);

/**
 * @swagger
 * /api/contacts:
 *   post:
 *     summary: Add a new contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: MongoDB ObjectId of the user to add as contact
 *     responses:
 *       201:
 *         description: Contact added successfully
 *       400:
 *         description: Cannot add yourself or user already in contacts
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.post('/', validateContact, addContact);

/**
 * @swagger
 * /api/contacts/online:
 *   get:
 *     summary: Get online contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Online contacts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/online', getOnlineContacts);

/**
 * @swagger
 * /api/contacts/search:
 *   post:
 *     summary: Search contacts
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
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
 *         description: Contact search completed
 *       400:
 *         description: Invalid search query
 *       401:
 *         description: Unauthorized
 */
router.post('/search', validateSearch, searchContacts);

/**
 * @swagger
 * /api/contacts/stats:
 *   get:
 *     summary: Get contact statistics
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', getContactStats);

/**
 * @swagger
 * /api/contacts/check/{userId}:
 *   get:
 *     summary: Check if user is a contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to check
 *     responses:
 *       200:
 *         description: Contact check completed
 *       401:
 *         description: Unauthorized
 */
router.get('/check/:userId', checkContact);

/**
 * @swagger
 * /api/contacts/mutual/{userId}:
 *   get:
 *     summary: Get mutual contacts with another user
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to find mutual contacts with
 *     responses:
 *       200:
 *         description: Mutual contacts retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Unauthorized
 */
router.get('/mutual/:userId', getMutualContacts);

/**
 * @swagger
 * /api/contacts/{userId}:
 *   get:
 *     summary: Get contact details
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact user ID
 *     responses:
 *       200:
 *         description: Contact details retrieved successfully
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:userId', getContactDetails);

/**
 * @swagger
 * /api/contacts/{userId}:
 *   delete:
 *     summary: Remove a contact
 *     tags: [Contacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact user ID to remove
 *     responses:
 *       200:
 *         description: Contact removed successfully
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:userId', removeContact);

module.exports = router;
