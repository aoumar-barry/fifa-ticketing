const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB, mongoose } = require('../../config/db');

// mongodb-memory-server télécharge le binaire au premier run (~70 Mo).
jest.setTimeout(120000);

describe('config/db — connectDB', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
  }, 120000);

  afterAll(async () => {
    await disconnectDB();
    if (mongod) await mongod.stop();
  });

  it('throws when uri is missing', async () => {
    await expect(connectDB({})).rejects.toThrow(/COSMOS_CONNECTION_STRING is required/);
  });

  it('connects to a running MongoDB instance', async () => {
    const uri = mongod.getUri();
    await connectDB({ uri, dbName: 'fifa-ticketing-test' });
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });
});
