const User = require('../models/User');
const { successResponse, errorResponse, asyncHandler, paginate, getPaginationMeta, escapeRegex } = require('../utils/helpers');

/**
 * @desc    Get all users (search functionality)
 * @route   GET /api/users
 * @access  Private
 */
const getUsers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const { skip, limit: limitNum } = paginate(page, limit);

  let query = { _id: { $ne: req.user._id } }; // Exclude current user

  // Add search functionality
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex }
    ];
  }

  const users = await User.find(query)
    .select('name email avatar status isOnline lastSeen')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(query);
  const pagination = getPaginationMeta(page, limitNum, total);

  res.status(200).json(successResponse('Users retrieved successfully', {
    users,
    pagination
  }));
});

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('name email avatar status isOnline lastSeen createdAt');

  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }

  res.status(200).json(successResponse('User retrieved successfully', { user }));
});

/**
 * @desc    Search users by name or email
 * @route   POST /api/users/search
 * @access  Private
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { query, page = 1, limit = 20 } = req.body;
  const { skip, limit: limitNum } = paginate(page, limit);

  if (!query || query.trim().length < 2) {
    return res.status(400).json(errorResponse('Search query must be at least 2 characters long'));
  }

  const searchRegex = new RegExp(escapeRegex(query.trim()), 'i');
  
  const searchQuery = {
    _id: { $ne: req.user._id }, // Exclude current user
    $or: [
      { name: searchRegex },
      { email: searchRegex }
    ]
  };

  const users = await User.find(searchQuery)
    .select('name email avatar status isOnline lastSeen')
    .sort({ name: 1 })
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(searchQuery);
  const pagination = getPaginationMeta(page, limitNum, total);

  res.status(200).json(successResponse('Search completed successfully', {
    users,
    pagination,
    searchQuery: query
  }));
});

/**
 * @desc    Get user's online status
 * @route   GET /api/users/:id/status
 * @access  Private
 */
const getUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('isOnline lastSeen status');

  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }

  res.status(200).json(successResponse('User status retrieved successfully', {
    userId: user._id,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen,
    status: user.status
  }));
});

/**
 * @desc    Update user's online status
 * @route   PUT /api/users/status
 * @access  Private
 */
const updateOnlineStatus = asyncHandler(async (req, res) => {
  const { isOnline } = req.body;

  const updateData = {
    isOnline: Boolean(isOnline),
    lastSeen: new Date()
  };

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, select: 'isOnline lastSeen' }
  );

  res.status(200).json(successResponse('Online status updated successfully', {
    userId: user._id,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen
  }));
});

/**
 * @desc    Block a user
 * @route   POST /api/users/:id/block
 * @access  Private
 */
const blockUser = asyncHandler(async (req, res) => {
  const userToBlock = req.params.id;

  if (userToBlock === req.user._id.toString()) {
    return res.status(400).json(errorResponse('You cannot block yourself'));
  }

  // Check if user exists
  const targetUser = await User.findById(userToBlock);
  if (!targetUser) {
    return res.status(404).json(errorResponse('User not found'));
  }

  // Add to blocked list (you can create a separate BlockedUser model for this)
  const user = await User.findById(req.user._id);
  
  // For now, we'll add this to the user schema as blockedUsers array
  // You might want to create a separate model for more complex blocking features
  if (!user.blockedUsers) {
    user.blockedUsers = [];
  }

  if (!user.blockedUsers.includes(userToBlock)) {
    user.blockedUsers.push(userToBlock);
    await user.save();
  }

  res.status(200).json(successResponse('User blocked successfully'));
});

/**
 * @desc    Unblock a user
 * @route   DELETE /api/users/:id/block
 * @access  Private
 */
const unblockUser = asyncHandler(async (req, res) => {
  const userToUnblock = req.params.id;

  const user = await User.findById(req.user._id);
  
  if (user.blockedUsers && user.blockedUsers.includes(userToUnblock)) {
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userToUnblock);
    await user.save();
  }

  res.status(200).json(successResponse('User unblocked successfully'));
});

/**
 * @desc    Get blocked users
 * @route   GET /api/users/blocked
 * @access  Private
 */
const getBlockedUsers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('blockedUsers', 'name email avatar')
    .select('blockedUsers');

  res.status(200).json(successResponse('Blocked users retrieved successfully', {
    blockedUsers: user.blockedUsers || []
  }));
});

/**
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Private
 */
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get user with contacts
  const user = await User.findByIdWithContacts(userId);
  
  // Count total contacts
  const totalContacts = user.contacts ? user.contacts.length : 0;

  // Count online contacts
  const onlineContacts = user.contacts 
    ? user.contacts.filter(contact => contact.user.isOnline).length 
    : 0;

  // You can add more statistics here like:
  // - Total messages sent/received
  // - Account creation date
  // - Last login, etc.

  const stats = {
    totalContacts,
    onlineContacts,
    accountCreated: user.createdAt,
    lastSeen: user.lastSeen,
    isEmailVerified: user.isEmailVerified
  };

  res.status(200).json(successResponse('User statistics retrieved successfully', { stats }));
});

/**
 * @desc    Update user avatar
 * @route   PUT /api/users/avatar
 * @access  Private
 */
const updateAvatar = asyncHandler(async (req, res) => {
  const { avatar } = req.body;

  if (!avatar) {
    return res.status(400).json(errorResponse('Avatar URL is required'));
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar },
    { new: true, runValidators: true }
  ).select('name email avatar');

  res.status(200).json(successResponse('Avatar updated successfully', { user }));
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json(errorResponse('Password is required to delete account'));
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  if (!(await user.comparePassword(password))) {
    return res.status(401).json(errorResponse('Invalid password'));
  }

  // Delete user account
  await User.findByIdAndDelete(req.user._id);

  res.status(200).json(successResponse('Account deleted successfully'));
});

module.exports = {
  getUsers,
  getUserById,
  searchUsers,
  getUserStatus,
  updateOnlineStatus,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getUserStats,
  updateAvatar,
  deleteAccount
};
