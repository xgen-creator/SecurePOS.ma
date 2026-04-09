describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should successfully login with valid credentials', () => {
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('SecurePass123!');
    cy.get('[data-testid="login-button"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-profile"]').should('be.visible');
  });

  it('should show error with invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('WrongPass123!');
    cy.get('[data-testid="login-button"]').click();

    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid credentials');
  });

  it('should successfully register new user', () => {
    cy.get('[data-testid="register-link"]').click();
    cy.url().should('include', '/register');

    const randomEmail = `test${Math.random().toString(36).substring(7)}@example.com`;
    
    cy.get('[data-testid="name-input"]').type('New User');
    cy.get('[data-testid="email-input"]').type(randomEmail);
    cy.get('[data-testid="password-input"]').type('SecurePass123!');
    cy.get('[data-testid="confirm-password-input"]').type('SecurePass123!');
    cy.get('[data-testid="register-button"]').click();

    cy.url().should('include', '/dashboard');
  });

  it('should enforce password requirements', () => {
    cy.get('[data-testid="register-link"]').click();
    
    cy.get('[data-testid="name-input"]').type('New User');
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('weak');
    
    cy.get('[data-testid="password-requirements"]')
      .should('be.visible')
      .and('contain', 'minimum 8 characters')
      .and('contain', 'uppercase letter')
      .and('contain', 'number');
  });

  it('should handle forgot password flow', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.url().should('include', '/forgot-password');

    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="reset-button"]').click();

    cy.get('[data-testid="success-message"]')
      .should('be.visible')
      .and('contain', 'reset instructions sent');
  });
});
