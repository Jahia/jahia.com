# Carrousels : livraison unique

Installer uniquement le `package.tgz` de **jahiacom**. Ce package contient les carrousels, les tris partenaires et les icônes de langue. Aucun module carrousel supplémentaire n'est à installer.

Le carrousel de cartes réutilisable propose un titre, une introduction, 1 à 8 cartes par écran sur ordinateur, 1 à 2 sur tablette, une sur mobile, trois espacements et des flèches/pagination facultatives. Il conserve la grille éditable native dans Page Builder. Le rendu se consulte après enregistrement ; aucun panneau d'aperçu avant sauvegarde n'est inclus.

Les types `jahiacom:cardCarousel` et `jahiacom:card` du site sont conservés. Les types réutilisables `jahiacardcarousel:carousel` et `jahiacardcarousel:card` sont fournis par le même package, avec leurs vues, styles, formulaires et traductions FR/EN. Les définitions et propriétés existantes ne sont pas retirées ou migrées.

Ajouter le carrousel réutilisable dans une zone acceptant `jmix:droppableContent`, par exemple un Content Stack. Les cartes incluses permettent de choisir une image, du texte riche et un lien Jahia interne ou externe. Les autres composants enfants restent rendus par leurs propres vues.

Les commandes sont utilisables au clavier, le défilement tactile reste disponible, et la préférence de réduction des animations est prise en compte. Les liens et textes riches des cartes incluses passent par les filtres de sécurité du composant.

Les tests du carrousel font partie des tests communs : `yarn node --test scripts/test-*.mjs`. Le build et la CI produisent un seul artefact installable : `package.tgz`.
