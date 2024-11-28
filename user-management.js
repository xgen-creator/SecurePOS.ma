// userManagementService.js
class UserManagementService {
  constructor() {
    this.users = new Map();
    this.roles = new Map();
    this.permissions = new Map();
    this.sessions = new Map();
  }

  async createUser(userData) {
    const userId = this.generateUserId();
    
    const user = {
      id: userId,
      ...userData,
      status: 'active',
      created: new Date(),
      lastLogin: null,
      roles: ['user'],
      permissions: [],
      devices: []
    };

    // Valider les données utilisateur
    await this.validateUserData(user);

    // Hasher le mot de passe
    user.password = await this.hashPassword(userData.password);

    // Sauvegarder l'utilisateur
    await this.saveUser(user);

    // Créer la session initiale
    const session = await this.createUserSession(user);

    return {
      userId,
      session
    };
  }

  async assignRole(userId, roleId) {
    const user = await this.getUser(userId);
    const role = await this.getRole(roleId);

    // Vérifier les conflits de rôles
    await this.checkRoleConflicts(user, role);

    // Ajouter le rôle
    user.roles.push(roleId);
    
    // Mettre à jour les permissions
    await this.updateUserPermissions(user);

    return await this.saveUser(user);
  }

  async createRole(roleData) {
    const roleId = this.generateRoleId();
    
    const role = {
      id: roleId,
      ...roleData,
      permissions: [],
      created: new Date(),
      lastModified: new Date()
    };

    // Valider le rôle
    await this.validateRole(role);

    // Sauvegarder le rôle
    await this.saveRole(role);

    return roleId;
  }

  async validateUserAccess(userId, resourceId, permission) {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    // Vérifier les permissions directes
    if (user.permissions.includes(permission)) return true;

    // Vérifier les permissions basées sur les rôles
    for (const roleId of user.roles) {
      const role = await this.getRole(roleId);
      if (role.permissions.includes(permission)) return true;
    }

    return false;
  }

  async updateUserStatus(userId, status, reason) {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Utilisateur non trouvé');

    user.status = status;
    user.statusReason = reason;
    user.lastModified = new Date();

    if (status === 'inactive') {
      await this.terminateUserSessions(userId);
    }

    return await this.saveUser(user);
  }

  async handleAuthenticationAttempt(credentials) {
    const { email, password } = credentials;
    const user = await this.getUserByEmail(email);

    if (!user || !(await this.verifyPassword(password, user.password))) {
      throw new Error('Identifiants invalides');
    }

    // Vérifier le statut du compte
    if (user.status !== 'active') {
      throw new Error(`Compte ${user.status}`);
    }

    // Créer une nouvelle session
    const session = await this.createUserSession(user);

    // Mettre à jour les statistiques de connexion
    await this.updateLoginStats(user);

    return {
      user: this.sanitizeUserData(user),
      session
    };
  }
}

export default new UserManagementService();
