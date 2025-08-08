const crypto = require('crypto');
const User = require('../models/User');
const { sendTokenResponse } = require('../middleware/auth');
const { successResponse, errorResponse, asyncHandler } = require('../utils/helpers');
const emailService = require('../utils/emailService');

/**
 * @desc    Register user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json(errorResponse('User already exists with this email'));
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password
  });

  // Generate email verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    // Send verification email
    await emailService.sendWelcomeEmail(user, verificationToken);
    
    // Send token response
    sendTokenResponse(user, 201, res, 'User registered successfully. Please check your email for verification.');
  } catch (error) {
    // If email fails, remove verification token
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });
    
    console.error('Email sending failed:', error);
    // In development, continue with registration even if email fails
    sendTokenResponse(user, 201, res, 'User registered successfully. Email verification is currently unavailable.');
  }
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check for user and include password
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json(errorResponse('Invalid email or password'));
  }

  // Update online status
  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, 'Login successful');
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Update user offline status
  await User.findByIdAndUpdate(req.user._id, {
    isOnline: false,
    lastSeen: new Date()
  });

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json(successResponse('User logged out successfully'));
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  res.status(200).json(successResponse('User profile retrieved successfully', { user }));
});

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/me
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    status: req.body.status,
    avatar: req.body.avatar
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key => 
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json(successResponse('Profile updated successfully', { user }));
});

/**
 * @desc    Update password
 * @route   PUT /api/auth/updatepassword
 * @access  Private
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json(errorResponse('Please provide current and new password'));
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json(errorResponse('Current password is incorrect'));
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password updated successfully');
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgotpassword
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json(errorResponse('User not found with this email'));
  }

  // Get reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
    
    res.status(200).json(successResponse('Password reset email sent'));
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error('Email sending failed:', error);
    return res.status(500).json(errorResponse('Email could not be sent'));
  }
});

/**
 * @desc    Reset password
 * @route   PUT /api/auth/resetpassword/:resettoken
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  // Get hashed token
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: resetPasswordToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json(errorResponse('Invalid or expired reset token'));
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  try {
    await emailService.sendPasswordResetConfirmation(user);
  } catch (error) {
    console.error('Confirmation email failed:', error);
  }

  sendTokenResponse(user, 200, res, 'Password reset successful');
});

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify/:token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  // Get hashed token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken
  });

  if (!user) {
    return res.status(400).json(errorResponse('Invalid verification token'));
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(successResponse('Email verified successfully'));
});

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Private
 */
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.isEmailVerified) {
    return res.status(400).json(errorResponse('Email is already verified'));
  }

  // Generate new verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await emailService.sendWelcomeEmail(user, verificationToken);
    res.status(200).json(successResponse('Verification email sent'));
  } catch (error) {
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    console.error('Email sending failed:', error);
    return res.status(500).json(errorResponse('Email could not be sent'));
  }
});

/**
 * @desc    Refresh token
 * @route   POST /api/auth/refresh
 * @access  Private
 */
const refreshToken = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  sendTokenResponse(user, 200, res, 'Token refreshed successfully');
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refreshToken
};
