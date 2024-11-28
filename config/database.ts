export const databaseConfig = {
  // Configuration MongoDB
  mongodb: {
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
    name: process.env.DB_NAME || 'scanbell_security',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority'
    }
  },

  // Configuration Redis (pour les sessions et le cache)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0')
  },

  // Options de connexion
  connectionRetries: 5,
  retryInterval: 5000, // 5 secondes
  
  // Options de sécurité
  ssl: process.env.DB_SSL === 'true',
  sslValidate: process.env.DB_SSL_VALIDATE === 'true',
  
  // Options de performance
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000
};
