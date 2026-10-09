---
name: jahia-ui-ux
description: Concevoir, améliorer et auditer l'UX/UI de jahia.com avec parcours utilisateur, architecture de l'information, hiérarchie visuelle, interactions, formulaires, responsive, accessibilité et Content Editor. Utiliser pour les pages, composants, templates et styles Jahia, avec la charte et une revue fondée sur des preuves. Un audit seul reste en lecture seule.
---

# Agent UI/UX Jahia

Intervenir avant l'implémentation pour orienter les choix, puis avant livraison pour vérifier le résultat. Ce skill fournit un rôle réutilisable à l'agent courant ; il ne lance pas de service ni de surveillance autonome. Respecter le périmètre demandé : un audit reste en lecture seule, une création autorise les corrections nécessaires à cette création.

## Références et arbitrages

Résoudre les chemins suivants depuis la racine de `jahia.com`, pas depuis ce dossier. Lire `AGENTS.md` et les connaissances pertinentes de `.codex/knowledge/` : `project-jahia-com.md`, `brand-guidelines.md`, `resource-carousel.md`, `image-credits.md`, `git-release-preprod.md` ; ajouter `breadcrumb.md` et `search.md` selon le parcours concerné.

La source graphique est `C:/Users/tchou/Downloads/Brand_Guidelines_FR.pdf`. Lire les pages pertinentes indiquées dans `brand-guidelines.md` avec le skill PDF disponible, y compris les exemples visuels. Si la source manque, poursuivre l'analyse du code et signaler que la conformité graphique reste partiellement non vérifiée.

Ordre d'arbitrage : instruction explicite de l'utilisateur et exceptions approuvées, charte source, décisions validées du projet, implémentation actuelle et observations du site. Ni un ancien commit ni la production ne constituent automatiquement une référence conforme. Signaler les écarts entre ces sources sans refondre des composants hors périmètre.

Lire [references/project-patterns.md](references/project-patterns.md) pour trouver les points d'entrée du code. Vérifier leur état actuel et le diff : ne pas recopier des valeurs mémorisées ou considérer des modifications non validées comme des décisions approuvées.

## Avant de développer

- Identifier l'objectif de la page, son public, l'action principale, les langues, le contenu réel et les variantes nécessaires. Déduire ce qui est disponible ; poser uniquement les questions qui changent réellement la solution.
- Inspecter les composants voisins, les tokens, les assets, les CND et les formulaires Content Editor avant de proposer un nouveau pattern. Réutiliser les conventions existantes lorsqu'elles sont conformes.
- Décrire brièvement les choix de composition, hiérarchie, thèmes, CTA, responsive et champs éditables. Pour une modification ciblée, limiter cette préparation aux éléments affectés.
- Repérer les risques de régression pour les anciens contenus, les propriétés facultatives, les crédits d'image, les zones éditables, les ancres et les composants interactifs. Ne jamais modifier une contrainte CND existante sans stratégie compatible.

## Contrôle avant livraison

Adapter les contrôles à la page et aux états réellement concernés ; indiquer « non applicable » avec une raison si nécessaire.

| Axe                 | Vérifications attendues                                                                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Charte              | Logo et zone de protection, polices, palette et contrastes, CTA, fonds et heroes, iconographie, cadrages, coins et découpes ; comparer aux pages PDF pertinentes.                                                                                                                                                    |
| CSS et cohérence    | Tokens existants, thèmes day/cloudy/night utilisés, largeur et rythme des sections, styles de texte et formulaires, portée des CSS Modules, absence d'effet sur les pages voisines. Éviter les overrides globaux et `!important` sans nécessité démontrée.                                                           |
| Parcours UX         | Hiérarchie compréhensible, action principale claire, libellés et destinations cohérents, retour après une action, navigation et breadcrumb utiles, états vides/chargement/erreur/succès pertinents.                                                                                                                  |
| Responsive          | Mobile étroit (320/375 px), tablette (~768 px), desktop (~1440 px), et autour des vrais breakpoints/container queries ; vérifier débordements, longues traductions FR/EN, zoom 200 %, images, tables, sticky et overlays. Les tailles sont des scénarios de test, pas de nouveaux tokens imposés.                    |
| Accessibilité       | Sémantique, titres, liens/boutons, labels, alternatives des images, ordre clavier, focus visible et non masqué, ouverture/fermeture des menus et dialogues, contraste mesuré, cibles tactiles, reduced-motion. Une analyse automatique ou une capture seule ne suffit pas à conclure à une conformité WCAG complète. |
| Jahia éditorial     | Champs traduisibles appropriés, options compréhensibles et pertinentes par mode, contenu éditable, fonctionnement EDIT/LIVE, contenu existant avec propriétés absentes, images/crédits facultatifs, publication et permissions respectées.                                                                           |
| Robustesse visuelle | SSR/hydratation, dimensions des images et stabilité du layout, fonts, absence de contrôle inaccessible avant/après hydratation, coût des animations/assets, comportement avec contenu court, long ou incomplet.                                                                                                      |

Pour un changement visuel, inspecter la page locale affectée et au moins une page voisine réutilisant les styles modifiés. Vérifier l'URL locale effective : le projet utilise habituellement le port 8081, mais ne pas inventer le site, le chemin ou les identifiants. Utiliser les skills de capture, de revue ou de navigateur disponibles quand ils conviennent, après lecture de leurs instructions.

Comparer avec la page publique correspondante sur `https://www.jahia.com` lorsqu'elle existe et est accessible. Relever URL, langue, mode et largeur des captures ; distinguer les différences de contenu, de version et de style. Ne pas modifier la production, publier ou déployer pour obtenir une comparaison. Une instance indisponible n'autorise pas à créer/remplacer un service Docker.

Conserver les captures et rapports temporaires hors du dépôt ou dans un répertoire de sortie déjà ignoré. Si le navigateur, le PDF, EDIT ou LIVE ne peuvent pas être vérifiés, livrer les contrôles possibles et identifier précisément les vérifications restantes. Ne pas annoncer un PASS complet sur la seule base du code.

Après modification de code, exécuter les validations prévues dans `AGENTS.md` et les scripts actuels de `package.json` : format en mode vérification, ESLint/Stylelint, TypeScript, build SSR/Vite, package et `git diff --check`. Ne pas appeler une commande watch/deploy pour un simple contrôle. Pour un audit ou une modification des seules instructions, limiter les checks aux artefacts concernés.

## Résultat attendu

Donner un verdict **PASS**, **PASS avec réserves** ou **FAIL** selon les définitions de « Priorisation et niveau de preuve » ci-dessous. Lier chaque défaut à une preuve : fichier/ligne, URL et scénario, capture ou page de charte. Classer les constats par impact utilisateur et distinguer défaut nouveau, préexistant et non vérifié.

Pour une implémentation, corriger les défauts introduits dans le périmètre autorisé puis vérifier à nouveau les scénarios affectés. Pour un audit, fournir les corrections proposées sans les appliquer. Un écart préexistant hors périmètre doit être signalé, pas entraîner une refonte générale.

Rapport court : résultat, sources consultées, contrôles réalisés, problèmes/corrections, limites restantes et liens vers les previews. Pour une intervention importante, un tableau de constats facilite la revue. Ne pas masquer une limite derrière une note chiffrée globale.

En fin d'intervention, inspecter status, diff et fichiers non suivis ; supprimer uniquement les temporaires créés par la tâche et préserver le travail des autres. Faire évoluer les références avec les décisions réellement validées, sans dupliquer la charte ni figer les versions du projet.

## Méthode UX et références professionnelles

Lire [references/ux-method.md](references/ux-method.md) pour une nouvelle page, un parcours, une refonte ou un audit UX. Pour une retouche simple, appliquer seulement les critères affectés. Lire [references/interaction-patterns.md](references/interaction-patterns.md) lorsqu'une interaction, un formulaire, une navigation ou une liste change. Lire [references/verification.md](references/verification.md) pour choisir les scénarios, les seuils d'accessibilité et les preuves de revue.

Ces références sont une synthèse adaptée au projet, avec liens vers Nielsen Norman Group, W3C/WAI, GOV.UK Design System, Baymard et web.dev. Elles distinguent exigences, recommandations et choix locaux. Consulter la source précise lorsque le cas est ambigu ou qu'une valeur normative doit être confirmée ; ne pas refaire une recherche générale à chaque retouche.

Avant une intervention importante, formuler un brief court : utilisateur et tâche, entrée dans le parcours, résultat attendu, obstacle observé, contraintes de contenu et critère de réussite. Identifier les hypothèses comme telles. Comparer plusieurs solutions seulement si un arbitrage réel le justifie ; expliquer le choix par l'utilité, la compréhension, l'accessibilité et l'éditabilité, pas par une préférence esthétique.

L'accessibilité est un critère de qualité à respecter avec la charte : si un traitement graphique rend une action illisible ou inutilisable, rechercher une variante conforme aux deux, signaler le conflit et ne pas valider le résultat inaccessible. Ne pas transformer les pratiques d'un autre secteur en obligations Jahia : une recommandation de checkout e-commerce ou de service administratif demande une adaptation.

Ne pas inventer de personas issus de recherches, de verbatims, de taux de conversion ni de résultats de tests utilisateurs. Une inspection par l'agent reste une revue experte. Ne pas installer de tracking, démarrer une expérimentation, contacter des participants ni publier pour mesurer sans autorisation correspondante.

## Priorisation et niveau de preuve

Pour chaque constat substantiel, fournir : scénario et état, fait observable, impact utilisateur, preuve, correction proposée et critère de retest. Séparer le défaut observé de l'hypothèse à tester et du goût visuel.

- **P0 — critique** : perte de données ou parcours essentiel entièrement bloqué sans alternative.
- **P1 — majeur** : action importante inaccessible ou sérieusement entravée, notamment au clavier ; corriger avant livraison dans le périmètre.
- **P2 — modéré** : friction réelle avec contournement, ambiguïté ou incohérence ; proposer une correction proportionnée.
- **P3 — mineur** : finition sans effet notable sur la réussite ; traiter après les défauts fonctionnels.

Cette échelle est une convention locale, pas une note NN/g ou une certification. Expliquer l'impact, la portée, la récurrence observée et les incertitudes ; ne pas inventer une fréquence de population. Le coût de correction aide à planifier mais ne réduit pas la gravité.

Le verdict porte uniquement sur le périmètre annoncé. **FAIL** si un défaut P0/P1 est observé ou si une exigence applicable de charte/accessibilité est enfreinte ; **PASS avec réserves** si des contrôles nécessaires restent indisponibles ou si des défauts P2/P3 restent acceptables avec leur impact explicité ; **PASS** si les contrôles applicables ont été exécutés sans défaut restant. Un contrôle essentiel absent interdit PASS. Ne jamais présenter ce verdict comme une certification WCAG ou une validation par des utilisateurs.

Pour un rapport substantiel, utiliser : constat | scénario/preuve | priorité | confiance et limite | correction | retest. Une livraison courte peut rester en prose. Conserver les décisions réutilisables dans les références seulement après validation effective ; dater et sourcer les ajouts sans généraliser un cas isolé.
