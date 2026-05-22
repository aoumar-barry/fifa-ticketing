const { User } = require('../models');
const { AppError } = require('../utils/AppError');

/**
 * Retrieve user profile details by ID.
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
async function getUserProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }
  return user;
}

/**
 * Update user profile details.
 * @param {string} userId 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
async function updateUserProfile(userId, { firstName, lastName, phone }) {
  if (!firstName || !firstName.trim()) {
    throw new AppError(400, 'First name is required', 'VALIDATION_ERROR');
  }
  if (!lastName || !lastName.trim()) {
    throw new AppError(400, 'Last name is required', 'VALIDATION_ERROR');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  }

  user.firstName = firstName.trim();
  user.lastName = lastName.trim();
  user.phone = phone ? phone.trim() : undefined;

  await user.save();
  return user;
}

module.exports = {
  getUserProfile,
  updateUserProfile,
};
