const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureScreenshots() {
    // Créer le dossier screenshots s'il n'existe pas
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: {
            width: 1920,
            height: 1080
        }
    });

    const page = await browser.newPage();

    // Liste des pages à capturer
    const pages = [
        { name: 'home', path: '/' },
        { name: 'visitors', path: '/#visitors' },
        { name: 'stats', path: '/#stats' },
        { name: 'settings', path: '/#settings' }
    ];

    // Capturer chaque page
    for (const pageInfo of pages) {
        // Naviguer vers la page
        await page.goto(`http://localhost:3000${pageInfo.path}`);
        
        // Attendre que la page soit chargée
        await page.waitForSelector('.main-content');
        
        // Faire défiler la page pour s'assurer que tout est chargé
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        
        // Attendre les animations
        await page.waitForTimeout(1000);

        // Capturer la version desktop
        await page.setViewport({ width: 1920, height: 1080 });
        await page.screenshot({
            path: path.join(screenshotsDir, `${pageInfo.name}-desktop.png`),
            fullPage: true
        });

        // Capturer la version mobile
        await page.setViewport({ width: 375, height: 812 });
        await page.screenshot({
            path: path.join(screenshotsDir, `${pageInfo.name}-mobile.png`),
            fullPage: true
        });

        // Capturer la version tablette
        await page.setViewport({ width: 768, height: 1024 });
        await page.screenshot({
            path: path.join(screenshotsDir, `${pageInfo.name}-tablet.png`),
            fullPage: true
        });
    }

    await browser.close();
    console.log('Captures d\'écran terminées !');
}

// Exécuter la capture d'écran
captureScreenshots().catch(console.error);
