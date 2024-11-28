const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
    constructor() {
        this.client = redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retry_strategy: function(options) {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    return new Error('Le serveur Redis a refusé la connexion');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    return new Error('Délai de nouvelle tentative dépassé');
                }
                if (options.attempt > 10) {
                    return undefined;
                }
                return Math.min(options.attempt * 100, 3000);
            }
        });

        this.client.on('error', (err) => console.error('Erreur Redis:', err));
        this.client.on('connect', () => console.log('Connecté à Redis'));

        // Promisify Redis methods
        this.get = promisify(this.client.get).bind(this.client);
        this.set = promisify(this.client.set).bind(this.client);
        this.del = promisify(this.client.del).bind(this.client);
        this.incr = promisify(this.client.incr).bind(this.client);
        this.expire = promisify(this.client.expire).bind(this.client);
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.client.on('ready', () => {
                console.log('Redis prêt');
                resolve();
            });
            this.client.on('error', (err) => {
                console.error('Erreur connexion Redis:', err);
                reject(err);
            });
        });
    }

    async disconnect() {
        return new Promise((resolve) => {
            this.client.quit(() => {
                console.log('Déconnecté de Redis');
                resolve();
            });
        });
    }
}

module.exports = new RedisClient();
