const sharp = require('sharp');
const imagemin = require('imagemin');
const imageminWebp = require('imagemin-webp');
const path = require('path');
const fs = require('fs').promises;

async function optimizeImage() {
    const inputPath = path.join(__dirname, '../client/public/auth-bg.jpg'); // Ajustez le chemin selon votre image
    const outputDir = path.join(__dirname, '../client/public');
    
    try {
        // Redimensionner l'image
        await sharp(inputPath)
            .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toFile(path.join(outputDir, 'auth-bg-resized.jpg'));

        // Convertir en WebP avec compression
        await imagemin([path.join(outputDir, 'auth-bg-resized.jpg')], {
            destination: outputDir,
            plugins: [
                imageminWebp({
                    quality: 75, // Ajustez la qualité selon vos besoins (0-100)
                    method: 6,   // Niveau de compression maximum
                })
            ]
        });

        // Supprimer le fichier intermédiaire
        await fs.unlink(path.join(outputDir, 'auth-bg-resized.jpg'));

        console.log('Image optimisée avec succès !');
        
        // Afficher les statistiques de taille
        const originalSize = (await fs.stat(inputPath)).size;
        const optimizedSize = (await fs.stat(path.join(outputDir, 'auth-bg.webp'))).size;
        
        console.log('Taille originale:', (originalSize / 1024 / 1024).toFixed(2), 'MB');
        console.log('Taille optimisée:', (optimizedSize / 1024 / 1024).toFixed(2), 'MB');
        console.log('Réduction:', (100 - (optimizedSize / originalSize * 100)).toFixed(2), '%');
        
    } catch (error) {
        console.error('Erreur lors de l\'optimisation:', error);
    }
}

optimizeImage();
