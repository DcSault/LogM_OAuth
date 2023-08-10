const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

const app = express();
const PORT = 443;

// Configuration
dotenv.config({ path: 'token.env' });
console.log('Configuration chargée depuis token.env');

const { GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH } = process.env;

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
        res.render('code', { code: DAILY_CODE });
    } else {
        console.log(`Accès interdit depuis l'IP: ${ipAddress}`);
        next(new Error(`Accès interdit depuis l'IP: ${ipAddress}`));
    }
});

async function fetchJsonFromRepo(token, repoOwner, repoName, filePath) {
    console.log('Tentative de récupération du fichier JSON depuis GitHub');
    const config = {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3.raw'
        }
    };
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
    const response = await axios.get(url, config);
    console.log('Données récupérées depuis GitHub');
    return response.data;
}

app.post('/verify', async (req, res, next) => {
    console.log('Requête reçue pour vérification de code');
    const codeSent = req.body.code;
    if (codeSent === DAILY_CODE) {
        console.log('Code validé');

        try {
            const jsonData = await fetchJsonFromRepo(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH);
            res.json({ valid: true, data: jsonData });
        } catch (error) {
            console.error('Erreur lors de la récupération du fichier JSON depuis GitHub:', error.message);
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
// Test fetchJsonFromRepo
async function testFetchJsonFromRepo() {
    try {
        const jsonData = await fetchJsonFromRepo(GITHUB_TOKEN, REPO_OWNER, REPO_NAME, FILE_PATH);
        console.log('JSON récupéré depuis GitHub:', jsonData);
    } catch (error) {
        console.error('Erreur lors de la récupération du fichier JSON depuis GitHub:', error.message);
    }
}

// Appel de la fonction de test
testFetchJsonFromRepo();

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});