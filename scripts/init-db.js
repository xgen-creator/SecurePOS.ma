db = db.getSiblingDB('scanbell_security');

// Création des collections
db.createCollection('users');
db.createCollection('sessions');
db.createCollection('security_alerts');

// Création des index
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.sessions.createIndex({ "userId": 1 });
db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });
db.security_alerts.createIndex({ "userId": 1, "createdAt": -1 });

// Création d'un utilisateur admin initial
db.users.insertOne({
    username: "admin",
    email: "admin@scanbell.com",
    password: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewE.GAeUNTtKJ/Xy", // Password: admin123!
    role: "admin",
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date()
});
