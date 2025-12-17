// Run this script to generate PWA icons
// Usage: node scripts/generate-icons.js
// Requires: npm install canvas

const fs = require('fs');
const path = require('path');

// Try to use canvas if available, otherwise create placeholder instructions
try {
  const { createCanvas } = require('canvas');
  
  const sizes = [192, 512];
  
  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Card shape
    const cardWidth = size * 0.5;
    const cardHeight = size * 0.7;
    const cardX = (size - cardWidth) / 2;
    const cardY = (size - cardHeight) / 2;
    const radius = size * 0.05;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, radius);
    ctx.fill();
    
    // "2" text
    ctx.fillStyle = '#e74c3c';
    ctx.font = `bold ${size * 0.35}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('2', size / 2, size / 2);
    
    // Heart symbol
    ctx.fillStyle = '#e74c3c';
    ctx.font = `${size * 0.12}px Arial`;
    ctx.fillText('♥', cardX + size * 0.12, cardY + size * 0.12);
    
    // Save
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(__dirname, '..', 'public', `icon-${size}.png`), buffer);
    console.log(`Created icon-${size}.png`);
  });
  
  console.log('Icons generated successfully!');
} catch (error) {
  console.log('Canvas module not found. Creating placeholder icons...');
  console.log('To generate proper icons, run: npm install canvas && node scripts/generate-icons.js');
  console.log('');
  console.log('Alternatively, create icons manually:');
  console.log('1. Create a 192x192 PNG icon at public/icon-192.png');
  console.log('2. Create a 512x512 PNG icon at public/icon-512.png');
  console.log('');
  console.log('You can use online tools like:');
  console.log('- https://www.pwabuilder.com/imageGenerator');
  console.log('- https://realfavicongenerator.net/');
}

