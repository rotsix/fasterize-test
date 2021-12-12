# Fasterize test

Ce répertoire contient les sources de l'exercice donné par Fasterize dans le cadre de leur test technique.
L'énoncé peut être trouvé à [cette adresse](https://www.notion.so/Exercice-image-optimizer-843977f9216b480c89d2aafcbc3ecda7).


## Utilisation

Ce projet est géré par `docker`, enveloppé avec `docker-compose`.
Il est donc aisé de déployer le serveur :

```sh
docker-compose up
```

Pour lancer les tests, on peut soit profiter du fait qu'ils soient lancés lors de la construction de l'image Docker, soit à la main.

```sh
npm install
npm run test
```

Les fonctions utilitaires ainsi que les routes y sont testés autant en cas de réussite qu'en cas d'erreur.


## Implémentation


### Routes

L'implémentation consiste en trois routes.
Ces routes sont gérées par le module `express` qui fournit de l'abstraction et simplifie beaucoup le traitement des requêtes.

#### `POST /images`

Cette route est en charge d'ajouter une nouvelle image au stockage et la rendre disponible à l'optimisation.
On peut joindre une image à la requête en utilisant un objet de type `multipart/form-data`.

Le module `express-fileupload` permet d'encore simplifier le traitement en rendant accessible le champ `req.files` lors du traitement des requêtes.

Si la requête ne contient aucune image, ou un fichier qui n'en est pas une, alors le serveur renvoie le code 400, requête mal formée.
En cas d'erreur du serveur lors du stockage de l'image, le code 500, erreur interne au serveur, est renvoyé.

Si tout se passe bien, le serveur renvoie une chaine de caractères contenant l'ID de l'image venant d'être envoyée.


#### `GET /images/:id`

Cette route est en charge de récupérer une image (optimisée ou non).

L'ID à fournir est de la forme de ceux retournés par une requête sur `POST /images` ou `GET /generator`.
Si l'ID n'est rattaché à aucune image, alors le serveur renvoie le code 404, image non trouvée.

J'ai trouvé plus intéressant de fournir une seule route pour récupérer les images plutôt que de laisser un répertoire en libre-accès.
Ceci permet également d'intégrer des contrôles d'accès plus facilement plus tard.


#### `GET /generator`

Cette route est en charge de générer une nouvelle image optimisée à partir d'une présente dans le stockage du serveur.

Cette route prend plusieurs paramètres en entrée dont :

- `src` (requis) : ID de l'image sur laquelle travailler
- `height` / `width` (requis) : dimensions de l'image optimisée
- `fit` (défaut : `cover`) : interprétation des paramètres `height` et `width`
- `quality` (défaut : `100`) : qualité de l'image optimisée (spécifique aux formats JPG et WEBP).

Si un des paramètres est mal formé (`height < 0` par exemple), le code 400 est renvoyé par le serveur.
Si l'image de source est introuvable, c'est le code 404 qui est renvoyé.

Le serveur traite ensuite l'image en utilisant la bibliothèque `sharp`.

Une fois l'image optimisée, le serveur termine la requête en renvoyant l'ID de la nouvelle image.


### Stockage

La gestion du stockage a été la première décision à prendre quant à la suite de l'implémentation d'une solution.
Je pense qu'une manière propre de faire les choses est de stocker les images suivant leur valeur de somme SHA256.

En effet, ceci garantit qu'une même image n'est pas téléchargée sur le serveur plusieurs fois, et qu'une image optimisée n'est calculée qu'une seule fois également.

Ceci permet aussi de n'avoir qu'un ID unique pour chaque image disponible directement dans le nom de fichier, et de ne pas avoir besoin d'une base de données pour stocker l'ID de chaque image.

L'objet `storage`, lors de l'avancée du projet, est destiné à devenir une interface spécifiant les méthodes que doit implémenter le stockage sous-jacent.
Ceci permet notamment de fournir de l'abstraction sur l'utilisation d'un système de fichier (comme ma solution actuelle), une base de données, un montage réseau (S3, CDN, etc), etc.


### Tests

Une suite de tests est mise en place et utilisable via `mocha`.
Les fonctions utilitaires (`sha256sum`, `storage`) sont testées exhaustivement autant en cas de réussite que d'erreur.

Les routes sont elles aussi testées dans leur bon fonctionnement, mais aussi avec des arguments factices pour tester les valeurs de retour en cas d'erreur.

Les tests sur les routes sont "moches" dû à l'utilisation d'un `timeout` pour vérifier la consistance des images construites.
En effet, il faut attendre que le système de fichier se synchronise et soit à jour avant de pouvoir lire les images.


### Sécurité

Aucune identification ni authentification ne sont mises en place.
Dans le futur, on pourrait intégrer un module d'authentification et un service de base de données qui lierait les images à des propriétaires.

Les données en entrée sont toujours nettoyées avant d'être utilisées, et on ne peut pas accéder directement au stockage de l'application.
Les noms de fichier sont des sommes SHA256 (donc exclusivement des caractères alpha-numériques) et on ne peut donc pas y injecter du code.


## Agrandissement du service

Lorsque le service va grandir et se voir ajouté des fonctionnalités, plusieurs points seront à faire :

- ajouter une base de données journalisant les ajouts et générations d'images, assignant les images à des utilisateurs, etc
- améliorer le stockage pour fournir une vraie interface, et construire des fournisseurs de stockage (système de fichiers, base de données, CDN, etc)
- séparer le fichier principal en plusieurs modules :
	- `routes` : gestion des requêtes entrantes, vérification des paramètres, création des valeurs de retour, etc
	- `utilitaries` : stockage, fonctions annexes, authentification, etc
	- `optimizer` : calcul des images, puis extension à du texte, de la vidéo, etc
- utiliser un framework plus complet pour les tests d'intégration
- générer une documentation exhaustive des routes, de leurs paramètres, et de leurs valeurs de retour
- sortir les tests de la construction de l'image Docker et créer une vraie pipeline de CI/CD
