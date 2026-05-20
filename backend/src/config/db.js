const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

async function connectDB({ uri, dbName, logger } = {}) {
  if (!uri) {
    throw new Error('COSMOS_CONNECTION_STRING is required to connect to the database');
  }

  const connection = await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
    retryWrites: false, // Cosmos DB API Mongo ne supporte pas retryable writes
  });

  if (logger) {
    logger.info({ dbName }, '[db] connected to Cosmos DB');
  }

  mongoose.connection.on('disconnected', () => {
    if (logger) logger.warn('[db] disconnected');
  });
  mongoose.connection.on('error', (err) => {
    if (logger) logger.error({ err }, '[db] connection error');
  });

  return connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB, mongoose };
