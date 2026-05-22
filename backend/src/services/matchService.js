const mongoose = require('mongoose');
const { Match, Seat, Ticket } = require('../models');
const { getRedisClient } = require('../config/redis');
const { AppError } = require('../utils/AppError');

/**
 * Format a match document to the API contract.
 */
function formatMatch(m) {
  return {
    id: m._id,
    teamA: m.teamA,
    teamB: m.teamB,
    round: m.round,
    group: m.group,
    date: m.date,
    stadium: m.stadiumId ? {
      id: m.stadiumId._id,
      name: m.stadiumId.name,
      city: m.stadiumId.city,
      country: m.stadiumId.country,
    } : null,
    availableSeats: m.availableSeats,
    totalSeats: m.totalSeats,
    isActive: m.isActive,
  };
}

/**
 * Get all active matches matching optional filters.
 */
async function getMatches(filters = {}) {
  const query = { isActive: true };

  if (filters.teamA) {
    query.teamA = filters.teamA;
  }
  if (filters.teamB) {
    query.teamB = filters.teamB;
  }
  if (filters.stadiumId) {
    if (!mongoose.Types.ObjectId.isValid(filters.stadiumId)) {
      throw new AppError(400, 'Invalid stadiumId format', 'INVALID_INPUT');
    }
    query.stadiumId = filters.stadiumId;
  }
  if (filters.round) {
    query.round = filters.round;
  }
  if (filters.date) {
    const dateStr = filters.date;
    const start = new Date(dateStr);
    if (isNaN(start.getTime())) {
      throw new AppError(400, 'Invalid date format', 'INVALID_INPUT');
    }
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setUTCHours(23, 59, 59, 999);
    query.date = { $gte: start, $lte: end };
  }

  const matches = await Match.find(query).populate('stadiumId');
  return matches.map(formatMatch);
}

/**
 * Get match details by ID.
 */
async function getMatchById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid match ID format', 'INVALID_INPUT');
  }

  const match = await Match.findOne({ _id: id, isActive: true }).populate('stadiumId');
  if (!match) {
    throw new AppError(404, 'Match not found', 'MATCH_NOT_FOUND');
  }

  return formatMatch(match);
}

/**
 * Get seats and their status for a specific match.
 */
async function getMatchSeats(matchId) {
  if (!mongoose.Types.ObjectId.isValid(matchId)) {
    throw new AppError(400, 'Invalid match ID format', 'INVALID_INPUT');
  }

  const match = await Match.findOne({ _id: matchId, isActive: true });
  if (!match) {
    throw new AppError(404, 'Match not found', 'MATCH_NOT_FOUND');
  }

  // 1. Fetch all seats for the stadium of the match
  const seats = await Seat.find({ stadiumId: match.stadiumId });

  // 2. Fetch all valid tickets for this match
  const tickets = await Ticket.find({ matchId, status: 'valid' });
  const soldSeatIds = new Set(tickets.map(t => t.seatId.toString()));

  // 3. Fetch locks from Redis (in bulk)
  let locks = [];
  try {
    const redis = getRedisClient();
    if (redis && seats.length > 0) {
      const keys = seats.map(s => `seat:${s._id}`);
      locks = await redis.mget(keys);
    }
  } catch {
    // Fail-safe if Redis client is not configured or fails
    // In production, we log, but do not block the request
  }

  // 4. Map seats to format
  return seats.map((s, idx) => {
    let status = 'available';
    if (soldSeatIds.has(s._id.toString())) {
      status = 'sold';
    } else if (locks[idx]) {
      status = 'locked';
    }

    return {
      id: s._id,
      section: s.section,
      row: s.row,
      number: s.number,
      category: s.category,
      price: s.price,
      status,
    };
  });
}

module.exports = {
  getMatches,
  getMatchById,
  getMatchSeats,
};
