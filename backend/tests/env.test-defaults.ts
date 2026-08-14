// Loaded before anything else in tests/setup.ts. Provides safe fake values so
// backend/src/config/env.ts's zod validation passes without a real .env file.
process.env.NODE_ENV = "test";
process.env.APP_URL = "http://localhost:4000";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.API_URL = "http://localhost:4000/api/v1";
process.env.JWT_SECRET = "test-jwt-secret-please-do-not-use-in-prod";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-please-do-not-use-in-prod";
process.env.CREDENTIALS_ENCRYPTION_KEY = "test-encryption-key-32-bytes-min!!";
process.env.REDIS_URL = "redis://localhost:6379";
// A syntactically valid placeholder - env.ts only validates it's a non-empty string.
// The real connection in tests goes to mongodb-memory-server, set up explicitly in tests/setup.ts,
// independent of this value (createApp() never calls connectDatabase() itself - server.ts does).
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/cymor_test_placeholder";
