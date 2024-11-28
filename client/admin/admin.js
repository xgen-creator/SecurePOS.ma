document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const API_URL = 'http://localhost:3000';
    let currentSection = 'dashboard';

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('href').substring(1);
            showSection(targetSection);
        });
    });

    function showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('d-none');
        });
        document.getElementById(sectionId).classList.remove('d-none');
        currentSection = sectionId;
        updateContent();
    }

    // Mise à jour du contenu
    function updateContent() {
        switch(currentSection) {
            case 'dashboard':
                updateDashboard();
                break;
            case 'users':
                updateUsers();
                break;
            case 'rules':
                updateRules();
                break;
            case 'logs':
                updateLogs();
                break;
        }
    }

    // Fonctions de mise à jour
    async function updateDashboard() {
        try {
            const [usersResponse, rulesResponse, healthResponse] = await Promise.all([
                fetch(`${API_URL}/faces`),
                fetch(`${API_URL}/automation/rules`),
                fetch(`${API_URL}/health`)
            ]);

            const users = await usersResponse.json();
            const rules = await rulesResponse.json();
            const health = await healthResponse.json();

            document.getElementById('activeUsers').textContent = users.length;
            document.getElementById('activeRules').textContent = rules.length;
            document.getElementById('systemStatus').textContent = health.status === 'ok' ? 'En ligne' : 'Hors ligne';
            document.getElementById('systemStatus').className = health.status === 'ok' ? 'online' : 'offline';

            // Simuler le nombre de détections pour la démonstration
            document.getElementById('todayDetections').textContent = Math.floor(Math.random() * 100);
        } catch (error) {
            console.error('Erreur lors de la mise à jour du tableau de bord:', error);
        }
    }

    async function updateUsers() {
        try {
            const response = await fetch(`${API_URL}/faces`);
            const users = await response.json();
            const tbody = document.getElementById('usersTable');
            tbody.innerHTML = '';

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user._id}</td>
                    <td>${user.name}</td>
                    <td>${new Date(user.lastSeen).toLocaleString()}</td>
                    <td><span class="badge ${user.isActive ? 'bg-success' : 'bg-secondary'}">${user.isActive ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-action" onclick="editUser('${user._id}')">Éditer</button>
                        <button class="btn btn-sm btn-danger btn-action" onclick="deleteUser('${user._id}')">Supprimer</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des utilisateurs:', error);
        }
    }

    async function updateRules() {
        try {
            const response = await fetch(`${API_URL}/automation/rules`);
            const rules = await response.json();
            const rulesList = document.getElementById('rulesList');
            rulesList.innerHTML = '';

            rules.forEach(rule => {
                const div = document.createElement('div');
                div.className = 'rule-card';
                div.innerHTML = `
                    <h5>${rule.name}</h5>
                    <p>${rule.description}</p>
                    <div class="form-check form-switch">
                        <input class="form-check-input" type="checkbox" id="rule-${rule._id}" ${rule.isEnabled ? 'checked' : ''}>
                        <label class="form-check-label" for="rule-${rule._id}">Activé</label>
                    </div>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-primary btn-action" onclick="editRule('${rule._id}')">Éditer</button>
                        <button class="btn btn-sm btn-danger btn-action" onclick="deleteRule('${rule._id}')">Supprimer</button>
                    </div>
                `;
                rulesList.appendChild(div);
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des règles:', error);
        }
    }

    async function updateLogs() {
        try {
            const logLevel = document.getElementById('logLevel').value;
            const response = await fetch(`${API_URL}/logs?level=${logLevel}`);
            const logs = await response.json();
            const logContainer = document.getElementById('logContainer');
            logContainer.innerHTML = '';

            logs.forEach(log => {
                const div = document.createElement('div');
                div.className = `log-entry ${log.level}`;
                div.innerHTML = `
                    <strong>${new Date(log.timestamp).toLocaleString()}</strong> - 
                    [${log.level.toUpperCase()}] ${log.message}
                `;
                logContainer.appendChild(div);
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des journaux:', error);
        }
    }

    // Gestionnaires d'événements
    document.getElementById('logLevel').addEventListener('change', updateLogs);
    document.getElementById('addRuleBtn').addEventListener('click', () => {
        // Implémenter l'ajout de règle
        console.log('Ajouter une règle');
    });

    // Mise à jour initiale
    updateContent();
    
    // Mise à jour périodique du tableau de bord
    setInterval(() => {
        if (currentSection === 'dashboard') {
            updateDashboard();
        }
    }, 5000);
});

// Fonctions globales pour les actions utilisateur
window.editUser = function(userId) {
    console.log('Éditer utilisateur:', userId);
};

window.deleteUser = function(userId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
        console.log('Supprimer utilisateur:', userId);
    }
};

window.editRule = function(ruleId) {
    console.log('Éditer règle:', ruleId);
};

window.deleteRule = function(ruleId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
        console.log('Supprimer règle:', ruleId);
    }
};
