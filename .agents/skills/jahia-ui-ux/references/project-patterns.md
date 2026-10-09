# Points d'entrée du design Jahia.com

Index initial établi le 2 octobre 2026. Les chemins servent à retrouver les conventions ; leur contenu courant doit être inspecté à chaque intervention.

| Besoin                                     | Sources du projet                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Couleurs, thèmes et dimensions             | `src/templates/themes.css`, `src/theme/index.tsx`, `src/theme/theme.module.css`                                                         |
| Typographie, sémantique et règles globales | `src/templates/global.css`, `src/templates/richtext.css`, `src/templates/forms.css`, imports de fonts dans le layout                    |
| CTA                                        | `src/mixins/CTA/` : réutiliser modèle, rendu et `component.module.css`                                                                  |
| Page et navigation                         | `src/templates/` : Layout, NavBar, footer, Breadcrumb, Search ; `src/views/Page/`                                                       |
| Sections et composition                    | `src/views/Section/`, `src/views/Panel/`, `src/views/Card/`                                                                             |
| Heroes et formats d'images                 | `src/views/HeroWithImage/`, `src/views/HeroWithoutImage/`, `src/views/Testimony/`, sections correspondantes du PDF                      |
| Images et crédits                          | `src/components/Image.tsx`, `src/components/CreditedImage.tsx`, `.codex/knowledge/image-credits.md`                                     |
| Interactions et ressources                 | `src/views/Accordion/`, `src/views/ResourceCarousel/`, `.codex/knowledge/resource-carousel.md`                                          |
| Modèle et expérience éditeur               | `src/**/definition.cnd`, `settings/content-editor-forms/`, `settings/locales/`, `settings/resources/`, `src/components/EditorHints.tsx` |
| Changements et validations                 | Diff courant, `package.json`, scripts existants, connaissances validées ; historique ciblé seulement si nécessaire                      |

Les styles utilisent notamment CSS Modules, variables `--jahia-*`, classes utilitaires et container queries. Rechercher la configuration réelle des utilitaires avec `rg --files` avant de changer ces patterns.

## Écarts repérés à vérifier selon le périmètre

La lecture initiale montre `--jahia-green: #12b08a`, tandis que l'index de charte indique `#25B382`. La couleur de titre par défaut utilise aussi `--jahia-neutral-700: #001020`, tandis que la charte indique Navy `#001932`. Le CTA secondaire mérite une comparaison de sa bordure selon le thème. Ces observations sont des pistes de vérification, pas des exceptions approuvées ni une autorisation de modifier les tokens globalement.

## Régressions déjà documentées

- ResourceCarousel : pagination déterministe 3/2/1 cartes selon breakpoint ; neuf items donnent 3/5/9 pages. Préserver sélection mixte pages/blogs, catégories, fallback, exclusions et editabilité. Ne pas réintroduire une pagination dépendant de mesures précoces pendant l'hydratation.
- Blog : conserver la limite du sticky avant le carousel et les zones éditables avec compatibilité des contenus existants.
- Crédits : préserver le rendu sans crédit ; ne pas généraliser le champ à toutes les cartes. Les images rich-text du blog et les couvertures sont des périmètres différents.
- Breadcrumb : hiérarchie publique utile, pas un parcours aveugle des parents JCR ; vérifier le code actuel et les décisions validées.
- Recherche : maintenir l'accès mobile et les contraintes de publication/visibilité. Le prototype historique décrit dans les connaissances ne remplace pas une vérification de l'implémentation actuelle.
