# Vérification UX/UI fondée sur des preuves

Sources consultées le 7 octobre 2026. Les scénarios Jahia et priorités sont des conventions de revue locales. WCAG 2.2 AA est la cible technique de ce skill, sans présumer du périmètre d'une obligation légale.

## Choisir les scénarios

Pour chaque parcours affecté, noter URL, langue, mode EDIT/LIVE, viewport, entrée, action, résultat attendu et résultat observé. Retester les états modifiés et une page voisine si les styles sont partagés. Une capture démontre une composition ; une interaction exécutée démontre un comportement.

Matrice adaptée au risque : mobile étroit, tablette, desktop et abords des breakpoints réels ; FR/EN ; clavier ; contenu long/incomplet ; chargement/hydratation ; erreur/récupération si applicable. Les dimensions de test ne définissent pas les tokens de production. Inclure zoom texte à 200 % et reflow à largeur équivalente 320 CSS px, souvent obtenu à 400 % sur 1280 px. Selon [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), certaines structures intrinsèquement bidimensionnelles ont des exceptions ; le reste de la page doit rester utilisable.

## Accessibilité : mesurer et manipuler

Le [référentiel WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/) permet de vérifier critères et exceptions :

- Texte : contraste 4,5:1 ; grand texte 3:1 selon la définition WCAG.
- Composants et informations graphiques nécessaires : contraste 3:1 selon 1.4.11 et ses exceptions.
- Clavier : action atteignable, ordre cohérent, focus visible, aucune impasse.
- Sémantique : noms accessibles, headings, labels, alternatives d'images, lien pour naviguer et bouton pour agir.
- Erreurs : identification, aide à la correction et annonces utiles ; ni couleur seule ni message uniquement visuel.
- Interaction : pas de geste complexe ou de glisser-déposer comme unique accès lorsqu'un critère applicable exige une alternative.

[Target Size Minimum, 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) fixe 24 × 24 CSS px avec exceptions, notamment espacement et liens inline. Viser environ 44 × 44 pour les commandes tactiles importantes est une préférence ergonomique du skill ; ne pas présenter 44 px comme le minimum AA universel.

[Focus Not Obscured Minimum, 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) interdit que le composant focalisé soit entièrement masqué par un contenu créé par l'auteur. En pratique, viser une visibilité complète du composant et de son focus sous les headers sticky et overlays ; ce confort dépasse le minimum du critère.

Utiliser un scanner automatique si disponible, puis vérifier manuellement le parcours clavier et les annonces des composants affectés avec un lecteur d'écran si disponible. Un scanner sans erreur ne certifie pas la page. Documenter outil, conditions, résultat et contrôles manuels absents.

## Performance perçue et stabilité

Selon [web.dev Web Vitals](https://web.dev/articles/vitals), les seuils « bons » sont LCP ≤ 2,5 s, INP ≤ 200 ms et CLS ≤ 0,1, évalués au 75e percentile des visites, avec segmentation mobile/desktop. Une capture ou un build ne mesure pas ces valeurs.

En développement, vérifier dimensions réservées, changement de police, éléments tardifs, hero lourd et réponse aux actions. Noter les conditions des mesures de laboratoire ; elles aident à comparer mais ne remplacent pas les données terrain. Lighthouse sans interaction ne mesure pas INP ; TBT n'est qu'un indicateur indirect. Sans mesures, qualifier les risques et ne pas annoncer des seuils atteints. Ne pas ajouter de collecte analytics pour compléter un rapport.

## Critères d'acceptation et rapport

Définir les critères selon la demande : par exemple, une recherche doit être accessible depuis le mobile et ses résultats compréhensibles ; un CTA doit annoncer sa destination et rester utilisable au clavier ; l'éditeur doit modifier le contenu sans changer le code.

Rattacher chaque correction à un scénario reproductible et une preuve avant/après quand possible. Mentionner défaut introduit ou préexistant, criticité locale P0–P3 et confiance. Identifier une hypothèse comme telle, avec le test qui pourrait la confirmer.

PASS : aucun défaut restant dans les critères examinés et contrôles applicables exécutés. PASS avec réserves : limites de vérification ou frictions mineures documentées. FAIL : défaut majeur observé ou exigence applicable enfreinte. Employer les définitions de SKILL.md en cas d'arbitrage ; pas de moyenne chiffrée masquant un blocage.

Exemples de revue de raisonnement, sans intervention sur le site :

| Demande                           | Comportement attendu du skill                                                    |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Auditer un hero                   | Constats et propositions, pas d'édition ; conformité PDF non vérifiée si absent. |
| Améliorer un formulaire           | Justifier les champs, préserver les saisies, tester erreurs et succès réel.      |
| Agrandir tous les liens à 44 px   | Distinguer préférence ergonomique, minimum AA et exceptions inline.              |
| Refaire la pagination du carousel | Préserver 3/2/1, hydratation et contenus existants ; contrôler clavier.          |
| Garantir +20 % de conversions     | Présenter une hypothèse et un plan de mesure, jamais un résultat inventé.        |
| Valider sans accès à Jahia        | Revue de code possible, contrôle EDIT/LIVE indisponible, pas de PASS complet.    |

Ces cas vérifient la cohérence des instructions ; ils ne sont ni tests utilisateurs ni tests exécutés du site.
