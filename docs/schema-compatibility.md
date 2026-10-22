# Schema compatibility

The module must install over an existing released schema using Jahia's normal definition checks. A clean development repository is not proof that a deployment can remove properties stored on another instance.

Legacy CND properties and types remain declared for upgrade compatibility. Their existing types, multiplicity, localization and value constraints are retained. Legacy requirements become optional so the same package can also install on an instance where these fields were already removed, and new content can use the simplified editors without duplicating old fields. This relaxes validation and does not rewrite existing values.

Deprecated fields are excluded from the simplified Content Editor forms. Runtime readers use the target instance's existing values when a replacement is absent; explicitly stored new values, including empty values, take precedence. There is no fixed mapping based on local UUIDs or local editorial choices.

The editor may project legacy values into a pristine form baseline in memory. Unchanged projections are excluded from an ordinary save; only an intentional edit writes a replacement field. Opening, changing language or cancelling must not trigger a save or bulk rewrite.

Do not ship local exports, dumps, snapshots or migration scripts. Development data from 8081/8084 is never part of the delivered package. The delivery flow is local tests, GitHub PR/release, then installation of the official artifact by the environment owner. No deployment permission is implied by a local test.
