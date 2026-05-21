const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { seed, STADIUMS_DATA } = require('../../scripts/seed');
const { User, Stadium, Match, Seat } = require('../../models');
const bcrypt = require('bcrypt');

jest.setTimeout(120000);

describe('scripts/seed.js — database seeding', () => {
  let mongod;
  let uri;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
  }, 120000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await Promise.all([
        User.deleteMany({}),
        Stadium.deleteMany({}),
        Match.deleteMany({}),
        Seat.deleteMany({}),
      ]);
    }
  });

  it('seeds stadiums, matches, seats and admin user successfully', async () => {
    await seed({
      uri,
      dbName: 'fifa-ticketing-test',
      env: {
        NODE_ENV: 'test',
        COSMOS_CONNECTION_STRING: uri,
        COSMOS_DB_NAME: 'fifa-ticketing-test',
      },
    });

    await mongoose.connect(uri, { dbName: 'fifa-ticketing-test' });

    // Vérifier les Stades
    const stadiums = await Stadium.find({});
    expect(stadiums).toHaveLength(16);
    expect(stadiums[0].name).toBe(STADIUMS_DATA[0].name);
    expect(stadiums[0].capacity).toBe(STADIUMS_DATA[0].capacity);

    // Vérifier les Matchs
    const matches = await Match.find({});
    expect(matches).toHaveLength(48);
    expect(matches[0].round).toBe('group');
    expect(matches[0].totalSeats).toBe(120);
    expect(matches[0].availableSeats).toBe(120);

    // Vérifier les Sièges
    const seats = await Seat.find({});
    expect(seats).toHaveLength(16 * 120); // 1920 seats

    // Vérifier les catégories et les prix
    const catASeats = await Seat.find({ category: 'A' });
    expect(catASeats).toHaveLength(16 * 40);
    expect(catASeats[0].price).toBe(150);

    const catBSeats = await Seat.find({ category: 'B' });
    expect(catBSeats).toHaveLength(16 * 40);
    expect(catBSeats[0].price).toBe(100);

    const catCSeats = await Seat.find({ category: 'C' });
    expect(catCSeats).toHaveLength(16 * 40);
    expect(catCSeats[0].price).toBe(50);

    // Vérifier l'Admin
    const admin = await User.findOne({ email: 'admin@fifa.com' });
    expect(admin).not.toBeNull();
    expect(admin.role).toBe('admin');
    expect(admin.isVerified).toBe(true);
    expect(admin.firstName).toBe('Admin');
    expect(admin.lastName).toBe('FIFA');
    
    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare('AdminPassword123!', admin.passwordHash);
    expect(passwordMatch).toBe(true);
  });

  it('is idempotent and can run multiple times without duplicating data', async () => {
    await seed({
      uri,
      dbName: 'fifa-ticketing-test',
      env: {
        NODE_ENV: 'test',
        COSMOS_CONNECTION_STRING: uri,
        COSMOS_DB_NAME: 'fifa-ticketing-test',
      },
    });

    await seed({
      uri,
      dbName: 'fifa-ticketing-test',
      env: {
        NODE_ENV: 'test',
        COSMOS_CONNECTION_STRING: uri,
        COSMOS_DB_NAME: 'fifa-ticketing-test',
      },
    });

    await mongoose.connect(uri, { dbName: 'fifa-ticketing-test' });

    const stadiums = await Stadium.countDocuments({});
    expect(stadiums).toBe(16);

    const matches = await Match.countDocuments({});
    expect(matches).toBe(48);

    const seats = await Seat.countDocuments({});
    expect(seats).toBe(1920);

    const admins = await User.countDocuments({ email: 'admin@fifa.com' });
    expect(admins).toBe(1);
  });
});
