// Adds 1 to the last part of the app version in app.json, keeping it at least three digits (0.0.001 -> 0.0.002).
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'app.json');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
const [major, minor, patch] = config.expo.version.split('.');
const next = String(Number(patch) + 1).padStart(3, '0');
config.expo.version = `${major}.${minor}.${next}`;
fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
console.log(config.expo.version);
