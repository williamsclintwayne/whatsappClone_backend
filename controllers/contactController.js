const User = require('../models/User');
const { successResponse, errorResponse, asyncHandler, paginate, getPaginationMeta } = require('../utils/helpers');

/**
 * @desc    Get user's contacts
 * @route   GET /api/contacts
 * @access  Private
 */
const getContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const { skip, limit: limitNum } = paginate(page, limit);

  const user = await User.findByIdWithContacts(req.user._id);
  
  if (!user || !user.contacts) {
    return res.status(200).json(successResponse('Contacts retrieved successfully', {
      contacts: [],
      pagination: getPaginationMeta(1, limitNum, 0)
    }));
  }

  // Apply pagination to contacts
  const totalContacts = user.contacts.length;
  const paginatedContacts = user.contacts
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)) // Sort by most recently added
    .slice(skip, skip + limitNum);

  const pagination = getPaginationMeta(page, limitNum, totalContacts);

  res.status(200).json(successResponse('Contacts retrieved successfully', {
    contacts: paginatedContacts,
    pagination
  }));
});

/**
 * @desc    Add a new contact
 * @route   POST /api/contacts
 * @access  Private
 */
const addContact = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  // Check if trying to add themselves
  if (userId === req.user._id.toString()) {
    return res.status(400).json(errorResponse('You cannot add yourself as a contact'));
  }

  // Check if user exists
  const contactUser = await User.findById(userId).select('name email avatar status isOnline lastSeen');
  if (!contactUser) {
    return res.status(404).json(errorResponse('User not found'));
  }

  // Get current user
  const user = await User.findById(req.user._id);

  // Check if contact already exists
  const existingContact = user.contacts.find(contact => 
    contact.user.toString() === userId
  );

  if (existingContact) {
    return res.status(400).json(errorResponse('User is already in your contacts'));
  }

  // Add contact
  user.contacts.push({
    user: userId,
    addedAt: new Date()
  });

  await user.save();

  // Return the added contact with user details
  const addedContact = {
    user: contactUser,
    addedAt: new Date()
  };

  res.status(201).json(successResponse('Contact added successfully', {
    contact: addedContact
  }));
});

/**
 * @desc    Remove a contact
 * @route   DELETE /api/contacts/:userId
 * @access  Private
 */
const removeContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(req.user._id);

  // Check if contact exists
  const contactIndex = user.contacts.findIndex(contact => 
    contact.user.toString() === userId
  );

  if (contactIndex === -1) {
    return res.status(404).json(errorResponse('Contact not found'));
  }

  // Remove contact
  user.contacts.splice(contactIndex, 1);
  await user.save();

  res.status(200).json(successResponse('Contact removed successfully'));
});

/**
 * @desc    Get contact details
 * @route   GET /api/contacts/:userId
 * @access  Private
 */
const getContactDetails = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(req.user._id);

  // Check if user is in contacts
  const contact = user.contacts.find(contact => 
    contact.user.toString() === userId
  );

  if (!contact) {
    return res.status(404).json(errorResponse('Contact not found'));
  }

  // Get contact user details
  const contactUser = await User.findById(userId)
    .select('name email avatar status isOnline lastSeen createdAt');

  if (!contactUser) {
    return res.status(404).json(errorResponse('Contact user not found'));
  }

  const contactDetails = {
    user: contactUser,
    addedAt: contact.addedAt,
    isContact: true
  };

  res.status(200).json(successResponse('Contact details retrieved successfully', {
    contact: contactDetails
  }));
});

/**
 * @desc    Check if user is a contact
 * @route   GET /api/contacts/check/:userId
 * @access  Private
 */
const checkContact = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(req.user._id);

  const isContact = user.contacts.some(contact => 
    contact.user.toString() === userId
  );

  res.status(200).json(successResponse('Contact check completed', {
    userId,
    isContact
  }));
});

/**
 * @desc    Get online contacts
 * @route   GET /api/contacts/online
 * @access  Private
 */
const getOnlineContacts = asyncHandler(async (req, res) => {
  const user = await User.findByIdWithContacts(req.user._id);

  if (!user || !user.contacts) {
    return res.status(200).json(successResponse('Online contacts retrieved successfully', {
      contacts: []
    }));
  }

  // Filter online contacts
  const onlineContacts = user.contacts.filter(contact => contact.user.isOnline);

  res.status(200).json(successResponse('Online contacts retrieved successfully', {
    contacts: onlineContacts
  }));
});

/**
 * @desc    Search contacts
 * @route   POST /api/contacts/search
 * @access  Private
 */
const searchContacts = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 20 } = req.body;
  const { skip, limit: limitNum } = paginate(page, limit);

  if (!query || query.trim().length < 2) {
    return res.status(400).json(errorResponse('Search query must be at least 2 characters long'));
  }

  const user = await User.findByIdWithContacts(req.user._id);

  if (!user || !user.contacts) {
    return res.status(200).json(successResponse('Search completed', {
      contacts: [],
      pagination: getPaginationMeta(1, limitNum, 0)
    }));
  }

  // Filter contacts based on search query
  const searchRegex = new RegExp(query.trim(), 'i');
  const filteredContacts = user.contacts.filter(contact => 
    searchRegex.test(contact.user.name) || searchRegex.test(contact.user.email)
  );

  // Apply pagination
  const total = filteredContacts.length;
  const paginatedContacts = filteredContacts.slice(skip, skip + limitNum);
  const pagination = getPaginationMeta(page, limitNum, total);

  res.status(200).json(successResponse('Contact search completed', {
    contacts: paginatedContacts,
    pagination,
    searchQuery: query
  }));
});

/**
 * @desc    Get mutual contacts with another user
 * @route   GET /api/contacts/mutual/:userId
 * @access  Private
 */
const getMutualContacts = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Get current user's contacts
  const currentUser = await User.findByIdWithContacts(req.user._id);
  
  // Get other user's contacts
  const otherUser = await User.findByIdWithContacts(userId);

  if (!otherUser) {
    return res.status(404).json(errorResponse('User not found'));
  }

  if (!currentUser.contacts || !otherUser.contacts) {
    return res.status(200).json(successResponse('Mutual contacts retrieved', {
      mutualContacts: []
    }));
  }

  // Find mutual contacts
  const currentUserContactIds = currentUser.contacts.map(contact => contact.user._id.toString());
  const mutualContacts = otherUser.contacts.filter(contact => 
    currentUserContactIds.includes(contact.user._id.toString())
  );

  res.status(200).json(successResponse('Mutual contacts retrieved successfully', {
    mutualContacts,
    count: mutualContacts.length
  }));
});

/**
 * @desc    Get contact statistics
 * @route   GET /api/contacts/stats
 * @access  Private
 */
const getContactStats = asyncHandler(async (req, res) => {
  const user = await User.findByIdWithContacts(req.user._id);

  if (!user || !user.contacts) {
    return res.status(200).json(successResponse('Contact statistics retrieved', {
      stats: {
        totalContacts: 0,
        onlineContacts: 0,
        recentlyAdded: 0
      }
    }));
  }

  const totalContacts = user.contacts.length;
  const onlineContacts = user.contacts.filter(contact => contact.user.isOnline).length;
  
  // Contacts added in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentlyAdded = user.contacts.filter(contact => 
    new Date(contact.addedAt) > sevenDaysAgo
  ).length;

  const stats = {
    totalContacts,
    onlineContacts,
    recentlyAdded,
    offlineContacts: totalContacts - onlineContacts
  };

  res.status(200).json(successResponse('Contact statistics retrieved successfully', {
    stats
  }));
});

module.exports = {
  getContacts,
  addContact,
  removeContact,
  getContactDetails,
  checkContact,
  getOnlineContacts,
  searchContacts,
  getMutualContacts,
  getContactStats
};
