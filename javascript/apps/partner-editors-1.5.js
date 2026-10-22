(function () {
  "use strict";

  // Native ChoiceList uses i18next keys for translated static constraints.
  if (window.jahia.i18n) {
    window.jahia.i18n.addResourceBundle(
      "fr",
      "jahiacom",
      {
        navbarButtons: {
          primary: "Primary",
          secondary: "Secondary",
          main: "Barre principale",
          upper: "Barre supérieure",
          contactDemo: "Contact → Démo",
          demoContact: "Démo → Contact",
        },
        cardPurpose: {
          standard: "Carte classique",
          partnerRegion: "Région partenaire",
          glossaryStatistic: "Statistique du glossaire",
        },
        buttonDestination: {
          none: "Aucun bouton",
          internal: "Lien interne",
          external: "Lien externe",
        },
        carouselMode: {
          automatic: "Automatique — thèmes de l’article ou ressources récentes",
          filtered: "Par catégories — thématiques et types de contenu",
          manual: "Manuel — articles et pages de ressources",
        },
      },
      true,
      false,
    );
    window.jahia.i18n.addResourceBundle(
      "en",
      "jahiacom",
      {
        navbarButtons: {
          primary: "Primary",
          secondary: "Secondary",
          main: "Main bar",
          upper: "Upper bar",
          contactDemo: "Contact → Demo",
          demoContact: "Demo → Contact",
        },
        cardPurpose: {
          standard: "Standard card",
          partnerRegion: "Partner region",
          glossaryStatistic: "Glossary statistic",
        },
        buttonDestination: {
          none: "No button",
          internal: "Internal link",
          external: "External link",
        },
        carouselMode: {
          automatic: "Automatic — article topics or latest resources",
          filtered: "By categories — themes and content types",
          manual: "Manual — blog pages and resources",
        },
      },
      true,
      false,
    );
  }

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

  function isFrench(context) {
    var store = window.jahia.reduxStore;
    var language =
      (context && context.uilang) ||
      (store && store.getState().uilang) ||
      document.documentElement.lang ||
      "en";
    return String(language).toLowerCase().indexOf("fr") === 0;
  }

  function labels(context) {
    var french = isFrench(context);
    return french
      ? {
          add: "Ajouter",
          region: "Région",
          location: "Localisation",
          country: "Pays",
          countryPlaceholder: "Ex. France",
          emptyRegion: "Choisir une région",
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
    var text = labels(props.editorContext);
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
              label: isFrench(props.parent.editorContext) ? "Retirer le logo" : "Remove logo",
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
    var french = isFrench(props.editorContext);
    var text = french
      ? {
          logo: "Logo de l’entreprise",
          comment: "Commentaire",
          attribution: "Auteur / Entreprise",
          add: "Ajouter",
          quote: "Citation",
          remove: "Supprimer",
        }
      : {
          logo: "Company logo",
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
  // Reuse the native selector and link mixin handler. A field unmount is not
  // a request to remove a stored link when a region card hides its CTA mode.
  registry.add("selectorType", "ContextualButtonMode", {
    cmp: function (props) {
      var field = props.field;
      if (!field || !field.valueConstraints)
        return h(registry.get("selectorType", "Choicelist").cmp, props);
      return h(
        registry.get("selectorType", "Choicelist").cmp,
        Object.assign({}, props, {
          field: Object.assign({}, field, {
            valueConstraints: field.valueConstraints.map(function (choice) {
              var value = choice.value && choice.value.string;
              return ["none", "internal", "external"].indexOf(value) === -1
                ? choice
                : Object.assign({}, choice, {
                    displayValueKey: "jahiacom:buttonDestination." + value,
                  });
            }),
          }),
        }),
      );
    },
    supportMultiple: false,
    initValue: function (field) {
      return registry.get("selectorType", "Choicelist").initValue(field);
    },
  });
  registry.add("selectorType.onChange", "jahiacomButtonLinkMixins", {
    targets: ["ContextualButtonMode"],
    onChange: function (previous, value, field, context, selector, helper) {
      if (value === undefined) return;
      registry
        .get("selectorType.onChange", "addMixinChoicelist")
        .onChange(previous, value, field, context, selector, helper);
    },
  });
  var buttonFieldVisibility = new WeakMap();
  registry.add("selectorType.onChange", "jahiacomContextualButtons", {
    targets: ["*"],
    onChange: function (_, value, currentField, context) {
      if (
        value === undefined ||
        ["ctaType", "cardPurpose"].indexOf(currentField.propertyName) === -1 ||
        !context.formik ||
        !context.onSectionsUpdate
      )
        return;
      var sections = context.sections || [];
      var fields = sections.flatMap(function (section) {
        return (section.fieldSets || []).flatMap(function (fieldset) {
          return fieldset.fields || [];
        });
      });
      var mode = fields.find(function (field) {
        return field.propertyName === "ctaType" && field.nodeType === "jahiacommix:cta";
      });
      if (!mode) return;
      function fieldValue(property) {
        if (currentField.propertyName === property) return value;
        var field = fields.find(function (field) {
          return field.propertyName === property;
        });
        return field && context.formik.values[field.name];
      }
      var nodeType = context.nodeTypeName || context.nodeData?.primaryNodeType?.name;
      var region = nodeType === "jahiacom:card" && fieldValue("cardPurpose") === "partnerRegion";
      var kind = fieldValue("ctaType") || "none";
      var active = !region && (kind === "internal" || kind === "external");
      var changed = false;
      sections.forEach(function (section) {
        (section.fieldSets || []).forEach(function (fieldset) {
          fieldset.fields = (fieldset.fields || []).map(function (field) {
            var applicable;
            if (field.nodeType === "jahiacommix:cta")
              applicable = field.propertyName === "ctaType" ? !region : active;
            else if (field.nodeType === "jmix:internalLink")
              applicable = active && kind === "internal";
            else if (field.nodeType === "jmix:externalLink")
              applicable = active && kind === "external";
            else if (nodeType === "jahiacom:card" && field.propertyName === "hideCtaIcon")
              applicable = active;
            else return field;
            if (!buttonFieldVisibility.has(field)) buttonFieldVisibility.set(field, field.visible);
            var original = buttonFieldVisibility.get(field);
            var visible = original && applicable;
            if (field.visible === visible) return field;
            changed = true;
            var next = Object.assign({}, field, { visible: visible });
            buttonFieldVisibility.set(next, original);
            return next;
          });
        });
      });
      if (changed) context.onSectionsUpdate();
    },
  });
  // Scope the shorter toolbar to explicitly configured editorial fields.
  // Keep native RichText, its plugins and its HTML filtering; retain the rules
  // formerly supplied by the removed font/color/alignment controls.
  registry.add("selectorType", "EditorialRichText", {
    cmp: function (props) {
      var options = (props.field.selectorOptions || []).slice();
      var remove = options.find(function (option) {
        return option.name === "ckeditor.removeButtons";
      });
      var extra = options.find(function (option) {
        return option.name === "ckeditor.extraAllowedContent";
      });
      options = options.filter(function (option) {
        return (
          ["ckeditor.removeButtons", "ckeditor.extraAllowedContent"].indexOf(option.name) === -1
        );
      });
      options.push({
        name: "ckeditor.removeButtons",
        value: [
          remove && remove.value,
          "Font,FontSize,TextColor,BGColor,Smiley,Templates,Cut,Copy,Paste,PasteText,PasteFromWord,Find,Replace,SelectAll,JustifyLeft,JustifyCenter,JustifyRight,JustifyBlock,CreateDiv,ShowBlocks",
        ]
          .filter(Boolean)
          .join(","),
      });
      options.push({
        name: "ckeditor.extraAllowedContent",
        value: [
          extra && extra.value,
          "span{font-family,font-size,color,background-color};font[face,size,color];*{text-align};div[id,dir,lang,title](*){*}",
        ]
          .filter(Boolean)
          .join(";"),
      });
      return h(
        registry.get("selectorType", "RichText").cmp,
        Object.assign({}, props, {
          field: Object.assign({}, props.field, { selectorOptions: options }),
        }),
      );
    },
    supportMultiple: false,
  });
  // Edit forms call initValue only when the property is absent. Keep stored
  // values and native validation intact; opening the form never writes JCR.
  registry.add("selectorType", "CarouselItemCount", {
    cmp: function (props) {
      return h(registry.get("selectorType", "Text").cmp, props);
    },
    supportMultiple: false,
    initValue: function (field) {
      return field.defaultValues && field.defaultValues[0]
        ? field.defaultValues[0].string
        : undefined;
    },
  });
  // Project the existing native fields into their tool row, without copying persisted values.
  var utilitySettingNames = {
    search: ["utilitySearchVisible", "utilitySearchLabel"],
    languages: ["utilityLanguagesVisible", "utilityLanguagesLabel"],
    rss: ["utilityRssVisible", "utilityRssLabel", "utilityRssUrl", "utilityRssImage"],
  };
  registry.add("selectorType.onChange", "jahiacomInlineUtilitySettings", {
    targets: ["UtilityItemsPicker"],
    onChange: function (_, value, currentField, context) {
      if (value === undefined || currentField.inlineUtilityFields || !context.onSectionsUpdate)
        return;
      var rows;
      try {
        rows = JSON.parse(value);
      } catch {
        return;
      }
      if (
        !Array.isArray(rows) ||
        !Object.keys(utilitySettingNames).every(function (kind) {
          return (
            rows.filter(function (row) {
              return row && row.kind === kind;
            }).length === 1
          );
        })
      )
        return;
      var names = Object.values(utilitySettingNames).flat();
      var sections = context.sections || [];
      var fields = sections
        .flatMap(function (section) {
          return (section.fieldSets || []).flatMap(function (fieldset) {
            return fieldset.fields || [];
          });
        })
        .filter(function (field) {
          return (
            field.nodeType === "jahiacommix:homeUtilityNavigation" &&
            names.indexOf(field.propertyName) !== -1
          );
        });
      if (fields.length !== names.length) return; // Keep native controls if metadata is incomplete.
      function refresh() {
        sections.forEach(function (section) {
          (section.fieldSets || []).forEach(function (fieldset) {
            fieldset.fields = (fieldset.fields || []).map(function (field) {
              if (field.name === currentField.name)
                return Object.assign({}, field, {
                  inlineUtilityFields: fields,
                  refreshInlineUtilities: refresh,
                });
              return fields.some(function (setting) {
                return setting.name === field.name;
              })
                ? Object.assign({}, field, { visible: false })
                : field;
            });
          });
        });
        context.onSectionsUpdate();
      }
      refresh();
    },
  });

  // FastField does not refresh a shared JSON field when only localized values change.
  function InlineUtilityLanguageSync(props) {
    this.props = props;
  }
  InlineUtilityLanguageSync.prototype.isReactComponent = {};
  InlineUtilityLanguageSync.prototype.render = function () {
    return null;
  };
  InlineUtilityLanguageSync.prototype.componentDidUpdate = function (previous) {
    if (previous.initialValues !== this.props.initialValues) this.props.refresh();
  };

  function InlineUtilityField(props) {
    var parent = props.parent,
      field = props.field,
      form = parent.form;
    if (!field || !form) return null;
    var disabled = Boolean(
      parent.readOnly || parent.disabled || field.readOnly || form.isSubmitting,
    );
    var selector = registry.get("selectorType", field.selectorType);
    if (selector.resolver) selector = selector.resolver(field.selectorOptions, field);
    var displayField = props.visibility
      ? Object.assign({}, field, { displayName: props.showLabel })
      : field;
    function changeSetting(value) {
      if (disabled) return;
      form.setFieldValue(field.name, value);
      parent.field.refreshInlineUtilities();
    }
    var control = h(selector.cmp, {
      id: field.name,
      name: field.name,
      field: displayField,
      value: form.values[field.name],
      readOnly: disabled,
      disabled: disabled,
      editorContext: parent.editorContext,
      inputContext: Object.assign({}, parent.inputContext, {
        selectorType: selector,
        displayActions: false,
      }),
      onChange: changeSetting,
      onBlur: function () {
        if (!disabled) form.setFieldTouched(field.name, true);
      },
    });
    return props.visibility
      ? h("label", {
          htmlFor: field.name,
          style: { display: "flex", alignItems: "center", gap: 8 },
          children: [control, props.showLabel],
        })
      : h(window.jahia.moonstone.Field, {
          children: [
            h("label", { htmlFor: field.name, children: field.displayName }),
            control,
            field.selectorType === "Picker" &&
              form.values[field.name] &&
              h(
                window.jahia.moonstone.Button,
                {
                  type: "button",
                  label: isFrench(parent.editorContext) ? "Retirer l’image" : "Remove image",
                  isDisabled: disabled,
                  onClick: function () {
                    changeSetting(undefined);
                  },
                },
                "clear",
              ),
            field.description &&
              h(
                window.jahia.moonstone.Typography,
                {
                  variant: "caption",
                  children: field.description,
                },
                "help",
              ),
          ],
        });
  }

  // One ordered list; native Picker for internal targets, inline fields for external URLs.
  registry.add("selectorType", "UtilityItemsPicker", {
    supportMultiple: false,
    initValue: function () {
      return JSON.stringify([{ kind: "rss" }, { kind: "search" }, { kind: "languages" }]);
    },
    cmp: function (props) {
      var french = isFrench(props.editorContext);
      var text = french
        ? {
            tools: { rss: "Flux RSS", search: "Recherche", languages: "Langues" },
            show: "Afficher",
            settings: "Réglages",
            internal: "Ajouter un lien interne",
            external: "Ajouter un lien externe",
            up: "Monter",
            down: "Descendre",
            remove: "Supprimer",
            link: "Lien",
            fr: "Libellé français",
            en: "Libellé anglais",
            url: "URL externe",
            invalid: "Renseignez les deux libellés et une URL complète en https:// ou http://.",
            broken:
              "La liste enregistrée est invalide. Elle est conservée ; contactez un administrateur.",
          }
        : {
            tools: { rss: "RSS feed", search: "Search", languages: "Languages" },
            show: "Show",
            settings: "Settings",
            internal: "Add internal link",
            external: "Add external link",
            up: "Move up",
            down: "Move down",
            remove: "Remove",
            link: "Link",
            fr: "French label",
            en: "English label",
            url: "External URL",
            invalid: "Enter both labels and a complete https:// or http:// URL.",
            broken: "The saved list is invalid. It has been preserved; contact an administrator.",
          };
      var rows;
      try {
        rows = JSON.parse(props.value || "[]");
        if (!Array.isArray(rows)) throw new Error("Invalid list");
      } catch {
        return h("p", { role: "alert", children: text.broken });
      }
      var disabled = Boolean(props.readOnly || props.disabled);
      var ui = window.jahia.moonstone;
      function change(next) {
        if (!disabled && props.onChange) props.onChange(JSON.stringify(next));
      }
      function update(index, changes) {
        var next = rows.slice();
        next[index] = Object.assign({}, next[index], changes);
        change(next);
      }
      function button(label, onClick, key, inactive) {
        return h(
          ui.Button,
          { type: "button", label: label, isDisabled: disabled || inactive, onClick: onClick },
          key,
        );
      }
      function moveButtons(index) {
        return [-1, 1].map(function (delta) {
          return button(
            delta < 0 ? text.up : text.down,
            function () {
              if (index + delta < 0 || index + delta >= rows.length) return;
              var next = rows.slice();
              next[index] = rows[index + delta];
              next[index + delta] = rows[index];
              change(next);
            },
            delta,
            index + delta < 0 || index + delta >= rows.length,
          );
        });
      }
      function input(label, value, onChange, invalid, key) {
        return h(
          ui.Field,
          {
            label: label,
            children: h(ui.Input, {
              "aria-label": label,
              "aria-invalid": invalid || undefined,
              "value": value || "",
              "isDisabled": disabled,
              "onChange": function (event) {
                onChange(event.target.value);
              },
              "onBlur": props.onBlur,
            }),
          },
          key,
        );
      }
      return h("div", {
        style: { display: "flex", flexDirection: "column", gap: 24 },
        children: rows
          .map(function (row, index) {
            var tool = text.tools[row.kind];
            if (tool) {
              var settings = (props.field.inlineUtilityFields || []).filter(function (field) {
                return utilitySettingNames[row.kind].indexOf(field.propertyName) !== -1;
              });
              var visibility = settings.find(function (field) {
                return field.propertyName.endsWith("Visible");
              });
              return h(
                "div",
                {
                  "role": "group",
                  "aria-label": tool,
                  "style": { display: "flex", flexDirection: "column", gap: 8 },
                  "children": [
                    h(
                      "div",
                      {
                        style: {
                          border: "1px solid var(--color-gray_light, #d5d5d5)",
                          padding: 12,
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        },
                        children: [
                          h(
                            "div",
                            {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 12,
                              },
                              children: [
                                h(
                                  "div",
                                  {
                                    style: { flex: 1 },
                                    children: [
                                      h(ui.Typography, { children: tool }, "title"),
                                      h(
                                        ui.Typography,
                                        {
                                          variant: "caption",
                                          children: french
                                            ? "Outil de navigation"
                                            : "Navigation tool",
                                        },
                                        "type",
                                      ),
                                    ],
                                  },
                                  "label",
                                ),
                                visibility &&
                                  h(
                                    InlineUtilityField,
                                    {
                                      parent: props,
                                      field: visibility,
                                      visibility: true,
                                      showLabel: text.show,
                                    },
                                    "visibility",
                                  ),
                              ],
                            },
                            "header",
                          ),
                          settings.length > 1 &&
                            h(
                              "details",
                              {
                                children: [
                                  h("summary", { children: text.settings }, "summary"),
                                  h(
                                    "div",
                                    {
                                      style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 16,
                                        paddingTop: 12,
                                      },
                                      children: settings
                                        .filter(function (field) {
                                          return field !== visibility;
                                        })
                                        .map(function (field) {
                                          return h(
                                            InlineUtilityField,
                                            { parent: props, field: field },
                                            field.name,
                                          );
                                        }),
                                    },
                                    "fields",
                                  ),
                                ],
                              },
                              "settings",
                            ),
                        ],
                      },
                      "card",
                    ),
                    h(
                      "div",
                      {
                        style: { display: "flex", flexWrap: "wrap", gap: 8 },
                        children: moveButtons(index),
                      },
                      "actions",
                    ),
                  ],
                },
                row.kind,
              );
            }

            var validUrl =
              /^https?:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(row.url || "") &&
              Array.from(row.url || "").every(function (character) {
                return character.charCodeAt(0) > 32 && character.charCodeAt(0) !== 127;
              });
            var validLabels =
              row.labels &&
              String(row.labels.fr || "").trim() &&
              String(row.labels.en || "").trim();
            var fields;
            if (row.kind === "internal") {
              var field = Object.assign({}, props.field, {
                name: props.field.name + "-internal-" + index,
                multiple: false,
                readOnly: disabled,
                selectorOptions: [],
                valueConstraints: ["jnt:page", "jnt:nodeLink", "jnt:externalLink"].map(
                  function (type) {
                    return { displayValue: type, value: { string: type } };
                  },
                ),
              });
              var picker = registry
                .get("selectorType", "Picker")
                .resolver(field.selectorOptions, field);
              fields = h(picker.cmp, {
                field: field,
                value: row.id || undefined,
                editorContext: props.editorContext,
                inputContext: Object.assign({}, props.inputContext, {
                  selectorType: picker,
                  displayActions: false,
                }),
                readOnly: disabled,
                onBlur: props.onBlur,
                onChange: function (value) {
                  update(index, { id: value || "" });
                },
              });
            } else {
              fields = h("div", {
                style: { display: "flex", flexDirection: "column", gap: 12 },
                children: [
                  ["fr", "en"].map(function (lang) {
                    return input(
                      text[lang],
                      row.labels && row.labels[lang],
                      function (value) {
                        update(index, { labels: Object.assign({}, row.labels, { [lang]: value }) });
                      },
                      !row.labels || !String(row.labels[lang] || "").trim(),
                      lang,
                    );
                  }),
                  input(
                    text.url,
                    row.url,
                    function (value) {
                      update(index, { url: value });
                    },
                    !validUrl,
                    "url",
                  ),
                  (!validUrl || !validLabels) &&
                    h("p", { role: "status", children: text.invalid }, "validation"),
                ],
              });
            }
            return h(
              "fieldset",
              {
                style: { border: 0, padding: 0, margin: 0, minWidth: 0 },
                children: [
                  h("legend", { children: text.link + " " + (index + 1) }, "legend"),
                  fields,
                  h(
                    "div",
                    {
                      style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 },
                      children: [
                        moveButtons(index),
                        button(
                          text.remove,
                          function () {
                            change(
                              rows.filter(function (_, pos) {
                                return pos !== index;
                              }),
                            );
                          },
                          "remove",
                        ),
                      ],
                    },
                    "actions",
                  ),
                ],
              },
              index,
            );
          })
          .concat(
            h(
              "div",
              {
                style: { display: "flex", flexWrap: "wrap", gap: 8 },
                children: [
                  button(
                    text.internal,
                    function () {
                      change(rows.concat({ kind: "internal", id: "" }));
                    },
                    "internal",
                  ),
                  button(
                    text.external,
                    function () {
                      change(
                        rows.concat({ kind: "external", labels: { fr: "", en: "" }, url: "" }),
                      );
                    },
                    "external",
                  ),
                ],
              },
              "add",
            ),
            window.jahia.jcontent &&
              props.field.refreshInlineUtilities &&
              h(
                window.jahia.jcontent.ContentEditorContext.Consumer,
                {
                  children: function (context) {
                    return h(InlineUtilityLanguageSync, {
                      initialValues: context.initialValues,
                      refresh: props.field.refreshInlineUtilities,
                    });
                  },
                },
                "language-sync",
              ),
          ),
      });
    },
  });
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
    return isFrench(context)
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
  // Keep in sync with src/utils/blogMetaTitle.ts (server/editor parity is tested).
  function blogMetaTitle(value, fallback) {
    var source = (value || "").trim() || (fallback || "").trim();
    if (!source) return "";
    var stem = source.replace(/(?:\s*[-|–—]\s*Jahia\s*)+$/i, "").trimEnd();
    return stem ? stem + " - Jahia" : source;
  }
  function prefillBlogTitle(session, input, changedValue) {
    var context = session.context;
    var field = formFields(context).find(function (item) {
      return item.propertyName === "htmlTitle";
    });
    if (!field || field.readOnly || context.readOnly || context.formik.isSubmitting) return;
    var current = changedValue === undefined ? context.formik.values[field.name] : changedValue;
    var state = fieldState(session, field, current);
    if (!sameValue(current, state.last)) {
      state.locked = true;
      state.manual = true;
    }
    // A manual title keeps its wording. Only the terminal brand is normalized.
    // An explicitly cleared field keeps using the server-side page-title fallback.
    if (state.locked && emptyValue(current)) return;
    var next = blogMetaTitle(state.locked ? current : readableText(input["jcr:title"]));
    if (sameValue(current, next)) return;
    state.last = next;
    context.formik.setFieldValue(field.name, next);
  }
  function prefillSeo(session, input) {
    if (session.nodeType === "jahiacom:blogEntry") prefillBlogTitle(session, input);
    else fillDraftField(session, "htmlTitle", readableText(input["jcr:title"]));
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
      // Field cleanup notifications are not edits. In particular, switching a
      // selector or rebuilding sections must not cancel another field's analysis.
      if (value === undefined) return;
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
          clearTimeout(session.titleTimer);
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
        if (nodeType === "jahiacom:blogEntry" && field.propertyName === "htmlTitle") {
          clearTimeout(session.titleTimer);
          if (
            context.mode !== "create" &&
            sameValue(value, (context.formik.initialValues || {})[field.name])
          )
            return;
          session.titleTimer = setTimeout(function () {
            var titleField = formFields(session.context).find(function (item) {
              return item.propertyName === "jcr:title";
            });
            prefillBlogTitle(
              session,
              { "jcr:title": titleField && session.context.formik.values[titleField.name] },
              value,
            );
          }, 600);
        }
        return;
      }
      var input = {};
      formFields(context).forEach(function (other) {
        input[other.propertyName] = context.formik.values[other.name];
      });
      input[field.propertyName] = value;
      // Native selectors replay stored values on opening and language changes.
      // Keep suggestions available, but do not turn an existing blog or glossary entry
      // into a draft by filling missing metadata or categories on that replay.
      var canPrefill =
        context.mode === "create" ||
        formFields(context).some(function (other) {
          return (
            ["jcr:title", "summary", "text", "body", "image"].indexOf(other.propertyName) !== -1 &&
            !sameValue(input[other.propertyName], (context.formik.initialValues || {})[other.name])
          );
        });
      // Content Editor replays initial values when sections change. Updating the
      // suggestions descriptor must not start an endless loading/ready cycle.
      var fingerprint = JSON.stringify(
        ["jcr:title", "summary", "text", "body", "image"].map(function (property) {
          return input[property];
        }),
      );
      if (session.fingerprint === fingerprint) return;
      session.fingerprint = fingerprint;
      clearTimeout(session.timer);
      var ticket = ++session.ticket;
      session.timer = setTimeout(function () {
        if (canPrefill) prefillSeo(session, input);
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
              if (canPrefill)
                fillDraftField(
                  session,
                  "j:defaultCategory",
                  suggestions.map(function (item) {
                    return item.uuid;
                  }),
                );
            } else if (canPrefill) {
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
  // Edit each existing footer reference and its optional localized label in one place.
  registry.add("selectorType.onChange", "jahiacomFooterLabels", {
    targets: ["FooterLinksPicker"],
    onChange: function (_, value, currentField, context) {
      if (currentField.footerLabelsField || !context.onSectionsUpdate) return;
      var sections = context.sections || [];
      var labelField = sections
        .flatMap(function (section) {
          return (section.fieldSets || []).flatMap(function (fieldset) {
            return fieldset.fields || [];
          });
        })
        .find(function (field) {
          return (
            field.nodeType === "jahiacom:footerColumn" &&
            field.propertyName === "selectedLinkLabels"
          );
        });
      if (!labelField) return;
      function refresh() {
        sections.forEach(function (section) {
          (section.fieldSets || []).forEach(function (fieldset) {
            fieldset.fields = (fieldset.fields || []).map(function (field) {
              if (field.name === currentField.name)
                return Object.assign({}, field, {
                  footerLabelsField: labelField,
                  refreshFooterLabels: refresh,
                });
              return field.name === labelField.name
                ? Object.assign({}, field, { visible: false })
                : field;
            });
          });
        });
        context.onSectionsUpdate();
      }
      refresh();
    },
  });
  registry.add("selectorType", "FooterLinksPicker", {
    supportMultiple: true,
    cmp: function (props) {
      var nativePicker = registry.get("selectorType", "Picker");
      var field = props.field;
      var companion = field.footerLabelsField;
      if (!companion || !props.form) {
        var fallback = nativePicker.resolver(field.selectorOptions, field);
        return h(fallback.cmp, props);
      }
      var french = isFrench(props.editorContext);
      var disabled = Boolean(
        props.readOnly || props.disabled || field.readOnly || props.form.isSubmitting,
      );
      var labelsDisabled = disabled || companion.readOnly;
      var rows = Array.isArray(props.value) ? props.value : [];
      var labels;
      try {
        labels = JSON.parse(props.form.values[companion.name] || "{}");
        if (!labels || typeof labels !== "object" || Array.isArray(labels))
          throw new Error("Invalid labels");
      } catch {
        return h("p", {
          role: "alert",
          children: french
            ? "Les libellés enregistrés sont invalides. Contactez un administrateur."
            : "Stored labels are invalid. Contact an administrator.",
        });
      }
      function change(next) {
        if (!disabled && props.onChange) props.onChange(next);
      }
      function picker(value, index) {
        var single = Object.assign({}, field, {
          name: field.name + "-" + index,
          multiple: false,
          mandatory: false,
          readOnly: disabled,
        });
        var selector = nativePicker.resolver(single.selectorOptions, single);
        return h(selector.cmp, {
          field: single,
          value: value,
          editorContext: props.editorContext,
          inputContext: Object.assign({}, props.inputContext, {
            selectorType: selector,
            displayActions: false,
          }),
          readOnly: disabled,
          onBlur: props.onBlur,
          onChange: function (target) {
            var next = rows.slice();
            if (index === rows.length) {
              if (target && next.indexOf(target) === -1) next.push(target);
            } else if (!target) next.splice(index, 1);
            else if (target === value || next.indexOf(target) === -1) next[index] = target;
            change(next);
          },
        });
      }
      return h("div", {
        style: { display: "flex", flexDirection: "column", gap: 12 },
        children: rows
          .map(function (id, index) {
            var inputId = field.name + "-label-" + id;
            var caption = french ? "Libellé personnalisé (facultatif)" : "Custom label (optional)";
            return h(
              "div",
              {
                "role": "group",
                "aria-label": (french ? "Lien " : "Link ") + (index + 1),
                "children": [
                  picker(id, index),
                  h("details", {
                    children: [
                      h("summary", { children: caption + (labels[id] ? " : " + labels[id] : "") }),
                      h("label", { htmlFor: inputId, children: caption }),
                      h("input", {
                        id: inputId,
                        type: "text",
                        value: typeof labels[id] === "string" ? labels[id] : "",
                        disabled: labelsDisabled,
                        style: { width: "100%", boxSizing: "border-box", padding: 8 },
                        placeholder: french
                          ? "Vide : titre habituel de la page"
                          : "Empty: usual page title",
                        onChange: function (event) {
                          if (labelsDisabled) return;
                          var next = Object.assign({}, labels);
                          if (event.target.value) next[id] = event.target.value;
                          else delete next[id];
                          props.form.setFieldValue(companion.name, JSON.stringify(next));
                          field.refreshFooterLabels();
                        },
                        onBlur: function () {
                          props.form.setFieldTouched(companion.name, true, false);
                        },
                      }),
                    ],
                  }),
                  [-1, 1].map(function (delta) {
                    return h(
                      window.jahia.moonstone.Button,
                      {
                        type: "button",
                        label:
                          delta < 0
                            ? french
                              ? "Monter"
                              : "Move up"
                            : french
                              ? "Descendre"
                              : "Move down",
                        isDisabled: disabled || index + delta < 0 || index + delta >= rows.length,
                        onClick: function () {
                          if (index + delta < 0 || index + delta >= rows.length) return;
                          var next = rows.slice();
                          next[index] = rows[index + delta];
                          next[index + delta] = rows[index];
                          change(next);
                        },
                      },
                      delta,
                    );
                  }),
                  h(window.jahia.moonstone.Button, {
                    type: "button",
                    label: french ? "Retirer" : "Remove",
                    isDisabled: disabled,
                    onClick: function () {
                      change(
                        rows.filter(function (_, rowIndex) {
                          return rowIndex !== index;
                        }),
                      );
                    },
                  }),
                ],
              },
              id,
            );
          })
          .concat(
            picker(undefined, rows.length),
            window.jahia.jcontent &&
              h(window.jahia.jcontent.ContentEditorContext.Consumer, {
                children: function (context) {
                  return h(InlineUtilityLanguageSync, {
                    initialValues: context.initialValues,
                    refresh: field.refreshFooterLabels,
                  });
                },
              }),
          ),
      });
    },
  });
})();
