require('dotenv').config();
const { loadEnv } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const { User, Stadium, Match, Seat } = require('../models');
const bcrypt = require('bcrypt');
const { logger } = require('../utils/logger');

const STADIAMS_DATA = [
  { name: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA', capacity: 71000 },
  { name: 'Gillette Stadium', city: 'Boston', country: 'USA', capacity: 65878 },
  { name: 'AT&T Stadium', city: 'Dallas', country: 'USA', capacity: 80000 },
  { name: 'NRG Stadium', city: 'Houston', country: 'USA', capacity: 72220 },
  { name: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA', capacity: 76416 },
  { name: 'SoFi Stadium', city: 'Los Angeles', country: 'USA', capacity: 70240 },
  { name: 'Hard Rock Stadium', city: 'Miami', country: 'USA', capacity: 64767 },
  { name: 'MetLife Stadium', city: 'New York/New Jersey', country: 'USA', capacity: 82500 },
  { name: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA', capacity: 69796 },
  { name: "Levi's Stadium", city: 'San Francisco Bay Area', country: 'USA', capacity: 68500 },
  { name: 'Lumen Field', city: 'Seattle', country: 'USA', capacity: 69000 },
  { name: 'Estadio Akron', city: 'Guadalajara', country: 'Mexico', capacity: 48071 },
  { name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', capacity: 87523 },
  { name: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico', capacity: 53500 },
  { name: 'BMO Field', city: 'Toronto', country: 'Canada', capacity: 45736 },
  { name: 'BC Place', city: 'Vancouver', country: 'Canada', capacity: 54500 }
];

const MATCHES_DATA = [
  // Atlanta
  { teamA: 'USA', teamB: 'Germany', date: new Date('2026-06-12T20:00:00Z'), group: 'A' },
  { teamA: 'France', teamB: 'Japan', date: new Date('2026-06-17T20:00:00Z'), group: 'A' },
  { teamA: 'Colombia', teamB: 'Senegal', date: new Date('2026-06-22T20:00:00Z'), group: 'A' },
  // Boston
  { teamA: 'Spain', teamB: 'Morocco', date: new Date('2026-06-13T20:00:00Z'), group: 'B' },
  { teamA: 'Italy', teamB: 'Australia', date: new Date('2026-06-18T20:00:00Z'), group: 'B' },
  { teamA: 'Uruguay', teamB: 'Poland', date: new Date('2026-06-23T20:00:00Z'), group: 'B' },
  // Dallas
  { teamA: 'Brazil', teamB: 'Croatia', date: new Date('2026-06-14T20:00:00Z'), group: 'C' },
  { teamA: 'Argentina', teamB: 'South Korea', date: new Date('2026-06-19T20:00:00Z'), group: 'C' },
  { teamA: 'Netherlands', teamB: 'Ecuador', date: new Date('2026-06-24T20:00:00Z'), group: 'C' },
  // Houston
  { teamA: 'England', teamB: 'Egypt', date: new Date('2026-06-12T18:00:00Z'), group: 'D' },
  { teamA: 'Belgium', teamB: 'Switzerland', date: new Date('2026-06-17T18:00:00Z'), group: 'D' },
  { teamA: 'Portugal', teamB: 'Sweden', date: new Date('2026-06-22T18:00:00Z'), group: 'D' },
  // Kansas City
  { teamA: 'Denmark', teamB: 'Ukraine', date: new Date('2026-06-13T18:00:00Z'), group: 'E' },
  { teamA: 'Turkey', teamB: 'Chile', date: new Date('2026-06-18T18:00:00Z'), group: 'E' },
  { teamA: 'USA', teamB: 'Australia', date: new Date('2026-06-23T18:00:00Z'), group: 'E' },
  // Los Angeles
  { teamA: 'Mexico', teamB: 'France', date: new Date('2026-06-14T18:00:00Z'), group: 'F' },
  { teamA: 'Germany', teamB: 'Colombia', date: new Date('2026-06-19T18:00:00Z'), group: 'F' },
  { teamA: 'Japan', teamB: 'Senegal', date: new Date('2026-06-24T18:00:00Z'), group: 'F' },
  // Miami
  { teamA: 'Spain', teamB: 'Uruguay', date: new Date('2026-06-12T16:00:00Z'), group: 'G' },
  { teamA: 'Morocco', teamB: 'Poland', date: new Date('2026-06-17T16:00:00Z'), group: 'G' },
  { teamA: 'Italy', teamB: 'Croatia', date: new Date('2026-06-22T16:00:00Z'), group: 'G' },
  // New York/New Jersey
  { teamA: 'Argentina', teamB: 'Brazil', date: new Date('2026-06-13T16:00:00Z'), group: 'H' },
  { teamA: 'Netherlands', teamB: 'England', date: new Date('2026-06-18T16:00:00Z'), group: 'H' },
  { teamA: 'Portugal', teamB: 'Belgium', date: new Date('2026-06-23T16:00:00Z'), group: 'H' },
  // Philadelphia
  { teamA: 'Egypt', teamB: 'Germany', date: new Date('2026-06-14T16:00:00Z'), group: 'I' },
  { teamA: 'France', teamB: 'Colombia', date: new Date('2026-06-19T16:00:00Z'), group: 'I' },
  { teamA: 'Japan', teamB: 'USA', date: new Date('2026-06-24T16:00:00Z'), group: 'I' },
  // San Francisco Bay Area
  { teamA: 'Senegal', teamB: 'Spain', date: new Date('2026-06-12T14:00:00Z'), group: 'J' },
  { teamA: 'Morocco', teamB: 'Italy', date: new Date('2026-06-17T14:00:00Z'), group: 'J' },
  { teamA: 'Uruguay', teamB: 'Brazil', date: new Date('2026-06-22T14:00:00Z'), group: 'J' },
  // Seattle
  { teamA: 'Croatia', teamB: 'Argentina', date: new Date('2026-06-13T14:00:00Z'), group: 'K' },
  { teamA: 'South Korea', teamB: 'Netherlands', date: new Date('2026-06-18T14:00:00Z'), group: 'K' },
  { teamA: 'Ecuador', teamB: 'England', date: new Date('2026-06-23T14:00:00Z'), group: 'K' },
  // Guadalajara
  { teamA: 'Mexico', teamB: 'Spain', date: new Date('2026-06-14T14:00:00Z'), group: 'L' },
  { teamA: 'Canada', teamB: 'Germany', date: new Date('2026-06-19T14:00:00Z'), group: 'L' },
  { teamA: 'Brazil', teamB: 'France', date: new Date('2026-06-24T14:00:00Z'), group: 'L' },
  // Mexico City
  { teamA: 'Mexico', teamB: 'Italy', date: new Date('2026-06-12T12:00:00Z'), group: 'F' },
  { teamA: 'Argentina', teamB: 'England', date: new Date('2026-06-17T12:00:00Z'), group: 'F' },
  { teamA: 'Portugal', teamB: 'Germany', date: new Date('2026-06-22T12:00:00Z'), group: 'F' },
  // Monterrey
  { teamA: 'Spain', teamB: 'Netherlands', date: new Date('2026-06-13T12:00:00Z'), group: 'G' },
  { teamA: 'Colombia', teamB: 'Uruguay', date: new Date('2026-06-18T12:00:00Z'), group: 'G' },
  { teamA: 'Belgium', teamB: 'Croatia', date: new Date('2026-06-23T12:00:00Z'), group: 'G' },
  // Toronto
  { teamA: 'Canada', teamB: 'France', date: new Date('2026-06-14T12:00:00Z'), group: 'H' },
  { teamA: 'Japan', teamB: 'Argentina', date: new Date('2026-06-19T12:00:00Z'), group: 'H' },
  { teamA: 'USA', teamB: 'Brazil', date: new Date('2026-06-24T12:00:00Z'), group: 'H' },
  // Vancouver
  { teamA: 'Canada', teamB: 'Japan', date: new Date('2026-06-12T10:00:00Z'), group: 'I' },
  { teamA: 'Germany', teamB: 'Italy', date: new Date('2026-06-17T10:00:00Z'), group: 'I' },
  { teamA: 'Spain', teamB: 'Portugal', date: new Date('2026-06-22T10:00:00Z'), group: 'I' }
];

async function seed(options = {}) {
  const env = loadEnv(options.env || process.env);
  const connString = options.uri || env.COSMOS_CONNECTION_STRING;
  const dbName = options.dbName || env.COSMOS_DB_NAME;

  if (!connString) {
    throw new Error('COSMOS_CONNECTION_STRING is required to run the seed script');
  }

  logger.info('[seed] Connecting to database...');
  await connectDB({ uri: connString, dbName, logger });

  try {
    // 1. Purge
    logger.info('[seed] Purging collections (Stadium, Match, Seat)...');
    await Stadium.deleteMany({});
    await Match.deleteMany({});
    await Seat.deleteMany({});

    // Supprimer l'admin existant pour ré-import propre
    logger.info('[seed] Deleting default admin if exists...');
    await User.deleteOne({ email: 'admin@fifa.com' });

    // 2. Insert Stadiums
    logger.info('[seed] Inserting stadiums...');
    const createdStadiums = await Stadium.insertMany(STADIAMS_DATA);
    logger.info(`[seed] Created ${createdStadiums.length} stadiums`);

    // Dictionnaire pour retrouver les stades par nom
    const stadiumMap = {};
    createdStadiums.forEach((s) => {
      stadiumMap[s.name] = s._id;
    });

    // 3. Generate and Insert Seats (120 per stadium)
    logger.info('[seed] Generating seats for each stadium...');
    const allSeats = [];
    
    for (const stadium of createdStadiums) {
      // Catégorie A (40 places)
      for (let i = 1; i <= 40; i++) {
        const row = String.fromCharCode(65 + Math.floor((i - 1) / 10)); // A, B, C, D
        const num = ((i - 1) % 10) + 1;
        allSeats.push({
          stadiumId: stadium._id,
          section: 'A1',
          row,
          number: num,
          category: 'A',
          price: 150,
          status: 'available'
        });
      }

      // Catégorie B (40 places)
      for (let i = 1; i <= 40; i++) {
        const row = String.fromCharCode(69 + Math.floor((i - 1) / 10)); // E, F, G, H
        const num = ((i - 1) % 10) + 1;
        allSeats.push({
          stadiumId: stadium._id,
          section: 'B1',
          row,
          number: num,
          category: 'B',
          price: 100,
          status: 'available'
        });
      }

      // Catégorie C (40 places)
      for (let i = 1; i <= 40; i++) {
        const row = String.fromCharCode(73 + Math.floor((i - 1) / 10)); // I, J, K, L
        const num = ((i - 1) % 10) + 1;
        allSeats.push({
          stadiumId: stadium._id,
          section: 'C1',
          row,
          number: num,
          category: 'C',
          price: 50,
          status: 'available'
        });
      }
    }

    logger.info(`[seed] Inserting ${allSeats.length} seats...`);
    await Seat.insertMany(allSeats);
    logger.info('[seed] Seats inserted successfully');

    // 4. Insert Matches
    logger.info('[seed] Inserting matches...');
    const matchesToInsert = MATCHES_DATA.map((match, index) => {
      // Les matchs sont répartis séquentiellement sur les 16 stades (3 matchs par stade)
      const stadiumIndex = Math.floor(index / 3);
      const stadium = createdStadiums[stadiumIndex];
      
      if (!stadium) {
        throw new Error(`No stadium found for match index ${index}`);
      }

      return {
        teamA: match.teamA,
        teamB: match.teamB,
        round: 'group',
        group: match.group,
        date: match.date,
        stadiumId: stadium._id,
        totalSeats: 120,
        availableSeats: 120,
        isActive: true
      };
    });

    const createdMatches = await Match.insertMany(matchesToInsert);
    logger.info(`[seed] Created ${createdMatches.length} matches`);

    // 5. Create default admin
    logger.info('[seed] Creating default admin user...');
    const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
    const adminUser = await User.create({
      email: 'admin@fifa.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'FIFA',
      role: 'admin',
      isVerified: true
    });
    logger.info(`[seed] Default admin created: ${adminUser.email}`);

    logger.info('[seed] Seeding database successfully completed!');
  } catch (err) {
    logger.error({ err }, '[seed] Error during seeding database');
    throw err;
  } finally {
    await disconnectDB();
    logger.info('[seed] Disconnected from database');
  }
}

// Executed directly
if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed, STADIAMS_DATA, MATCHES_DATA };
