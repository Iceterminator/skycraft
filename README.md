# SkyCraft

Calculateur de ressources pour les crafts Hypixel SkyBlock. L’application fonctionne dans un navigateur, sans installation ni compte SkyCraft.

## Lancer l’application

Comme le navigateur bloque le chargement de fichiers JSON depuis une page `file://`, démarre un serveur web local dans ce dossier, par exemple avec Python :

```powershell
py -m http.server 8000
```

Puis ouvre <http://localhost:8000>.

## Fonctions

- Recherche parmi les objets craftables et leurs recettes.
- Calcul des besoins pour une quantité donnée, avec arbre de craft récursif.
- Choix d’une recette alternative lorsqu’un objet a plusieurs recettes.
- Saisie des stocks possédés, barres de progression et sauvegarde locale dans le navigateur.
- Inventaire manuel accessible en haut de la page : son sélecteur ne propose que les ressources de base non craftables utilisées par les recettes. Les objets intermédiaires craftables restent pris en compte dans le calcul et l’import Hypixel.
- Choix des icônes FurSky Reborn ou Hypixel SkyBlock, avec repli sur les textures disponibles si une icône manque. Les images FurSky sont chargées depuis le dépôt public [FurfSky Reborn](https://github.com/furfsky/reborn) ; les images du pack restent la propriété de leurs ayants droit.
- Import facultatif des inventaires d’un profil via l’API Hypixel (clé API et UUID Minecraft).

L’API officielle Hypixel exige une clé : un pseudo seul ne permet pas de lire l’inventaire. La clé API n’est pas sauvegardée par l’application. L’API doit autoriser la requête depuis le navigateur et donner accès aux inventaires du profil ; sinon, utilise la saisie manuelle des stocks. Les quantités détectées dans le profil remplacent les stocks manuels correspondants ; les autres stocks manuels sont conservés.

## Données de recettes

`recipes.json` contient 2 598 recettes de craft et 2 113 objets craftables, transformés à partir des données communautaires de [SkyblockRepo/Repo](https://github.com/SkyblockRepo/Repo) (instantané `dbc804448625824af9dfc5b7a2a1fb9eb372ec86`). Les noms, raretés et textures s’appuient également sur le catalogue public des objets Hypixel ; les icônes vanilla proviennent de [minecraft-assets](https://github.com/InventivetalentDev/minecraft-assets). Certaines images nécessitent une connexion Internet. Le jeu change fréquemment : les recettes évoluent avec les données amont et peuvent être incomplètes ou obsolètes. Le référentiel attribué est sous licence MIT ; voir [LICENSE-RECIPES.txt](./LICENSE-RECIPES.txt).

L’application n’est pas affiliée à Hypixel.
