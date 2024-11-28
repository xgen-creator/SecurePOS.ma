// regularVisitorsService.js
class RegularVisitorsService {
  constructor() {
    this.visitors = new Map();
    this.accessPatterns = new Map();
    this.visitorCategories = ['family', 'friend', 'service', 'delivery'];
  }

  async registerRegularVisitor(visitorData) {
    const visitorId = this.generateVisitorId();
    
    const visitor = {
      id: visitorId,
      ...visitorData,
      status: 'active',
      registered: new Date(),
      lastVisit: null,
      visitCount: 0,
      accessHistory: [],
      preferences: {
        notifyOwner: true,
        autoAccess: false,
        accessHours: []
      }
    };

    // Valider les données
    await this.validateVisitorData(visitor);

    // Créer le profil biométrique si disponible
    if (visitorData.biometricData) {
      visitor.biometricProfile = await this.createBiometricProfile(visitorData.biometricData);
    }

    // Sauvegarder le visiteur
    await this.saveVisitor(visitor);

    return {
      visitorId,
      accessCode: await this.generateAccessCode(visitorId)
    };
  }

  async updateVisitorAccess(visitorId, accessConfig) {
    const visitor = await this.getVisitor(visitorId);
    if (!visitor) throw new Error('Visiteur non trouvé');

    const updatedAccess = {
      ...visitor.preferences,
      ...accessConfig,
      lastModified: new Date()
    };

    // Valider la configuration
    await this.validateAccessConfig(updatedAccess);

    // Mettre à jour le visiteur
    visitor.preferences = updatedAccess;
    await this.saveVisitor(visitor);

    return updatedAccess;
  }

  async handleVisitorArrival(visitorData) {
    // Identifier le visiteur
    const visitor = await this.identifyVisitor(visitorData);
    
    if (visitor) {
      // Mettre à jour les statistiques
      await this.updateVisitStats(visitor);

      // Vérifier les règles d'accès
      const accessDecision = await this.checkAccess(visitor);

      // Notifier le propriétaire si nécessaire
      if (visitor.preferences.notifyOwner) {
        await this.notifyOwner(visitor);
      }

      return {
        identified: true,
        visitor,
        accessGranted: accessDecision.granted,
        actions: accessDecision.actions
      };
    }

    return { identified: false };
  }

  async analyzeVisitPatterns(visitorId) {
    const visitor = await this.getVisitor(visitorId);
    if (!visitor) throw new Error('Visiteur non trouvé');

    const patterns = {
      frequentTimes: await this.analyzeVisitTimes(visitor),
      regularDays: await this.analyzeVisitDays(visitor),
      averageDuration: await this.calculateAverageDuration(visitor),
      commonPurposes: await this.analyzeVisitPurposes(visitor)
    };

    // Mettre à jour les suggestions d'accès
    await this.updateAccessSuggestions(visitor, patterns);

    return patterns;
  }
}

export default new RegularVisitorsService();
