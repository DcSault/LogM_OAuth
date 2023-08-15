// ======== Modules ========
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const Redis = require('ioredis');

const app = express();
const PORT = 443;

// ======== Load Environment Variables ========
dotenv.config({ path: './redis.env' });
dotenv.config({ path: 'key.env' });
dotenv.config({ path: 'ip.env' });

const { MASTER_KEY, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;

// ======== Configuration Redis ========
const client = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD
});

client.on('connect', () => {
    console.log('Connecté à Redis');
});
client.on('error', err => {
    console.error('Erreur Redis:', err);
});

// ======== Master Key Utilities ========
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

// ======== Express Configuration ========
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', true);
app.use(express.static('public'));

// ======== Daily Code Utilities ========
const codeLength = 6;
let DAILY_CODE = generateDailyCode();

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

// ======== Routes ========
app.get('/', (req, res, next) => {
    const ipAddress = req.ip;
    const allowedIps = (process.env.ALLOWED_IPS || "").split(',');

    if (allowedIps.includes(ipAddress)) {
        const timeUntilMidnight = calculateTimeUntilMidnight();
        res.render('code', { 
            code: DAILY_CODE,
            hoursLeft: timeUntilMidnight.hours,
            minutesLeft: timeUntilMidnight.minutes
        });
    } else {
        next(new Error(`Accès interdit depuis l'IP: ${ipAddress}`));
    }
});

app.post('/verify', async (req, res, next) => {
    const codeSent = req.body.code;
    if (codeSent === DAILY_CODE) {
        try {
            const jsonData = await client.get('errors');
            res.json({ valid: true, data: jsonData ? JSON.parse(jsonData) : {} });
        } catch (error) {
            next(error);
        }
    } else {
        res.json({ valid: false });
    }
});

app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).send(err.message);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});

// ======== Utility Functions ========
function calculateTimeUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const timeUntilMidnight = midnight - now;
    
    return {
        hours: Math.floor(timeUntilMidnight / (1000 * 60 * 60)),
        minutes: Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60))
    };
}
