---
jahiacom: patch
---

Restore the Partner testimonial and location editors after a module upgrade by loading their registration script from a new asset URL. This prevents an older cached script from leaving the testimonial field displayed as raw JSON. The editor fields and stored content remain unchanged.
