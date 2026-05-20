const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const {
  User,
  Stadium,
  Match,
  Seat,
  Cart,
  Order,
  Ticket,
  Payment,
} = require('../../models');

jest.setTimeout(120000);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'fifa-ticketing-test' });
  // Force la création des index (TTL, unique, composés) avant les tests.
  await Promise.all(
    [User, Stadium, Match, Seat, Cart, Order, Ticket, Payment].map((M) => M.syncIndexes()),
  );
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await Promise.all(
    [User, Stadium, Match, Seat, Cart, Order, Ticket, Payment].map((M) => M.deleteMany({})),
  );
});

const objectId = () => new mongoose.Types.ObjectId();

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
describe('User model', () => {
  const validUser = () => ({
    email: 'JOHN@TEST.com',
    passwordHash: 'hash',
    firstName: 'John',
    lastName: 'Doe',
  });

  it('creates a user and lowercases email', async () => {
    const u = await User.create(validUser());
    expect(u.email).toBe('john@test.com');
    expect(u.role).toBe('user');
    expect(u.isVerified).toBe(false);
  });

  it('rejects missing required fields', async () => {
    await expect(User.create({ email: 'a@b.c' })).rejects.toThrow();
  });

  it('enforces email uniqueness', async () => {
    await User.create(validUser());
    await expect(User.create(validUser())).rejects.toThrow(/duplicate key/i);
  });

  it('rejects invalid role enum', async () => {
    const u = new User({ ...validUser(), role: 'superadmin' });
    await expect(u.validate()).rejects.toThrow();
  });

  it('hides sensitive fields in toJSON', async () => {
    const u = await User.create({ ...validUser(), otpCode: '123456' });
    const json = u.toJSON();
    expect(json.passwordHash).toBeUndefined();
    expect(json.otpCode).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Stadium
// ---------------------------------------------------------------------------
describe('Stadium model', () => {
  it('creates a stadium with required fields', async () => {
    const s = await Stadium.create({
      name: 'MetLife',
      city: 'New York',
      country: 'USA',
      capacity: 82500,
    });
    expect(s.name).toBe('MetLife');
  });

  it('rejects capacity < 1', async () => {
    const s = new Stadium({ name: 'X', city: 'Y', country: 'Z', capacity: 0 });
    await expect(s.validate()).rejects.toThrow();
  });

  it('rejects missing fields', async () => {
    await expect(Stadium.create({ name: 'X' })).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------
describe('Match model', () => {
  const validMatch = () => ({
    teamA: 'France',
    teamB: 'Brésil',
    round: 'group',
    date: new Date('2026-06-12T18:00:00Z'),
    stadiumId: objectId(),
    totalSeats: 80000,
    availableSeats: 80000,
  });

  it('creates a match with required fields', async () => {
    const m = await Match.create(validMatch());
    expect(m.isActive).toBe(true);
  });

  it('rejects invalid round enum', async () => {
    const m = new Match({ ...validMatch(), round: 'eighth' });
    await expect(m.validate()).rejects.toThrow();
  });

  it('rejects negative availableSeats', async () => {
    const m = new Match({ ...validMatch(), availableSeats: -1 });
    await expect(m.validate()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Seat
// ---------------------------------------------------------------------------
describe('Seat model', () => {
  const validSeat = (overrides = {}) => ({
    stadiumId: objectId(),
    section: 'A',
    row: '12',
    number: 7,
    category: 'A',
    price: 280,
    ...overrides,
  });

  it('creates a seat with default status available', async () => {
    const s = await Seat.create(validSeat());
    expect(s.status).toBe('available');
  });

  it('rejects invalid category enum', async () => {
    const s = new Seat({ ...validSeat(), category: 'Z' });
    await expect(s.validate()).rejects.toThrow();
  });

  it('rejects invalid status enum', async () => {
    const s = new Seat({ ...validSeat(), status: 'booked' });
    await expect(s.validate()).rejects.toThrow();
  });

  it('enforces composite uniqueness (stadium, section, row, number)', async () => {
    const stadiumId = objectId();
    await Seat.create(validSeat({ stadiumId }));
    await expect(Seat.create(validSeat({ stadiumId }))).rejects.toThrow(/duplicate key/i);
  });

  it('allows same seat number in different stadiums', async () => {
    await Seat.create(validSeat({ stadiumId: objectId() }));
    await expect(Seat.create(validSeat({ stadiumId: objectId() }))).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Cart (TTL index — point clé de la TASK-002)
// ---------------------------------------------------------------------------
describe('Cart model', () => {
  it('creates a cart with default status active', async () => {
    const c = await Cart.create({
      userId: objectId(),
      expiresAt: new Date(Date.now() + 600_000),
      items: [{ matchId: objectId(), seatId: objectId(), price: 100 }],
    });
    expect(c.status).toBe('active');
    expect(c.items).toHaveLength(1);
  });

  it('rejects missing expiresAt', async () => {
    await expect(
      Cart.create({ userId: objectId(), items: [] }),
    ).rejects.toThrow();
  });

  it('declares a TTL index on expiresAt with expireAfterSeconds=0', async () => {
    const indexes = await Cart.collection.indexes();
    const ttl = indexes.find((i) => i.expireAfterSeconds !== undefined);
    expect(ttl).toBeDefined();
    expect(ttl.expireAfterSeconds).toBe(0);
    expect(ttl.key).toEqual({ expiresAt: 1 });
  });

  it('rejects invalid status enum', async () => {
    const c = new Cart({
      userId: objectId(),
      expiresAt: new Date(Date.now() + 600_000),
      status: 'paid',
    });
    await expect(c.validate()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Order
// ---------------------------------------------------------------------------
describe('Order model', () => {
  it('creates an order with default status pending', async () => {
    const o = await Order.create({ userId: objectId(), totalAmount: 280 });
    expect(o.status).toBe('pending');
  });

  it('rejects negative totalAmount', async () => {
    const o = new Order({ userId: objectId(), totalAmount: -1 });
    await expect(o.validate()).rejects.toThrow();
  });

  it('rejects invalid status enum', async () => {
    const o = new Order({ userId: objectId(), totalAmount: 10, status: 'refunded' });
    await expect(o.validate()).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Ticket
// ---------------------------------------------------------------------------
describe('Ticket model', () => {
  const validTicket = (overrides = {}) => ({
    orderId: objectId(),
    matchId: objectId(),
    seatId: objectId(),
    userId: objectId(),
    qrCode: '00000000-0000-4000-8000-000000000001',
    ...overrides,
  });

  it('creates a ticket with default status valid', async () => {
    const t = await Ticket.create(validTicket());
    expect(t.status).toBe('valid');
  });

  it('enforces qrCode uniqueness', async () => {
    await Ticket.create(validTicket());
    await expect(Ticket.create(validTicket())).rejects.toThrow(/duplicate key/i);
  });

  it('rejects missing qrCode', async () => {
    const { qrCode: _ignored, ...rest } = validTicket();
    await expect(Ticket.create(rest)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------
describe('Payment model', () => {
  const validPayment = (overrides = {}) => ({
    orderId: objectId(),
    amount: 280,
    status: 'pending',
    ...overrides,
  });

  it('creates a payment with default currency usd and method STRIPE', async () => {
    const p = await Payment.create(validPayment());
    expect(p.currency).toBe('usd');
    expect(p.method).toBe('STRIPE');
  });

  it('rejects invalid status enum', async () => {
    const p = new Payment({ ...validPayment(), status: 'refunded' });
    await expect(p.validate()).rejects.toThrow();
  });

  it('rejects negative amount', async () => {
    const p = new Payment({ ...validPayment(), amount: -10 });
    await expect(p.validate()).rejects.toThrow();
  });
});
