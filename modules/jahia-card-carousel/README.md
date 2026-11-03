# Jahia Card Carousel

Module Jahia JavaScript autonome extrait du carrousel de cartes de la Press Room de jahia.com 2.1.0.

## Installation

Prérequis : Jahia **8.2.3.2 ou supérieur** et moteur de modules JavaScript **1.2.0** compatible.
Le seul module Jahia déclaré comme dépendance est `default`. Aucun besoin d’installer `jahiacom`.

Installer `dist/package.tgz` dans le gestionnaire de modules, puis activer **jahia-card-carousel** sur le site voulu.
Dans Page Builder, ajouter **Carrousel de cartes** dans une zone acceptant `jmix:droppableContent`,
puis ajouter et réordonner ses cartes. Les templates qui restreignent les types autorisés doivent
autoriser `jahiacardcarousel:carousel` ; ce module ne modifie pas leurs contraintes.
Sur Jahia.com, on peut notamment le déposer dans un composant **Content Stack**,
qui accepte déjà les composants `jmix:droppableContent`.

Le carrousel propose un titre, un surtitre, une introduction, les thèmes clair/gris/sombre,
1 à 8 cartes sur ordinateur, 1 à 2 sur tablette, une sur mobile,
trois espacements, et des flèches/pagination optionnelles. Il reste une grille éditable en mode édition.
Les cartes incluses proposent titre, image, texte riche et lien interne ou externe via le sélecteur Jahia.
Le carrousel accepte également les autres composants `jmix:droppableContent` du site :
leur rendu reste assuré par leur module d’origine. Les composants imbriqués doivent être adaptés
à la largeur d’une carte et accessibles dans la langue courante.

Les cartes sont rendues côté serveur ; les contrôles sont hydratés dans le navigateur.
Le défilement tactile et clavier reste disponible quand les flèches sont masquées.
Pas de lecture automatique. Prise en compte de la préférence de réduction des animations.
Les textes d’interface et libellés d’édition sont traduits en français et anglais.

## Compatibilité avec la Press Room

Les types `jahiacom:cardCarousel` et `jahiacom:card` existants sont conservés.
Installer ce module ne remplace ni ne migre les contenus existants.
Les nouveaux types sont `jahiacardcarousel:carousel` et `jahiacardcarousel:card`.
Pour réutiliser les cartes Jahia.com dans un nouveau carrousel, conserver leur module d’origine.
Les fonctions propres au site (statistiques du glossaire, filtres partenaires, thème global,
CTA de section et motifs de fond du site) ne sont pas embarquées dans ce module autonome.

Les styles utilisent des CSS Modules et des valeurs par défaut locales, sans police ni feuille de style globale.
Les liens et textes riches des cartes fournies passent par des filtres contre les URL exécutables et le HTML actif.
Les autres composants enfants restent responsables de la sécurité de leur propre rendu.
Aucun patch JCR, migration, tâche de fond ni accès système ajouté.

## Développement

Ce dossier est un projet Yarn indépendant et peut être copié dans son propre dépôt.
Node.js 22.14+ et Corepack sont nécessaires.

```sh
corepack enable
yarn install --immutable
yarn test
yarn lint
yarn prettier --check .
yarn build
```

Le résultat installable est `dist/package.tgz` (version **1.0.7**).

Le formulaire conserve les contrôles natifs de Jahia. Le rendu se consulte dans Page Builder après enregistrement.

La licence du projet d’origine est conservée dans `LICENSE`.
Pour déployer sur une instance locale déjà démarrée, utiliser `yarn deploy` avec
`JAHIA_HOST=http://localhost:8081` et les variables d’authentification du CLI Jahia
transmises au processus. Ne jamais versionner les identifiants.

L’extraction ne nécessite pas de démarrer une deuxième stack Docker.
