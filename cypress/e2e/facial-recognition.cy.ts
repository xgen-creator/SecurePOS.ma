describe('Facial Recognition System', () => {
  beforeEach(() => {
    cy.login(); // Custom command to handle authentication
    cy.visit('/facial-recognition');
  });

  it('should capture and process face image', () => {
    cy.get('[data-testid="start-capture"]').click();
    cy.get('[data-testid="video-feed"]').should('be.visible');
    
    // Simulate face detection
    cy.get('[data-testid="face-detected"]', { timeout: 10000 })
      .should('be.visible');
    
    cy.get('[data-testid="capture-button"]').click();
    
    // Verify processing UI
    cy.get('[data-testid="processing-indicator"]')
      .should('be.visible');
    
    // Verify result
    cy.get('[data-testid="recognition-result"]', { timeout: 15000 })
      .should('be.visible');
  });

  it('should handle visitor registration', () => {
    cy.get('[data-testid="register-visitor"]').click();
    
    cy.get('[data-testid="visitor-name"]').type('John Doe');
    cy.get('[data-testid="visitor-email"]').type('john@example.com');
    
    // Upload test image
    cy.get('[data-testid="photo-upload"]')
      .attachFile('test-data/visitor-photo.jpg');
    
    cy.get('[data-testid="save-visitor"]').click();
    
    // Verify success message
    cy.get('[data-testid="success-message"]')
      .should('be.visible')
      .and('contain', 'Visitor registered successfully');
  });

  it('should display recognition history', () => {
    cy.get('[data-testid="history-tab"]').click();
    
    cy.get('[data-testid="history-list"]')
      .should('be.visible')
      .and('not.be.empty');
    
    // Verify history entry details
    cy.get('[data-testid="history-entry"]').first().within(() => {
      cy.get('[data-testid="visitor-name"]').should('be.visible');
      cy.get('[data-testid="timestamp"]').should('be.visible');
      cy.get('[data-testid="confidence-score"]').should('be.visible');
    });
  });

  it('should handle system settings', () => {
    cy.get('[data-testid="settings-tab"]').click();
    
    // Adjust confidence threshold
    cy.get('[data-testid="confidence-threshold"]')
      .clear()
      .type('0.8');
    
    // Toggle features
    cy.get('[data-testid="enable-notifications"]').click();
    cy.get('[data-testid="enable-auto-door"]').click();
    
    cy.get('[data-testid="save-settings"]').click();
    
    // Verify settings saved
    cy.get('[data-testid="success-message"]')
      .should('be.visible')
      .and('contain', 'Settings saved successfully');
  });

  it('should handle error scenarios', () => {
    // Test with poor lighting conditions
    cy.get('[data-testid="start-capture"]').click();
    cy.get('[data-testid="lighting-warning"]')
      .should('be.visible')
      .and('contain', 'Poor lighting detected');
    
    // Test with multiple faces
    cy.get('[data-testid="multiple-faces-warning"]')
      .should('be.visible')
      .and('contain', 'Multiple faces detected');
    
    // Test with no face detected
    cy.get('[data-testid="no-face-warning"]')
      .should('be.visible')
      .and('contain', 'No face detected');
  });
});
