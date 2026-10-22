---
"jahiacom": patch
---

Restore backward-compatible CND definitions so the form improvements can be installed over an existing schema with normal Jahia checks. Keep obsolete fields out of simplified forms and read existing legacy values when their replacements have not been edited. Opening or cancelling a form must not save projected values.

No local content, exports, database dumps or migration tools are included or required for the upgrade. Preserve the target instance's own data; installation is a module update, not a transfer from the development environment.
