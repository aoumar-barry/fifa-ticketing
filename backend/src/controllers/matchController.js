const matchService = require('../services/matchService');

/**
 * GET /api/v1/matches
 */
async function listMatches(req, res, next) {
  try {
    const { teamA, teamB, stadiumId, round, date } = req.query;
    const matches = await matchService.getMatches({ teamA, teamB, stadiumId, round, date });
    res.json(matches);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/matches/:id
 */
async function getMatch(req, res, next) {
  try {
    const { id } = req.params;
    const match = await matchService.getMatchById(id);
    res.json(match);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/matches/:id/seats
 */
async function getMatchSeats(req, res, next) {
  try {
    const { id } = req.params;
    const seats = await matchService.getMatchSeats(id);
    res.json(seats);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMatches,
  getMatch,
  getMatchSeats,
};
