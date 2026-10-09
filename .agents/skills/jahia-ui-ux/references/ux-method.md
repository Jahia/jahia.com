# Concevoir et évaluer les parcours Jahia

Synthèse consultée le 7 octobre 2026. Les adaptations Jahia ci-dessous sont des décisions de méthode locales ; les liens permettent de vérifier les recommandations d'origine.

## Cadrer avant de composer

Définir la tâche avec une phrase : « En tant que [public supposé ou connu], je veux [action] afin de [résultat] ». Distinguer données fournies, observations et hypothèses. Pour Jahia, les parcours possibles incluent comprendre une solution, évaluer une preuve client, trouver une ressource ou demander une démonstration ; ce sont des scénarios à confirmer, pas des personas validés.

Décrire entrée, étapes, sortie réussie et alternative si l'utilisateur n'est pas prêt à convertir. Une page ressource doit aussi faciliter l'accès au contenu ; multiplier les demandes commerciales n'est pas une réussite utilisateur en soi.

Définir un critère observable avant de coder : destination atteignable au clavier, résultat identifiable, erreur récupérable, tâche éditeur faisable sans code. Une hausse de conversion reste une hypothèse tant qu'aucune mesure réelle ne la démontre.

## Revue heuristique

Les [dix heuristiques de Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/) servent à rechercher des problèmes, pas à appliquer dix recettes graphiques :

| Principe         | Question de revue                                  |
| ---------------- | -------------------------------------------------- |
| État visible     | L'action a-t-elle reçu un retour compréhensible ?  |
| Langage familier | Le vocabulaire correspond-il à celui du public ?   |
| Contrôle         | Peut-on revenir, fermer ou corriger ?              |
| Cohérence        | La même action garde-t-elle le même comportement ? |
| Prévention       | Les erreurs probables peuvent-elles être évitées ? |
| Reconnaissance   | Les options nécessaires sont-elles visibles ?      |
| Efficacité       | Les usages répétés restent-ils simples ?           |
| Sobriété         | Chaque élément aide-t-il la tâche ?                |
| Récupération     | L'erreur explique-t-elle comment avancer ?         |
| Aide             | L'aide utile arrive-t-elle au bon moment ?         |

La [méthode d'évaluation NN/g](https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/) recommande de délimiter la tâche et de parcourir l'interface. Adapter ici la profondeur au changement : inspecter d'abord le déroulement normal, puis erreurs et alternatives. La revue experte complète la recherche utilisateur et ne la remplace pas.

## Architecture de l'information et contenu

Les libellés et leur contexte donnent des indices sur la destination : voir [information scent, NN/g](https://www.nngroup.com/articles/information-scent/). Dans Jahia, vérifier qu'un titre de carte, son type et son CTA annoncent réellement la page cible. Ne pas afficher la structure JCR comme une hiérarchie utilisateur sans vérifier sa pertinence.

Organiser la page selon les questions du lecteur : ce que propose Jahia, pour quel besoin, comment cela fonctionne, preuves, prochaine étape. Adapter cet ordre au public et au contenu ; ne pas en faire un template obligatoire. Favoriser titres informatifs, paragraphes scannables et informations utiles avant les détails.

Limiter la concurrence entre CTA dans une même zone ; la présence d'actions secondaires peut être utile. Éviter les libellés génériques quand une action précise est possible. Ne pas inventer bénéfices, références clients, délais de réponse ou promesses pour remplir une maquette.

## Composition UI et design system

Réutiliser les tokens actuels conformes à la charte : couleurs sémantiques, typographie, espacements, tailles et thèmes. Définir les variantes utiles et leurs états plutôt que créer un style unique par section. Pour les nouveaux choix, documenter leur raison et leur portée ; ne pas figer des mesures universelles comme « tout doit être sur une grille de 8 px ».

Examiner hiérarchie du contenu, proximité des éléments liés, alignements, rythme, longueur des lignes et densité. Un espace vide est utile s'il soutient la lecture. Les images doivent montrer quelque chose de pertinent et garder leur point focal ; ne pas remplacer une explication nécessaire par un visuel décoratif.

Composer avec du contenu FR/EN réaliste : titre long, plusieurs paragraphes, CTA traduit, image absente, nombre variable de cartes. Éviter hauteurs fixes qui tronquent l'éditorial et duplication du DOM pour changer l'ordre mobile. Ne pas exiger une action au-dessus de la ligne de flottaison si cela nuit à la compréhension.

## Choisir comment réduire l'incertitude

- Structure ou vocabulaire difficiles : proposer tri de cartes ou test d'arborescence avec les publics concernés.
- Parcours ou interaction difficiles : proposer un test de tâches sur prototype ou page.
- Arbitrage visuel simple : comparer des variantes avec les mêmes contenus, dimensions et états.
- Hypothèse commerciale : définir mesure et expérimentation seulement si le contexte et les autorisations le permettent.

Les [scénarios de test NN/g](https://www.nngroup.com/articles/task-scenarios-usability-testing/) partent d'un objectif réaliste sans révéler les commandes à utiliser. Exemple local : « Vous cherchez une ressource pour évaluer la personnalisation et souhaitez pouvoir la retrouver ensuite ». Éviter « Cliquez sur le filtre puis la troisième carte ».

Préparer critères de réussite, erreurs, aide nécessaire et questions après la tâche. Lors de vrais tests, distinguer réussite autonome et assistée ; conserver taille et profil de l'échantillon. Une simulation de parcours par l'agent ne produit ni verbatims utilisateur ni statistiques représentatives.

## Expérience Content Editor

Traiter l'éditeur comme un second utilisateur : savoir quel composant choisir, comprendre les champs, configurer les modes et anticiper le rendu. Employer des labels explicites, aides courtes, valeurs initiales raisonnables et options conditionnelles cohérentes avec le modèle réel.

Vérifier contenu existant, propriétés absentes et traductions. Éviter réglages purement CSS exposés sans nécessité éditoriale. Tester prévisualisation, EDIT et LIVE quand disponibles ; leur absence reste une limite, pas une raison de déployer.
