// tests/e2e/visitor.test.js
describe('Scénarios visiteur', () => {
  let page;
  let browser;

  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('Processus complet de visite', async () => {
    // Visiteur sonne à la porte
    await page.goto(`${BASE_URL}/door/${TEST_DEVICE_ID}`);
    await page.click('#ring-button');

    // Vérifier la notification côté propriétaire
    const ownerPage = await browser.newPage();
    await ownerPage.goto(`${BASE_URL}/dashboard`);
    
    await ownerPage.waitForSelector('.notification-item');
    const notification = await ownerPage.$eval(
      '.notification-item',
      el => el.textContent
    );
    expect(notification).toContain('Nouveau visiteur');

    // Répondre au visiteur
    await ownerPage.click('.answer-call');
    await ownerPage.waitForSelector('.video-stream');

    // Vérifier la communication
    const audioStream = await page.$eval(
      '.audio-indicator',
      el => el.getAttribute('data-status')
    );
    expect(audioStream).toBe('active');

    // Terminer l'appel
    await ownerPage.click('.end-call');
    await page.waitForSelector('.call-ended');
  });
});

// tests/e2e/settings.test.js
describe('Configuration système', () => {
  let page;

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/settings`);
    await login(page);
  });

  test('Modification des paramètres de notification', async () => {
    await page.click('button:text("Notifications")');
    await page.waitForSelector('.notification-settings');

    // Activer les notifications push
    await page.click('#push-notifications-toggle');
    await page.click('button:text("Sauvegarder")');

    // Vérifier la sauvegarde
    await page.reload();
    const isEnabled = await page.$eval(
      '#push-notifications-toggle',
      el => el.checked
    );
    expect(isEnabled).toBe(true);
  });
});

// tests/e2e/performance.test.js
describe('Tests de performance', () => {
  test('Temps de réponse de la sonnette', async () => {
    const startTime = Date.now();
    await axios.post(`${API_URL}/doorbell/ring`, {
      deviceId: TEST_DEVICE_ID
    });
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000);
  });

  test('Charge système multiple sonnettes', async () => {
    const requests = Array(100).fill().map(() => 
      axios.post(`${API_URL}/doorbell/ring`, {
        deviceId: TEST_DEVICE_ID
      })
    );

    const results = await Promise.all(requests);
    const successCount = results.filter(r => r.status === 200).length;
    expect(successCount).toBe(100);
  });
});
