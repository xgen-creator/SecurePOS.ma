const axios = require('axios');

const API_URL = 'http://localhost:3000';
let authToken = '';

async function runTests() {
    try {
        console.log('🚀 Démarrage des tests API...\n');

        // Test 1: Route publique
        console.log('1️⃣ Test de la route publique');
        const publicResponse = await axios.get(`${API_URL}/test/public`);
        console.log('✅ Route publique OK:', publicResponse.data);

        // Test 2: Connexion admin
        console.log('\n2️⃣ Test de connexion admin');
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@scanbell.com',
            password: 'admin123!'
        });
        authToken = loginResponse.data.accessToken;
        console.log('✅ Connexion OK:', loginResponse.data.user);

        // Test 3: Route protégée
        console.log('\n3️⃣ Test de la route protégée');
        const protectedResponse = await axios.get(`${API_URL}/test/protected`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Route protégée OK:', protectedResponse.data);

        // Test 4: Route admin
        console.log('\n4️⃣ Test de la route admin');
        const adminResponse = await axios.get(`${API_URL}/test/admin`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Route admin OK:', adminResponse.data);

        // Test 5: Informations de session
        console.log('\n5️⃣ Test des informations de session');
        const sessionResponse = await axios.get(`${API_URL}/test/session-info`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Informations de session OK:', sessionResponse.data);

        // Test 6: Création d'alerte
        console.log('\n6️⃣ Test de création d\'alerte');
        const alertResponse = await axios.post(`${API_URL}/test/trigger-alert`, {}, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ Création d\'alerte OK:', alertResponse.data);

        console.log('\n✨ Tous les tests ont réussi!');
    } catch (error) {
        console.error('\n❌ Erreur pendant les tests:', error.response?.data || error.message);
    }
}

runTests();
