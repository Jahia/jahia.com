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
})();
