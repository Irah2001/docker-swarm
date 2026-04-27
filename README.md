# TP — CI/CD Node.js Docker Swarm

RASAMIARIMANANA Irina Andrianarijaona - ESGI M2 IW

## Partie A — API Node.js

### Comment récupérez-vous le hostname dans Node.js ?

Dans Node.js, le hostname du système (ou du conteneur dans lequel l'application tourne) se récupère grâce au module natif `os`. Il suffit d'importer le module (`const os = require('os');`) et d'appeler la méthode `os.hostname()`.

### Quelle différence entre "listening on localhost" et "0.0.0.0" dans un conteneur ?

- `localhost` (127.0.0.1) : C'est l'interface de boucle locale (loopback). Si une application écoute sur localhost à l'intérieur d'un conteneur, elle n'acceptera que les requêtes provenant de l'intérieur de ce même conteneur. Elle sera totalement invisible et inaccessible depuis l'hôte Docker ou le monde extérieur.
- `0.0.0.0`: C'est la "route par défaut" (toutes les interfaces IPv4). En écoutant sur 0.0.0.0, l'application Node.js accepte les connexions provenant de n'importe quelle interface réseau disponible dans le conteneur. C'est obligatoire pour que le conteneur puisse recevoir du trafic externe (via le mapping de ports Docker docker run -p ou le routing mesh de Docker Swarm).

## Partie B — Conteneurisation Docker

### Quels fichiers doivent absolument être ignorés ? Pourquoi ?

- Le fichier `.env`: Ce fichier contient souvent des mots de passe, des clés d'API ou des tokens en clair. Si on l'embarque dans l'image, n'importe qui ayant accès à l'image aura accès à nos secrets de production.
- Le dossier `.git` : Il contient tout l'historique de notre code. L'inclure alourdirait inutilement l'image (parfois de plusieurs centaines de mégaoctets) et pourrait révéler des informations sensibles cachées dans d'anciens commits.
- Le dossier `node_modules` local : Si on le copie, on annule tout l'intérêt de la conteneurisation. Les dépendances compilées sur notre machine (par exemple sur un Mac ou un Windows) risquent de ne pas fonctionner sur le système Linux (Alpine) du conteneur, créant des erreurs d'architecture introuvables. Il faut laisser le conteneur installer ses propres modules de zéro.

### Comment valider que votre image finale ne contient pas d’artefacts de dev ?

- L'exploration manuelle : On peut forcer l'ouverture d'un terminal à l'intérieur de l'image finalisée sans démarrer l'application. En tapant la commande `docker run -it --entrypoint sh nom_image`, on se retrouve dans le conteneur. On peut alors fouiller avec `ls -la` ou regarder dans le dossier `node_modules` pour vérifier visuellement que les outils de tests (comme Jest ou Supertest) n'y sont pas.
- L'analyse des couches : On peut utiliser la commande `docker history nom_image` pour voir la taille de chaque étape de construction. Si on veut aller plus loin, un outil open-source fantastique comme Dive permet d'inspecter l'image couche par couche et de voir exactement quels fichiers ont été ajoutés ou supprimés à chaque ligne du Dockerfile.

## Partie C — Registry d’images

### Quelle stratégie de tags adoptez-vous : latest, SHA, semver ?

Dans un bon pipeline CI/CD, on évite d'utiliser uniquement latest. La meilleure stratégie est une approche combinée :
- Le SHA du commit Git (ex: a1b2c3d) : À chaque fois que du code est poussé sur la branche main, on tag l'image avec l'identifiant unique du commit. C'est parfait pour le déploiement continu car on sait exactement quel code a généré cette image.
- Le SemVer (ex: v1.0.0) : Utilisé en complément lors de la création d'une "Release" sur GitHub, pour marquer les versions majeures ou stables de l'application.

### Pourquoi un tag immuable est préférable pour un déploiement fiable ?

Un tag "immuable" (comme un SHA ou un numéro de version fixe) est une étiquette qui ne sera jamais écrasée ou modifiée une fois publiée.