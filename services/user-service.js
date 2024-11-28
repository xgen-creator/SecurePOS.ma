const { getFirestore } = require('firebase-admin/firestore');

class UserService {
    constructor() {
        this.db = getFirestore();
    }

    async getUserById(userId) {
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                throw new Error('Utilisateur non trouvé');
            }
            return { id: userDoc.id, ...userDoc.data() };
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            throw error;
        }
    }

    async updateUser(userId, data) {
        try {
            await this.db.collection('users').doc(userId).update(data);
            return true;
        } catch (error) {
            console.error('Erreur mise à jour utilisateur:', error);
            throw error;
        }
    }
}

module.exports = new UserService();
