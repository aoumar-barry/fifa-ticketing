const { z } = require('zod');
const adminService = require('../services/adminService');
const { AppError } = require('../utils/AppError');

// Zod schemas for input validation
const createMatchSchema = z.object({
  teamA: z.string().min(1, 'teamA is required').trim(),
  teamB: z.string().min(1, 'teamB is required').trim(),
  round: z.enum(['group', 'round16', 'quarter', 'semi', 'final'], {
    errorMap: () => ({ message: "round must be one of: 'group', 'round16', 'quarter', 'semi', 'final'" })
  }),
  group: z.string().trim().optional().nullable(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  stadiumId: z.string().length(24, 'stadiumId must be a 24-character hex string'),
});

const updateMatchSchema = z.object({
  teamA: z.string().min(1).trim().optional(),
  teamB: z.string().min(1).trim().optional(),
  round: z.enum(['group', 'round16', 'quarter', 'semi', 'final']).optional(),
  group: z.string().trim().optional().nullable(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }).optional(),
  stadiumId: z.string().length(24, 'stadiumId must be a 24-character hex string').optional(),
  totalSeats: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/v1/admin/matches
 */
async function getAllMatches(req, res, next) {
  try {
    const matches = await adminService.getAllMatches();
    res.json(matches);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/matches
 */
async function createMatch(req, res, next) {
  try {
    const parsed = createMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new AppError(400, errorMsg, 'VALIDATION_ERROR');
    }

    const match = await adminService.createMatch(parsed.data);
    res.status(201).json(match);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/matches/:id
 */
async function updateMatch(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = updateMatchSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      throw new AppError(400, errorMsg, 'VALIDATION_ERROR');
    }

    const match = await adminService.updateMatch(id, parsed.data);
    res.json(match);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/matches/:id
 */
async function deactivateMatch(req, res, next) {
  try {
    const { id } = req.params;
    const match = await adminService.deactivateMatch(id);
    res.json(match);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllMatches,
  createMatch,
  updateMatch,
  deactivateMatch,
};
