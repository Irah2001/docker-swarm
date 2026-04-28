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

## Partie D — Accès distant au cluster Swarm

**Architecture choisie** : VPN (Tailscale) + Docker context via SSH
GitHub Actions rejoint un réseau privé virtuel (Tailscale) sur lequel se trouve déjà la machine locale, puis lance les commandes Docker via un tunnel SSH sécurisé.

### Schéma simple
[ GitHub Actions Runner ]
       |
       | (Connexion VPN Tailscale initiée via un Auth Key)
       v
[ Réseau privé Tailscale (Tunnel chiffré WireGuard) ]
       |
       | (Connexion SSH initiée via clé privée)
       v
[ Machine Locale (Manager Swarm) ] --> Exécute le déploiement

### Mécanisme d'authentification :

Il y a une double couche d'authentification, garantissant une sécurité optimale :

- Niveau Réseau (Tailscale) : Le runner GitHub s'authentifie sur le VPN Tailscale grâce à une clé d'authentification éphémère (`TAILSCALE_AUTHKEY`) stockée dans les secrets GitHub.

- Niveau Système/Docker (SSH) : Le runner s'authentifie sur la machine locale via une clé SSH privée (`SSH_PRIVATE_KEY`), également stockée dans les secrets GitHub. La clé publique correspondante est autorisée sur le serveur (`~/.ssh/authorized_keys`).

### Ports exposés :

- Sur Internet : Aucun. (C'est le grand avantage du VPN).

- Sur le réseau Tailscale : Seul le port 22 (SSH) est accessible pour le runner.

### Risques et mitigations (Surface d'attaque) :

- Risque : Fuite de la clé SSH privée ou de la clé Tailscale depuis GitHub.

- Mitigation 1 (Révocation facile) : Si compromission, il suffit de supprimer la clé publique du fichier `authorized_keys du serveur local ou de révoquer la machine dans l'interface Tailscale. L'accès est coupé instantanément.

- Mitigation 2 (Moindre privilège) : L'utilisateur SSH utilisé sur le serveur n'est pas root, il appartient uniquement au groupe docker pour limiter ses actions.

- Mitigation 3 (Secrets) : Aucun secret n'est en clair dans le code. Ils sont injectés uniquement au moment de l'exécution via les GitHub Secrets.

### Pourquoi exposer Docker en TCP sans TLS est dangereux ?

L'API de Docker a par défaut les mêmes privilèges que l'utilisateur root sur la machine hôte. Si on expose cette API sur un port réseau TCP (ex: 2375) sans TLS (sans chiffrement ni authentification), n'importe qui sur le réseau peut envoyer une commande pour créer un conteneur malveillant, monter le système de fichiers principal (/) du serveur à l'intérieur de ce conteneur, et prendre le contrôle total de la machine en quelques secondes.

### Quelle différence entre “le runner atteint le manager” et “le manager atteint le runner” ?

C'est la différence fondamentale entre les modèles Push et Pull en architecture réseau :

- Le runner atteint le manager (Push) : GitHub Actions (le runner) prend l'initiative et "pousse" les commandes vers le serveur. Cela nécessite que le serveur soit joignable depuis l'extérieur (d'où le besoin du VPN Tailscale pour percer le pare-feu de votre box internet).

- Le manager atteint le runner (Pull) : Le serveur interne initie la connexion vers l'extérieur (par exemple, en installant un Self-hosted Runner GitHub directement sur la machine). Dans ce cas, c'est le serveur qui demande à GitHub "Y a-t-il du travail pour moi ?". C'est souvent plus simple pour un réseau domestique car cela ne nécessite ni VPN ni ouverture de ports entrants (les pare-feu autorisent par défaut le trafic sortant).

## Partie E — Déploiement Swarm

### Comment Swarm gère-t-il un rolling update ?

Docker Swarm effectue des mises à jour progressives (rolling updates) pour garantir une disponibilité continue de l'application (zéro coupure). Plutôt que de redémarrer tous les conteneurs d'un coup, il suit les règles strictes définies dans le bloc update_config de notre stack :
- Remplacement progressif (parallelism: 1) : Il met à jour les instances une par une.
- Ordre de démarrage (order: start-first) : Il démarre le nouveau conteneur et attend qu'il soit pleinement fonctionnel avant d'éteindre l'ancienne version.
- Temporisation (delay: 10s) : Il marque une pause de 10 secondes entre chaque mise à jour pour s'assurer de la stabilité de la charge système.

### Que se passe-t-il si le healthcheck échoue pendant l’update ?

Le healthcheck agit comme un véritable filet de sécurité. Si la nouvelle version déployée contient une erreur et que la route /health ne répond pas correctement, voici comment Swarm réagit :
1. Le nouveau conteneur est identifié comme unhealthy.
2. Swarm bloque immédiatement la mise à jour pour ne pas casser le reste du cluster. Les autres réplicas continuent de tourner sur l'ancienne version stable.
3. Le routeur interne (routing mesh) ne redirigera jamais le trafic des utilisateurs vers ce conteneur défectueux.
4. Grâce à la configuration failure_action: rollback, Swarm annule l'opération et déclenche un retour en arrière automatique vers l'image précédente, restaurant l'état sain sans aucune intervention humaine.
