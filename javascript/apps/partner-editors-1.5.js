(function () {
  "use strict";

  var REACT_ELEMENT = Symbol.for("react.element");
  var REGIONS = ["europe", "americas", "apac"];

  function h(type, props, key, ref) {
    return {
      $$typeof: REACT_ELEMENT,
      type: type,
      key: key !== undefined && key !== null ? String(key) : null,
      ref: ref || null,
      props: props || {},
      _owner: null,
      _store: {},
    };
  }

  function labels() {
    var french = (document.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;
    return french
      ? {
          add: "Ajouter",
          region: "Région",
          location: "Localisation",
          country: "Pays",
          countryPlaceholder: "Ex. France",
          emptyRegion: "Choisir une région",
          incomplete: "Sélectionnez une région et renseignez son pays.",
          remove: "Supprimer",
          regions: { europe: "Europe", americas: "Amériques", apac: "Asie-Pacifique" },
        }
      : {
          add: "Add",
          region: "Region",
          location: "Location",
          country: "Country",
          countryPlaceholder: "E.g. France",
          emptyRegion: "Choose a region",
          incomplete: "Select a region and enter its country.",
          remove: "Remove",
          regions: { europe: "Europe", americas: "Americas", apac: "Asia Pacific" },
        };
  }

  function parse(value) {
    if (!value) return [];
    try {
      var parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (row) {
          return row && (row.region === "" || REGIONS.indexOf(row.region) !== -1);
        })
        .map(function (row) {
          return {
            region: row.region,
            country: typeof row.country === "string" ? row.country : "",
          };
        });
    } catch {
      return [];
    }
  }

  function PartnerLocationsPicker(props) {
    var moonstone = window.jahia.moonstone;
    var text = labels();
    var rows = parse(props.value);
    var disabled = Boolean(props.readOnly || props.disabled);
    function change(nextRows) {
      if (props.onChange) props.onChange(JSON.stringify(nextRows));
    }
    function update(index, key, value) {
      var next = rows.slice();
      next[index] = Object.assign({}, rows[index], { [key]: value });
      change(next);
    }
    return h("div", {
      style: { display: "flex", flexDirection: "column", gap: 24 },
      children: rows
        .map(function (row, index) {
          return h(
            "div",
            {
              "role": "group",
              "aria-label": text.location + " " + (index + 1),
              "style": { display: "flex", flexDirection: "column", gap: 16 },
              "children": [
                h(
                  moonstone.Typography,
                  { variant: "subheading", children: text.location + " " + (index + 1) },
                  "title",
                ),
                h(
                  "div",
                  {
                    style: {
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                      gap: 24,
                    },
                    children: [
                      h(
                        moonstone.Field,
                        {
                          label: text.region,
                          style: { padding: 0, minWidth: 0 },
                          children: h(moonstone.Dropdown, {
                            data: REGIONS.map(function (region) {
                              return { label: text.regions[region], value: region };
                            }),
                            value: row.region,
                            placeholder: text.emptyRegion,
                            variant: "outlined",
                            size: "medium",
                            isDisabled: disabled,
                            onChange: function (_, item) {
                              update(index, "region", item.value);
                            },
                          }),
                        },
                        "region",
                      ),
                      h(
                        moonstone.Field,
                        {
                          label: text.country,
                          style: { padding: 0, minWidth: 0 },
                          children: h(moonstone.Input, {
                            "aria-label": text.country,
                            "size": "big",
                            "value": row.country,
                            "placeholder": text.countryPlaceholder,
                            "isDisabled": disabled,
                            "onChange": function (event) {
                              update(index, "country", event.target.value);
                            },
                          }),
                        },
                        "country",
                      ),
                    ],
                  },
                  "fields",
                ),
                h(
                  moonstone.Button,
                  {
                    label: text.remove,
                    variant: "ghost",
                    isDisabled: disabled,
                    style: { alignSelf: "flex-end" },
                    onClick: function () {
                      change(
                        rows.filter(function (_, position) {
                          return position !== index;
                        }),
                      );
                    },
                  },
                  "remove",
                ),
              ],
            },
            index,
          );
        })
        .concat(
          h(
            moonstone.Button,
            {
              label: text.add,
              variant: "outlined",
              color: "accent",
              isDisabled: disabled,
              style: { alignSelf: "flex-start" },
              onClick: function () {
                change(rows.concat({ region: "", country: "" }));
              },
            },
            "add",
          ),
        ),
    });
  }

  // Reuse Content Editor's real image Picker, including its ReferenceCard and media metadata.
  function PartnerLogoPicker(props) {
    var field = Object.assign({}, props.parent.field, {
      name: props.parent.field.name + "-logo-" + props.index,
      multiple: false,
      readOnly: props.disabled,
      selectorOptions: [{ name: "type", value: "image" }],
      valueConstraints: [{ displayValue: "jmix:image", value: { string: "jmix:image" } }],
    });
    var selector = window.jahia.uiExtender.registry
      .get("selectorType", "Picker")
      .resolver(field.selectorOptions, field);
    var picker = h(selector.cmp, {
      field: field,
      value: props.row.logoId || undefined,
      editorContext: props.parent.editorContext,
      inputContext: Object.assign({}, props.parent.inputContext, {
        selectorType: selector,
        displayActions: false,
      }),
      onChange: props.onChange,
      onBlur: function () {
        if (props.parent.onBlur) props.parent.onBlur();
      },
    });
    return h("div", {
      style: { display: "flex", alignItems: "center", gap: 8 },
      children: [
        h("div", { style: { flex: 1, minWidth: 0 }, children: picker }, "picker"),
        props.row.logoId &&
          h(
            window.jahia.moonstone.Button,
            {
              label: (document.documentElement.lang || "").startsWith("fr")
                ? "Retirer le logo"
                : "Remove logo",
              variant: "ghost",
              isDisabled: props.disabled,
              onClick: function () {
                props.onChange(undefined);
              },
            },
            "clear",
          ),
      ],
    });
  }

  function PartnerTestimonialsPicker(props) {
    var moonstone = window.jahia.moonstone;
    var french = (document.documentElement.lang || "").startsWith("fr");
    var text = french
      ? {
          logo: "Logo de l’entreprise",
          selectLogo: "Choisir un logo",
          changeLogo: "Changer le logo",
          removeLogo: "Retirer le logo",
          comment: "Commentaire",
          attribution: "Auteur / Entreprise",
          add: "Ajouter",
          quote: "Citation",
          remove: "Supprimer",
        }
      : {
          logo: "Company logo",
          selectLogo: "Choose a logo",
          changeLogo: "Change logo",
          removeLogo: "Remove logo",
          comment: "Comment",
          attribution: "Author / Company",
          add: "Add",
          quote: "Quote",
          remove: "Remove",
        };
    var rows;
    try {
      var parsed = JSON.parse(props.value || "[]");
      rows = Array.isArray(parsed) ? parsed : [];
    } catch {
      rows = [];
    }
    if (!rows.length) rows = [{ comment: "", attribution: "" }];
    var disabled = Boolean(props.readOnly || props.disabled);
    function change(nextRows) {
      if (props.onChange) props.onChange(JSON.stringify(nextRows));
    }
    return h("div", {
      style: { display: "flex", flexDirection: "column", gap: 24 },
      children: rows
        .map(function (row, index) {
          return h(
            "div",
            {
              "role": "group",
              "aria-label": text.quote + " " + (index + 1),
              "style": { display: "flex", flexDirection: "column", gap: 16 },
              "children": [
                h(
                  moonstone.Typography,
                  { variant: "subheading", children: text.quote + " " + (index + 1) },
                  "title",
                ),
                h(
                  moonstone.Field,
                  {
                    label: text.logo,
                    children: h(PartnerLogoPicker, {
                      parent: props,
                      row: row,
                      index: index,
                      disabled: disabled,
                      onChange: function (value) {
                        var next = rows.slice();
                        next[index] = Object.assign({}, row);
                        if (value) next[index].logoId = value;
                        else delete next[index].logoId;
                        delete next[index].logoName;
                        change(next);
                      },
                    }),
                  },
                  "logo",
                ),
                ...["comment", "attribution"].map(function (key) {
                  return h(
                    moonstone.Field,
                    {
                      label: text[key],
                      children: h(key === "comment" ? moonstone.Textarea : moonstone.Input, {
                        "aria-label": text[key],
                        "value":
                          (key === "attribution"
                            ? (row.attribution ??
                              [row.author, row.company ?? row.authorTitle]
                                .filter(Boolean)
                                .join(" — "))
                            : row[key]) || "",
                        "rows": key === "comment" ? 4 : undefined,
                        "isDisabled": disabled,
                        "onChange": function (event) {
                          var next = rows.slice();
                          next[index] = Object.assign({}, row, { [key]: event.target.value });
                          if (key === "comment") delete next[index].html;
                          change(next);
                        },
                      }),
                    },
                    key,
                  );
                }),
                h(
                  moonstone.Button,
                  {
                    label: text.remove,
                    variant: "ghost",
                    isDisabled: disabled,
                    style: { alignSelf: "flex-end" },
                    onClick: function () {
                      change(
                        rows.filter(function (_, position) {
                          return position !== index;
                        }),
                      );
                    },
                  },
                  "remove",
                ),
              ],
            },
            index,
          );
        })
        .concat(
          h(
            moonstone.Button,
            {
              label: text.add,
              variant: "outlined",
              color: "accent",
              isDisabled: disabled,
              style: { alignSelf: "flex-start" },
              onClick: function () {
                change(rows.concat({ comment: "", attribution: "" }));
              },
            },
            "add",
          ),
        ),
    });
  }
  window.jahia.uiExtender.registry.add("selectorType", "PartnerTestimonialsPicker", {
    cmp: PartnerTestimonialsPicker,
    supportMultiple: false,
  });

  window.jahia.uiExtender.registry.add("selectorType", "PartnerLocationsPicker", {
    cmp: PartnerLocationsPicker,
    supportMultiple: false,
  });

  // Blog suggestions use Content Editor's current, unsaved values and native Category selector.
  // Prefill the draft only; publishing and saving remain normal editorial actions.
  var registry = window.jahia.uiExtender.registry;
  var topicRoot = "/sites/systemsite/categories/topics/";
  var suggestionSessions = new WeakMap();
  var aliases = {
    cms: [
      "content management system",
      "gestion de contenu",
      "jcontent",
      "content editor",
      "editeur de contenu",
    ],
    dxp: ["digital experience platform", "plateforme d experience numerique"],
    seo: ["referencement naturel", "search engine optimization"],
    web_accessibility: ["accessibilite", "accessibility", "wcag", "rgaa"],
    customer_journey: ["parcours client"],
    ux_cx: [
      "experience utilisateur",
      "user experience",
      "customer experience",
      "experience client",
    ],
    personalization: ["personnalisation", "personalisation"],
    data_privacy: ["confidentialite", "protection des donnees"],
    gdpr: ["rgpd"],
    multilingual: [
      "multilingue",
      "translation",
      "traduction",
      "multilingual editing",
      "edition multilingue",
    ],
    multisite: ["usine a sites", "site factory", "multi site"],
    localization: ["localisation"],
    security: ["securite", "cybersecurite", "cybersecurity"],
    sovereignty: ["souverainete"],
    portal: ["portail", "portails", "portals"],
    ai: ["intelligence artificielle", "artificial intelligence", "ia"],
    dam: ["digital asset management", "gestion des assets", "gestion des actifs numeriques"],
    crm: ["customer relationship management", "gestion de la relation client"],
    pim: ["product information management", "gestion des informations produit"],
    cdp: ["customer data platform", "plateforme de donnees clients"],
    headless_cms: ["headless", "cms decouple"],
    augmented_search: ["recherche augmentee"],
    open_source: ["open source"],
  };

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function readableText(value) {
    var text = String(value || "")
      .slice(0, 200000)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]*>/g, " ");
    var decoder = document.createElement("textarea");
    decoder.innerHTML = text;
    return decoder.value.replace(/\s+/g, " ").trim();
  }

  function plainText(value) {
    return " " + normalizeText(readableText(value)) + " ";
  }

  function suggestTopics(categories, input) {
    // Score headings separately: neither hidden scripts nor duplicated heading text
    // should inflate body relevance. Keep extraction bounded like readableText.
    var body = String(input.text || "")
      .slice(0, 200000)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
    var headings = [];
    body = body.replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, function (_, heading) {
      headings.push(heading);
      return " ";
    });
    var parts = [
      plainText(input["jcr:title"]),
      plainText(input.summary),
      plainText(headings.join(" ")),
      plainText(body),
    ];
    return categories
      .filter(function (category) {
        return category.path && category.path.indexOf(topicRoot) === 0;
      })
      .map(function (category) {
        var leaf = category.path.split("/").pop();
        var terms = Array.from(
          new Set(
            [leaf, category.label]
              .concat(aliases[leaf] || [])
              .map(normalizeText)
              .filter(function (term) {
                return term.length >= 2;
              }),
          ),
        );
        var matched = [];
        var counts = [0, 0, 0, 0];
        var firstMention = Number.MAX_SAFE_INTEGER;
        var offset = 0;
        parts.forEach(function (part, index) {
          terms.forEach(function (term) {
            var expression = new RegExp("\\b" + term + "\\b", "g");
            var occurrences = Array.from(part.matchAll(expression));
            if (occurrences.length > 0) {
              matched.push(term);
              // Synonyms describe the same topic; do not count overlapping aliases twice.
              counts[index] = Math.max(counts[index], occurrences.length);
              firstMention = Math.min(firstMention, offset + occurrences[0].index);
            }
          });
          offset += part.length;
        });
        var bodyScore = counts[3] <= 3 ? counts[3] : Math.min(6, 3 + Math.log2(counts[3] - 2));
        return Object.assign({}, category, {
          score:
            Math.min(counts[0], 1) * 20 +
            Math.min(counts[1], 1) * 10 +
            Math.min(counts[2], 2) * 6 +
            bodyScore,
          firstMention: firstMention,
          reason: Array.from(new Set(matched)).join(", "),
        });
      })
      .filter(function (category) {
        return category.score >= 3;
      })
      .sort(function (a, b) {
        return b.score - a.score || a.firstMention - b.firstMention || a.path.localeCompare(b.path);
      })
      .filter(function (category, _, all) {
        return !all.some(function (other) {
          return other.path.indexOf(category.path + "/") === 0;
        });
      })
      .slice(0, 5);
  }

  // Glossary classification is identity-based: never score incidental definition/comparison text.
  function suggestGlossaryTopics(categories, input) {
    var term = normalizeText(readableText(input["jcr:title"]));
    var exactAliases = {
      portal: ["web portal", "portail web"],
      web_accessibility: ["web accessibility", "accessibilite web"],
      cms: ["content management system", "systeme de gestion de contenu"],
      dxp: ["digital experience platform", "plateforme d experience numerique"],
      seo: ["search engine optimization", "referencement naturel"],
      crm: ["customer relationship management", "gestion de la relation client"],
      dam: ["digital asset management", "gestion des actifs numeriques"],
      pim: ["product information management", "gestion des informations produit"],
      cdp: ["customer data platform", "plateforme de donnees clients"],
      gdpr: [
        "rgpd",
        "general data protection regulation",
        "reglement general sur la protection des donnees",
      ],
      ai: ["intelligence artificielle", "artificial intelligence"],
      headless_cms: ["cms headless", "cms decouple"],
    };
    return categories
      .filter(function (category) {
        if (!category.path || category.path.indexOf(topicRoot) !== 0 || !term) return false;
        var leaf = category.path.split("/").pop();
        var names = [leaf, category.label].concat(exactAliases[leaf] || []);
        return names.some(function (name) {
          return normalizeText(name) === term;
        });
      })
      .filter(function (category, _, all) {
        return !all.some(function (other) {
          return other.path.indexOf(category.path + "/") === 0;
        });
      })
      .map(function (category) {
        return Object.assign({}, category, { reason: readableText(input["jcr:title"]) });
      });
  }

  function suggestClassification(categories, input) {
    var title = plainText(input["jcr:title"]);
    var lead = title + plainText(input.summary);
    var product = /\b(jcontent|jahia|jexperience|jcustomer)\b/.test(lead);
    var editorialUpdate =
      /\b(product updates?|product news|release notes?|nouveautes? produit|maj produit|mises? a jour produit)\b/.test(
        lead,
      );
    var release = /\b(nouveautes?|nouvelle version|new version|release|released|announcing)\b/.test(
      lead,
    );
    var versionedTitle = /\b(jcontent|jahia|jexperience|jcustomer)\s+\d+\s+\d+\b/.test(title);
    var tutorial =
      /\b(how to|tutorial|guide|comment|tutoriel|migrer|migration|upgrade to|mettre a jour)\b/.test(
        title,
      );
    var updates = !tutorial && (editorialUpdate || (product && (release || versionedTitle)));
    var jahiaCms =
      /\bjcontent\b/.test(lead) ||
      (/\bjahia\b/.test(lead) && /\b(cms|dxp|content editor|gestion de contenu)\b/.test(lead));
    var dimensions = categories
      .filter(function (category) {
        return (
          (updates && category.path === "/sites/systemsite/categories/blogTypes/product-updates") ||
          (jahiaCms &&
            category.path ===
              "/sites/systemsite/categories/products/enterprise_cms_and_dxp_for_organizations")
        );
      })
      .map(function (category) {
        return Object.assign({}, category, {
          reason:
            category.path.indexOf("/blogTypes/") !== -1
              ? readableText(input["jcr:title"])
              : "Jahia / jContent",
        });
      });
    return dimensions.concat(suggestTopics(categories, input));
  }

  // GraphQL AST for a fixed read-only query (no article text is sent to the server).
  // Uses the same nodeByPath/descendants contract as jContent's ChoiceTree query.
  function gqlName(value) {
    return { kind: "Name", value: value };
  }
  function gqlField(name, children, args) {
    var result = { kind: "Field", name: gqlName(name), arguments: args || [] };
    if (children) result.selectionSet = { kind: "SelectionSet", selections: children };
    return result;
  }
  function gqlArgument(name, value) {
    return { kind: "Argument", name: gqlName(name), value: value };
  }
  var categoriesQuery = {
    kind: "Document",
    definitions: [
      {
        kind: "OperationDefinition",
        operation: "query",
        name: gqlName("BlogTopicSuggestions"),
        variableDefinitions: [
          {
            kind: "VariableDefinition",
            variable: { kind: "Variable", name: gqlName("language") },
            type: { kind: "NonNullType", type: { kind: "NamedType", name: gqlName("String") } },
          },
        ],
        selectionSet: {
          kind: "SelectionSet",
          selections: [
            gqlField("jcr", [
              gqlField(
                "nodeByPath",
                [
                  gqlField(
                    "descendants",
                    [
                      gqlField("nodes", [
                        gqlField("uuid"),
                        gqlField("path"),
                        gqlField("displayName", null, [
                          gqlArgument("language", { kind: "Variable", name: gqlName("language") }),
                        ]),
                      ]),
                    ],
                    [
                      gqlArgument("typesFilter", {
                        kind: "ObjectValue",
                        fields: [
                          {
                            kind: "ObjectField",
                            name: gqlName("types"),
                            value: {
                              kind: "ListValue",
                              values: [{ kind: "StringValue", value: "jnt:category" }],
                            },
                          },
                        ],
                      }),
                    ],
                  ),
                ],
                [
                  gqlArgument("path", {
                    kind: "StringValue",
                    value: "/sites/systemsite/categories",
                  }),
                ],
              ),
            ]),
          ],
        },
      },
    ],
  };

  function assistantLabels(context) {
    return String(context.uilang || context.lang || "").indexOf("fr") === 0
      ? {
          title: "Classification automatique",
          help:
            context.nodeTypeName === "jahiacom:glossaryEntry" ||
            (context.nodeData &&
              context.nodeData.primaryNodeType &&
              context.nodeData.primaryNodeType.name === "jahiacom:glossaryEntry")
              ? "Seules les catégories correspondant exactement au terme sont proposées. Vos choix existants sont conservés."
              : "Les catégories se remplissent à partir du texte de votre article. Vos choix existants sont conservés.",
          details: "Fonctionnement et champs SEO",
          explanation:
            "Le titre SEO, la description et l’image de partage sont préremplis lorsqu’ils sont vides. Les Meta Keywords ne sont pas remplis automatiquement. Si vous modifiez un champ à la main, il ne sera plus mis à jour automatiquement pendant cette session.",
          suggestions: "Suggestions à ajouter",
          loading: "Analyse des thématiques…",
          empty: "Aucune suggestion supplémentaire pour le moment.",
          error:
            "Suggestions indisponibles. La sélection manuelle reste disponible ; modifiez le texte pour réessayer.",
          add: "Ajouter : ",
          reason: "Expressions repérées : ",
        }
      : {
          title: "Automatic classification",
          help:
            context.nodeTypeName === "jahiacom:glossaryEntry" ||
            (context.nodeData &&
              context.nodeData.primaryNodeType &&
              context.nodeData.primaryNodeType.name === "jahiacom:glossaryEntry")
              ? "Only categories matching the term exactly are suggested. Your existing choices are preserved."
              : "Categories are filled from your article text. Your existing choices are preserved.",
          details: "How it works and SEO fields",
          explanation:
            "Empty SEO titles, descriptions and sharing images are prefilled. Meta Keywords are not filled automatically. If you edit a field manually, automatic updates to that field stop for this session.",
          suggestions: "Suggested categories",
          loading: "Analyzing topics…",
          empty: "No additional suggestions for now.",
          error:
            "Suggestions unavailable. Manual selection is still available; edit the text to retry.",
          add: "Add: ",
          reason: "Matching phrases: ",
        };
  }

  function BlogCategoryAssistant(props) {
    var native = registry.get("selectorType", "Category");
    var field = props.field;
    var state = field.jahiacomTopicSuggestions || { status: "loading", items: [] };
    var text = assistantLabels(props.editorContext);
    var selected = Array.isArray(props.value) ? props.value : [];
    var available = state.items.filter(function (item) {
      return selected.indexOf(item.uuid) === -1;
    });
    var disabled = Boolean(field.readOnly || props.readOnly || props.disabled);
    var Typography = window.jahia.moonstone.Typography;
    return h("div", {
      children: [
        h(
          native.cmp,
          Object.assign({}, props, {
            field: Object.assign({}, field, {
              selectorOptions: (field.selectorOptions || []).slice(),
            }),
          }),
          "categories",
        ),
        h(
          "div",
          {
            style: { marginTop: 16, display: "flex", flexDirection: "column", gap: 8 },
            children: [
              h(Typography, { variant: "subheading", children: text.title }, "title"),
              h(Typography, { variant: "body", children: text.help }, "help"),
              h(
                Typography,
                {
                  variant: "caption",
                  role: "status",
                  children:
                    state.status === "loading"
                      ? text.loading
                      : state.status === "error"
                        ? text.error
                        : available.length === 0
                          ? text.empty
                          : text.suggestions,
                },
                "status",
              ),
              available.length > 0 &&
                h(
                  "ul",
                  {
                    style: {
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    },
                    children: available.map(function (item) {
                      return h(
                        "li",
                        {
                          style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 4,
                          },
                          children: [
                            h(
                              window.jahia.moonstone.Button,
                              {
                                label: text.add + item.label,
                                variant: "outlined",
                                isDisabled: disabled,
                                onClick: function () {
                                  if (disabled) return;
                                  props.onChange(Array.from(new Set(selected.concat(item.uuid))));
                                  if (props.onBlur) props.onBlur();
                                },
                              },
                              "add",
                            ),
                            h(
                              Typography,
                              { variant: "caption", children: text.reason + item.reason },
                              "reason",
                            ),
                          ],
                        },
                        item.uuid,
                      );
                    }),
                  },
                  "suggestions",
                ),
              h(
                "details",
                {
                  children: [
                    h(
                      "summary",
                      {
                        style: { cursor: "pointer" },
                        children: h(Typography, {
                          component: "span",
                          variant: "caption",
                          children: text.details,
                        }),
                      },
                      "summary",
                    ),
                    h(
                      Typography,
                      { variant: "caption", style: { marginTop: 8 }, children: text.explanation },
                      "explanation",
                    ),
                  ],
                },
                "details",
              ),
            ],
          },
          "assistant",
        ),
      ],
    });
  }

  registry.add("selectorType", "BlogCategoryAssistant", {
    cmp: BlogCategoryAssistant,
    supportMultiple: true,
  });

  function formFields(context) {
    return (context.sections || []).flatMap(function (section) {
      return (section.fieldSets || []).flatMap(function (fieldset) {
        return fieldset.fields || [];
      });
    });
  }

  var automaticFields = ["j:defaultCategory", "htmlTitle", "jcr:description", "openGraphImage"];
  function emptyValue(value) {
    return value == null || value === "" || (Array.isArray(value) && value.length === 0);
  }
  function sameValue(first, second) {
    if (Array.isArray(first) && Array.isArray(second))
      return JSON.stringify(first.slice().sort()) === JSON.stringify(second.slice().sort());
    return first === second || (emptyValue(first) && emptyValue(second));
  }
  function fieldState(session, field, value) {
    if (!session.fields[field.propertyName])
      session.fields[field.propertyName] = { last: value, locked: !emptyValue(value) };
    return session.fields[field.propertyName];
  }
  function fillDraftField(session, property, value) {
    var context = session.context;
    var field = formFields(context).find(function (item) {
      return item.propertyName === property;
    });
    if (!field || field.readOnly || context.readOnly || context.formik.isSubmitting) return;
    var current = context.formik.values[field.name];
    var state = fieldState(session, field, current);
    if (!sameValue(current, state.last)) {
      state.locked = true;
      state.manual = true;
    }
    if (state.locked || sameValue(current, value)) return;
    state.last = value;
    context.formik.setFieldValue(field.name, value);
  }
  function completeDescription(input, language, isGlossary) {
    var text = readableText(input.summary) || readableText(input.text || input.body);
    if (!text) return "";
    var sentences =
      typeof Intl.Segmenter === "function"
        ? Array.from(
            new Intl.Segmenter(language || "en", { granularity: "sentence" }).segment(text),
            function (part) {
              return part.segment.trim();
            },
          )
        : text.match(/[^.!?]+[.!?]+(?:["»”])?(?=\s|$)/g) || [];
    var result = "";
    for (var index = 0; index < sentences.length; index++) {
      var sentence = sentences[index].trim();
      if (!/[.!?]["»”]?$/.test(sentence) || /(?:\.\.\.|…)["»”]?$/.test(sentence)) break;
      var candidate = result ? result + " " + sentence : sentence;
      if (candidate.length > 160) break;
      result = candidate;
    }
    if (result) return result;
    // No arbitrary word cut: use a complete descriptive sentence when the source
    // has no complete sentence that fits. Existing editorial descriptions stay protected.
    var term = readableText(input["jcr:title"]);
    if (!isGlossary) {
      var article =
        String(language).indexOf("fr") === 0
          ? "Lisez notre article « " + term + " » sur le blog Jahia."
          : "Read our article “" + term + "” on the Jahia blog.";
      return term && article.length <= 160
        ? article
        : String(language).indexOf("fr") === 0
          ? "Découvrez cet article et ses explications sur le blog Jahia."
          : "Explore this article and its insights on the Jahia blog.";
    }
    var fallback =
      String(language).indexOf("fr") === 0
        ? "Découvrez la définition de « " + term + " » et son utilisation dans le glossaire Jahia."
        : "Learn what “" + term + "” means and how it is used in the Jahia glossary.";
    return term && fallback.length <= 160
      ? fallback
      : String(language).indexOf("fr") === 0
        ? "Découvrez la définition et les usages de ce terme dans le glossaire Jahia."
        : "Explore the definition and uses of this term in the Jahia glossary.";
  }
  function prefillSeo(session, input) {
    fillDraftField(session, "htmlTitle", readableText(input["jcr:title"]));
    fillDraftField(
      session,
      "jcr:description",
      completeDescription(input, session.language, session.nodeType === "jahiacom:glossaryEntry"),
    );
    if (input.image !== undefined) fillDraftField(session, "openGraphImage", input.image || null);
  }
  function prefillClassification(session, categories, suggestions, input) {
    var field = formFields(session.context).find(function (item) {
      return item.propertyName === "j:defaultCategory";
    });
    if (field) {
      var current = session.context.formik.values[field.name];
      var state = fieldState(session, field, current);
      var formatIds = categories
        .filter(function (item) {
          return (
            item.path === "/sites/systemsite/categories/resourcestypes/blog" ||
            item.path === "/sites/systemsite/categories/pageTypes/blog_post"
          );
        })
        .map(function (item) {
          return item.uuid;
        });
      // Existing format categories are defaults, not editorial choices.
      // Never reopen a field that the editor manually changed in this session.
      if (
        !state.manual &&
        sameValue(current, state.last) &&
        Array.isArray(current) &&
        current.every(function (id) {
          return formatIds.indexOf(id) !== -1;
        })
      ) {
        state.locked = false;
      }
    }
    var paths = new Set();
    if (readableText(input["jcr:title"] || input.summary || input.text)) {
      paths.add("/sites/systemsite/categories/resourcestypes/blog");
      paths.add("/sites/systemsite/categories/pageTypes/blog_post");
      suggestions.forEach(function (item) {
        var path = item.path;
        paths.add(path);
        while (path.indexOf(topicRoot) === 0) {
          paths.add(path);
          path = path.slice(0, path.lastIndexOf("/"));
        }
      });
    }
    fillDraftField(
      session,
      "j:defaultCategory",
      categories
        .filter(function (item) {
          return paths.has(item.path);
        })
        .map(function (item) {
          return item.uuid;
        }),
    );
  }

  function showSuggestions(context, state) {
    // Clone the field: Content Editor's FastField refreshes when its descriptor changes.
    (context.sections || []).forEach(function (section) {
      (section.fieldSets || []).forEach(function (fieldset) {
        fieldset.fields = (fieldset.fields || []).map(function (field) {
          return field.propertyName === "j:defaultCategory"
            ? Object.assign({}, field, {
                selectorType: "BlogCategoryAssistant",
                jahiacomTopicSuggestions: state,
              })
            : field;
        });
      });
    });
    context.onSectionsUpdate();
  }

  registry.add("selectorType.onChange", "jahiacomBlogTopicSuggestions", {
    targets: ["*"],
    onChange: function (_, value, field, context) {
      var nodeType =
        context.mode === "create"
          ? context.nodeTypeName
          : context.nodeData &&
            context.nodeData.primaryNodeType &&
            context.nodeData.primaryNodeType.name;
      if (
        (nodeType !== "jahiacom:blogEntry" && nodeType !== "jahiacom:glossaryEntry") ||
        ["jcr:title", "summary", "text", "body", "image"]
          .concat(automaticFields)
          .indexOf(field.propertyName) === -1 ||
        !context.formik ||
        !context.client ||
        !context.onSectionsUpdate
      )
        return;
      var key = context.formik.setFieldValue;
      var session = suggestionSessions.get(key);
      var documentKey = context.mode + ":" + ((context.nodeData && context.nodeData.uuid) || "new");
      if (!session || session.language !== context.lang || session.documentKey !== documentKey) {
        if (session) {
          clearTimeout(session.timer);
          session.ticket++;
        }
        session = { ticket: 0, language: context.lang, documentKey: documentKey, fields: {} };
        suggestionSessions.set(key, session);
      }
      session.context = context;
      session.nodeType = nodeType;
      formFields(context).forEach(function (item) {
        if (automaticFields.indexOf(item.propertyName) !== -1)
          fieldState(session, item, context.formik.values[item.name]);
      });
      if (automaticFields.indexOf(field.propertyName) !== -1) {
        if (value !== undefined) {
          var state = fieldState(session, field, value);
          if (!sameValue(value, state.last)) {
            state.locked = true;
            state.manual = true;
          }
        }
        return;
      }
      clearTimeout(session.timer);
      var ticket = ++session.ticket;
      // Content Editor also calls handlers with undefined while unmounting a field.
      if (value === undefined) return;
      var input = {};
      formFields(context).forEach(function (other) {
        input[other.propertyName] = context.formik.values[other.name];
      });
      input[field.propertyName] = value;
      session.timer = setTimeout(function () {
        prefillSeo(session, input);
        if (
          !formFields(context).some(function (other) {
            return other.propertyName === "j:defaultCategory";
          })
        )
          return;
        showSuggestions(context, { status: "loading", items: [] });
        // Cache only for this form/language, so taxonomy changes are seen on reopening.
        if (!session.categories) {
          session.categories = Promise.resolve()
            .then(function () {
              return context.client.query({
                query: categoriesQuery,
                variables: { language: context.lang },
                // This lightweight projection is cached in the form session, not Apollo's node cache.
                fetchPolicy: "no-cache",
              });
            })
            .then(function (result) {
              var root = result.data && result.data.jcr && result.data.jcr.nodeByPath;
              if (!root) throw new Error("Topic taxonomy unavailable");
              return root.descendants.nodes.map(function (node) {
                return { uuid: node.uuid, path: node.path, label: node.displayName };
              });
            });
        }
        session.categories
          .then(function (categories) {
            if (ticket !== session.ticket) return;
            var suggestions =
              nodeType === "jahiacom:glossaryEntry"
                ? suggestGlossaryTopics(categories, input)
                : suggestClassification(categories, input);
            if (nodeType === "jahiacom:glossaryEntry") {
              fillDraftField(
                session,
                "j:defaultCategory",
                suggestions.map(function (item) {
                  return item.uuid;
                }),
              );
            } else {
              prefillClassification(session, categories, suggestions, input);
            }
            showSuggestions(session.context, { status: "ready", items: suggestions });
          })
          .catch(function () {
            session.categories = null;
            if (ticket === session.ticket) showSuggestions(context, { status: "error", items: [] });
          });
      }, 600);
    },
  });
})();
