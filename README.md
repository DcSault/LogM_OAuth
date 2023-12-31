
# 🚀 LogM_OAuth

Bienvenue dans l'application "LogM_OAuth" ! Cette application génère un code unique chaque jour et met à disposition une API pour la récupération des données.

## 📖 Sommaire

- [Caractéristiques](#-caractéristiques)
- [Installation](#-installation)
- [Utilisation](#-utilisation)
- [Contribution](#-contribution)
- [Crédits](#-crédits)

## 🌟 Caractéristiques

- Génération d'un code unique chaque jour 📅
- Visualisation du code à l'aide d'une interface utilisateur 🖥
- Restrictions d'accès basées sur l'adresse IP 🛡
- Intégration avec API GitHub pour la récupération de données 🌐
- Intégration avec API Redis pour la récupération de données 📦
- Authentification API sécurisée 🔐
- API pour la récupération des données 📋

## 🔧 Installation

1. Clonez ce dépôt:
```
git clone https://github.com/DcSault/LogM_OAuth
```

Installez les dépendances:

```
npm install
```
Configurez vos variables d'environnement en créant un fichier .env avec les clés nécessaires.

Démarrez l'application via api GitHub ou Redis:

### Redis API 📈
```
node LogM_OAuth_Redis.js
```
### GitHub API
```
node LogM_OAuth_Github.js
```

## 🚀 Utilisation
Accédez à la page principale pour voir le code du jour.
Envoyez le code à travers l'API pour vérifier sa validité.
## 🤝 Contribution
Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou à soumettre une pull request.

## 📜 Crédits
Conçu et développé par Victor ROSIQUE.
Merci à tous ceux qui ont contribué au projet !
