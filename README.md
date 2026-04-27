# TP — CI/CD Node.js Docker Swarm

RASAMIARIMANANA Irina Andrianarijaona - ESGI M2 IW

## Partie A — API Node.js

### Comment récupérez-vous le hostname dans Node.js ?

Dans Node.js, le hostname du système (ou du conteneur dans lequel l'application tourne) se récupère grâce au module natif `os`. Il suffit d'importer le module (`const os = require('os');`) et d'appeler la méthode `os.hostname()`.

### Quelle différence entre "listening on localhost" et "0.0.0.0" dans un conteneur ?

- `localhost` (127.0.0.1) : C'est l'interface de boucle locale (loopback). Si une application écoute sur localhost à l'intérieur d'un conteneur, elle n'acceptera que les requêtes provenant de l'intérieur de ce même conteneur. Elle sera totalement invisible et inaccessible depuis l'hôte Docker ou le monde extérieur.
- `0.0.0.0`: C'est la "route par défaut" (toutes les interfaces IPv4). En écoutant sur 0.0.0.0, l'application Node.js accepte les connexions provenant de n'importe quelle interface réseau disponible dans le conteneur. C'est obligatoire pour que le conteneur puisse recevoir du trafic externe (via le mapping de ports Docker docker run -p ou le routing mesh de Docker Swarm).
