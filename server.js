const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');
const Redis = require('ioredis');

const app = express();
const PORT = 443;


// ======== Configuration Redis ========
require('dotenv').config({ path: './redis.env' });
const client = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
});

client.on('connect', function() {
    console.log('Connecté à Redis');
});

client.on('error', function(err) {
    console.error('Erreur Redis:', err);
});

function saveMasterKeyToFile() {
    const masterKey = generateMasterKey();
    fs.writeFileSync('key.env', `MASTER_KEY=${masterKey}`);
    console.log('Clé maître sauvegardée dans key.env');
    return masterKey;
}

function generateMasterKey() {
    return crypto.randomBytes(32).toString('hex');
}

saveMasterKeyToFile();

dotenv.config({ path: 'key.env' });
const { MASTER_KEY } = process.env;

app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true);
app.use(express.static('public'));

const codeLength = 6;

function generateDailyCode() {
    const hash = crypto.createHash('sha256');
    hash.update(MASTER_KEY);
    const hashedValue = hash.digest('hex');

    let code = '';
    for (let i = 0; i < codeLength; i++) {
        const position = parseInt(hashedValue.slice(i * 2, i * 2 + 2), 16);
        code += position % 10;
    }
    return code;
}

let DAILY_CODE = generateDailyCode();
console.log(`Code du jour : ${DAILY_CODE}`);

function updateDailyCode() {
    DAILY_CODE = generateDailyCode();
    console.log(`Code du jour : ${DAILY_CODE}`);
}

function scheduleDailyCodeUpdate() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const timeUntilMidnight = midnight - now;

    setTimeout(() => {
        updateDailyCode();
        setInterval(updateDailyCode, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
}

scheduleDailyCodeUpdate();

dotenv.config({ path: 'ip.env' });
app.get('/', (req, res, next) => {
    console.log('Requête reçue pour /code');
    const ipAddress = req.ip;
    const allowedIps = (process.env.ALLOWED_IPS || "").split(',');
    if (allowedIps.includes(ipAddress)) {
        console.log(`IP autorisée : ${ipAddress}`);
        
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
        const timeUntilMidnight = midnight - now;
        
        const hoursLeft = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
        
        res.render('code', { 
            code: DAILY_CODE,
            hoursLeft: hoursLeft,
            minutesLeft: minutesLeft
        });
    } else {
        console.log(`Accès interdit depuis l'IP: ${ipAddress}`);
        next(new Error(`Accès interdit depuis l'IP: ${ipAddress}`));
    }
});

app.post('/verify', async (req, res, next) => {
    console.log('Requête reçue pour vérification de code');
    const codeSent = req.body.code;
    if (codeSent === DAILY_CODE) {
        console.log('Code validé');

        try {
            const jsonData = await client.get('errors');
            res.json({ valid: true, data: jsonData ? JSON.parse(jsonData) : {} });
        } catch (error) {
            console.error('Erreur lors de la récupération du fichier JSON depuis Redis:', error.message);
            next(error);
        }

    } else {
        console.log('Code invalide');
        res.json({ valid: false });
    }
});

app.use((err, req, res, next) => {
    console.error(`Erreur: ${err.message}`);
    if (!err.statusCode) err.statusCode = 500;
    res.status(err.statusCode).send(err.message);
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});