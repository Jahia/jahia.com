---
"jahiacom": patch
---

Resolve the `org.jahia.utils.i18n.Messages` Java class on first use instead of at module load, so a failed lookup no longer leaves a JavaScript engine context without the module's views (intermittent "Une erreur s'est produite lors du rendu du contenu" in jContent). Partner level labels fall back to their English default if the lookup fails.
