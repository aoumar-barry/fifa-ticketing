const mongoose = require('mongoose');
const { Match, Stadium, Seat, Ticket } = require('../models');
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
 * Retrieve all matches (active and inactive).
 */
async function getAllMatches() {
  const matches = await Match.find({}).populate('stadiumId');
  return matches.map(formatMatch);
}

/**
 * Create a new match.
 */
async function createMatch(matchData) {
  const { teamA, teamB, round, group, date, stadiumId } = matchData;

  if (!mongoose.Types.ObjectId.isValid(stadiumId)) {
    throw new AppError(400, 'Invalid stadium ID format', 'INVALID_INPUT');
  }

  const stadium = await Stadium.findById(stadiumId);
  if (!stadium) {
    throw new AppError(404, 'Stadium not found', 'STADIUM_NOT_FOUND');
  }

  // Count registered seats for the stadium to set capacity automatically
  const seatCount = await Seat.countDocuments({ stadiumId });
  const capacity = seatCount > 0 ? seatCount : 120; // fallback to default/seed behavior if no seats generated

  const match = await Match.create({
    teamA,
    teamB,
    round,
    group,
    date: new Date(date),
    stadiumId,
    totalSeats: capacity,
    availableSeats: capacity,
    isActive: true,
  });

  await match.populate('stadiumId');
  return formatMatch(match);
}

/**
 * Update an existing match.
 */
async function updateMatch(id, matchData) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid match ID format', 'INVALID_INPUT');
  }

  const match = await Match.findById(id);
  if (!match) {
    throw new AppError(404, 'Match not found', 'MATCH_NOT_FOUND');
  }

  // If stadium is being updated
  if (matchData.stadiumId !== undefined && matchData.stadiumId.toString() !== match.stadiumId.toString()) {
    if (!mongoose.Types.ObjectId.isValid(matchData.stadiumId)) {
      throw new AppError(400, 'Invalid stadium ID format', 'INVALID_INPUT');
    }

    const newStadium = await Stadium.findById(matchData.stadiumId);
    if (!newStadium) {
      throw new AppError(404, 'Stadium not found', 'STADIUM_NOT_FOUND');
    }

    // Check if tickets are already sold for this match.
    // If tickets are already sold, stadium modification is rejected to avoid seat mismatches.
    const soldTicketsCount = await Ticket.countDocuments({ matchId: id, status: 'valid' });
    if (soldTicketsCount > 0) {
      throw new AppError(400, 'Cannot change stadium because tickets have already been sold for this match', 'STADIUM_CHANGE_FORBIDDEN');
    }

    // Recalculate capacity based on new stadium's seats
    const seatCount = await Seat.countDocuments({ stadiumId: matchData.stadiumId });
    const capacity = seatCount > 0 ? seatCount : 120;

    match.stadiumId = matchData.stadiumId;
    match.totalSeats = capacity;
    match.availableSeats = capacity;
  } else if (matchData.totalSeats !== undefined) {
    // If capacity is manually adjusted, re-evaluate available seats
    const soldTicketsCount = await Ticket.countDocuments({ matchId: id, status: 'valid' });
    match.totalSeats = matchData.totalSeats;
    match.availableSeats = Math.max(0, matchData.totalSeats - soldTicketsCount);
  }

  // Update other fields
  if (matchData.teamA !== undefined) match.teamA = matchData.teamA;
  if (matchData.teamB !== undefined) match.teamB = matchData.teamB;
  if (matchData.round !== undefined) match.round = matchData.round;
  if (matchData.group !== undefined) match.group = matchData.group;
  if (matchData.date !== undefined) match.date = new Date(matchData.date);
  if (matchData.isActive !== undefined) match.isActive = matchData.isActive;

  await match.save();
  await match.populate('stadiumId');
  return formatMatch(match);
}

/**
 * Deactivate a match (soft-delete).
 */
async function deactivateMatch(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, 'Invalid match ID format', 'INVALID_INPUT');
  }

  const match = await Match.findById(id);
  if (!match) {
    throw new AppError(404, 'Match not found', 'MATCH_NOT_FOUND');
  }

  match.isActive = false;
  await match.save();
  await match.populate('stadiumId');
  return formatMatch(match);
}

/**
 * Retrieve all stadiums.
 */
async function getAllStadiums() {
  return Stadium.find({}).sort({ name: 1 });
}

module.exports = {
  getAllMatches,
  createMatch,
  updateMatch,
  deactivateMatch,
  getAllStadiums,
};
