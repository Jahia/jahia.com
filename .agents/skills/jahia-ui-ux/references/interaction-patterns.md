# Interactions et patterns à adapter à Jahia

Sources consultées le 7 octobre 2026. Les règles d'implémentation doivent suivre le composant réel et les besoins ; ne pas importer l'apparence d'un autre design system.

## Navigation, recherche et ressources

Maintenir accès mobile, position dans le site et retour navigateur. Les menus doivent fonctionner sans survol ; ne pas imposer les rôles ARIA de menu applicatif à une navigation de liens ordinaires. Les [patterns WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) précisent les interactions clavier des widgets complexes ; préférer les éléments HTML natifs quand ils suffisent.

Pour recherche/filtres, rendre état actif, résultats et remise à zéro compréhensibles. Conserver les critères lors d'un retour si pertinent. Une absence de résultats doit permettre d'élargir la recherche. Distinguer absence de contenu, filtrage vide et erreur technique. N'annoncer les mises à jour aux lecteurs d'écran qu'au moment utile.

Cartes : destination claire, structure sémantique et pas de contrôles interactifs imbriqués. Vérifier titres longs et métadonnées réellement disponibles. Carousels : commandes accessibles, position compréhensible, accès à tous les items et alternative au geste de balayage. Préserver les invariants ResourceCarousel du projet ; un carousel n'est pas automatiquement le meilleur choix pour un contenu important.

## Formulaires et récupération

[GOV.UK Question pages](https://design-system.service.gov.uk/patterns/question-pages/) invite à justifier chaque information demandée. Pour Jahia, demander seulement ce qui sert la tâche et expliquer les champs inhabituels. Une question par page est un pattern de service à évaluer, pas une obligation pour un formulaire de démonstration court.

Labels persistants et associés aux champs ; placeholders seulement comme exemples complémentaires. Configurer type, autocomplete et clavier selon la donnée. Indiquer clairement ce qui est facultatif ; garder une convention cohérente avec le formulaire existant. Permettre les formats humains raisonnables quand le backend le permet.

La [recherche Baymard sur la validation inline](https://baymard.com/research-articles/inline-form-validation) insiste sur son bon timing. Éviter de signaler une erreur avant que la saisie soit suffisamment avancée ; actualiser le message après correction. Vérifier aussi à la soumission. Les résultats e-commerce orientent une hypothèse Jahia sans prouver son impact commercial ici.

Le [résumé d'erreurs GOV.UK](https://design-system.service.gov.uk/components/error-summary/) relie chaque erreur au champ concerné et reçoit le focus. Adapter ce comportement aux formulaires où plusieurs erreurs sont difficiles à repérer. Garder messages cohérents entre résumé et champ, données saisies préservées, correction compréhensible. Un défaut du service demande une explication et une voie de reprise, pas une accusation du champ.

Après envoi : annoncer le succès et la prochaine étape avec des informations exactes. Prévenir doubles soumissions sans rendre l'attente muette. Ne jamais inventer une soumission réussie lorsqu'aucune intégration ne fonctionne.

## Dialogues, accordéons et états

Appliquer le pattern APG pertinent, pas une accumulation d'attributs ARIA. Dialogue modal : nom accessible, focus initial adapté, focus contenu dans le dialogue, fermeture disponible et retour au déclencheur. Accordéon : bouton et état déplié synchronisé. Onglets : clavier et relation onglet/panneau conformes au pattern.

Prévoir, selon le composant : initial, focus, actif/sélectionné, attente, vide, erreur, succès, indisponible. Distinguer indisponibilité d'une action et chargement. Un contrôle désactivé sans explication peut masquer le prochain pas. Ne pas créer artificiellement tous ces états pour un bloc statique.

Animations : garder fonction et information sans mouvement, respecter reduced-motion et permettre arrêt des contenus automatiques applicables. Vérifier que sticky, consentement ou overlay ne cachent ni lecture ni commande. Les états visuels doivent rester cohérents dans day/cloudy/night.

## Conversion et confiance

Préciser ce qui se passera après le CTA et montrer des preuves vérifiables près des affirmations qui en ont besoin. Ne pas cacher accès à une ressource, introduire urgence fictive, cases précochées trompeuses ou consentement forcé. Faciliter une décision éclairée fait partie de l'UX. Les choix de collecte et de tracking relèvent d'une autorisation distincte.
