const { z } = require('zod');
const userService = require('../services/userService');
const { AppError } = require('../utils/AppError');

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().trim().optional().nullable(),
});

/**
 * GET /api/v1/users/profile
 */
async function getProfile(req, res, next) {
  try {
    if (!req.user || !req.user._id) {
      throw new AppError(401, 'Access token is required', 'UNAUTHORIZED');
    }
    const user = await userService.getUserProfile(req.user._id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/users/profile
 */
async function updateProfile(req, res, next) {
  try {
    if (!req.user || !req.user._id) {
      throw new AppError(401, 'Access token is required', 'UNAUTHORIZED');
    }

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new AppError(400, errorMsg, 'VALIDATION_ERROR');
    }

    const updatedUser = await userService.updateUserProfile(req.user._id, parsed.data);
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};
