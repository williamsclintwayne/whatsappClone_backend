/**
 * Utility functions for various operations
 */

/**
 * Create a standardized API response
 */
const createResponse = (status, message, data = null, errors = null) => {
  const response = {
    status,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) {
    response.data = data;
  }

  if (errors !== null) {
    response.errors = errors;
  }

  return response;
};

/**
 * Create success response
 */
const successResponse = (message, data = null) => {
  return createResponse('success', message, data);
};

/**
 * Create error response
 */
const errorResponse = (message, errors = null) => {
  return createResponse('error', message, null, errors);
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Pagination helper
 */
const paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    limit: parseInt(limit)
  };
};

/**
 * Generate pagination metadata
 */
const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: parseInt(page),
    totalPages,
    totalResults: total,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
};

/**
 * Remove sensitive fields from user object
 */
const sanitizeUser = (user) => {
  const sanitized = user.toObject ? user.toObject() : user;
  delete sanitized.password;
  delete sanitized.passwordResetToken;
  delete sanitized.passwordResetExpires;
  delete sanitized.emailVerificationToken;
  return sanitized;
};

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  const mongoose = require('mongoose');
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  const now = new Date();
  const messageDate = new Date(date);
  const diff = now.getTime() - messageDate.getTime();
  
  // Less than 1 minute
  if (diff < 60000) {
    return 'now';
  }
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  // More than 7 days, show actual date
  return messageDate.toLocaleDateString();
};

/**
 * Escape regex special characters
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Check if user is online (last seen within 5 minutes)
 */
const isUserOnline = (lastSeen) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return new Date(lastSeen) > fiveMinutesAgo;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate conversation ID for two users
 */
const generateConversationId = (userId1, userId2) => {
  return [userId1, userId2].sort().join('-');
};

/**
 * Mask sensitive data in logs
 */
const maskSensitiveData = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key'];
  const masked = { ...data };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***masked***';
    }
  }

  return masked;
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if string contains emoji
 */
const containsEmoji = (text) => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(text);
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse,
  asyncHandler,
  paginate,
  getPaginationMeta,
  sanitizeUser,
  generateRandomString,
  isValidObjectId,
  formatDate,
  escapeRegex,
  isUserOnline,
  isValidEmail,
  generateConversationId,
  maskSensitiveData,
  deepClone,
  containsEmoji
};
