const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Payments use MongoDB transactions, which require a replica set
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);

  console.log('Test database connected');
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();

  // Stop the in-memory database
  if (mongoServer) {
    await mongoServer.stop();
  }

  console.log('Test database disconnected');
});
