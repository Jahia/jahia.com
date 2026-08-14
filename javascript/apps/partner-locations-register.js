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
          add: "+ Ajouter une région et un pays",
          country: "Pays",
          countryPlaceholder: "Ex. France",
          emptyRegion: "Choisir une région",
          incomplete: "Sélectionnez une région et renseignez son pays.",
          remove: "Supprimer",
          regions: { europe: "Europe", americas: "Amériques", apac: "Asie-Pacifique" },
        }
      : {
          add: "+ Add a region and country",
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
          return row && REGIONS.indexOf(row.region) !== -1;
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
    var value = props.value || "";
    var onChange = props.onChange;

    return h("div", { className: "plp-root" }, "plp-root", function (container) {
      if (!container) return;
      if (container._plpInit) {
        if (container._plpSetValue) container._plpSetValue(value);
        return;
      }
      container._plpInit = true;

      if (!document.getElementById("plp-styles")) {
        var style = document.createElement("style");
        style.id = "plp-styles";
        style.textContent = [
          ".plp-root{display:flex;flex-direction:column;gap:12px;width:100%;box-sizing:border-box}",
          ".plp-rows{display:flex;flex-direction:column;gap:10px}",
          ".plp-row{display:grid;grid-template-columns:minmax(160px,1fr) minmax(190px,1.4fr) auto;gap:10px;align-items:start;padding:12px;border:1px solid #d7d9dc;border-radius:4px;background:#fff}",
          ".plp-field{display:flex;flex-direction:column;gap:4px}",
          ".plp-field label{font-size:12px;font-weight:600;color:#4b4f56}",
          ".plp-select,.plp-input{width:100%;height:40px;padding:0 12px;border:1px solid #8f949c;border-radius:2px;background:#fff;color:#202124;font:inherit;box-sizing:border-box}",
          ".plp-select:focus,.plp-input:focus{outline:2px solid #005cfa;outline-offset:1px;border-color:#005cfa}",
          ".plp-remove{height:40px;margin-top:20px;padding:0 12px;border:1px solid #c8cbd0;border-radius:2px;background:#fff;color:#5d626b;cursor:pointer}",
          ".plp-remove:hover{border-color:#b42318;color:#b42318}",
          ".plp-add{align-self:flex-start;height:40px;padding:0 16px;border:1px solid #005cfa;border-radius:2px;background:#fff;color:#005cfa;font-weight:600;cursor:pointer}",
          ".plp-add:hover{background:#eef4ff}",
          ".plp-error{margin:0;color:#b42318;font-size:12px}",
          "@media(max-width:720px){.plp-row{grid-template-columns:1fr}.plp-remove{margin-top:0;justify-self:start}}",
        ].join("");
        document.head.appendChild(style);
      }

      var text = labels();
      var rows = parse(value);
      var rowsElement = document.createElement("div");
      rowsElement.className = "plp-rows";
      container.appendChild(rowsElement);

      var addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "plp-add";
      addButton.textContent = text.add;
      container.appendChild(addButton);

      function serializedRows() {
        var configuredRows = rows.filter(function (row) {
          return REGIONS.indexOf(row.region) !== -1 && row.country.trim();
        });
        return configuredRows.length ? JSON.stringify(configuredRows) : "";
      }

      function notify() {
        if (onChange) onChange(serializedRows());
      }

      function field(labelText, control) {
        var wrapper = document.createElement("div");
        wrapper.className = "plp-field";
        var label = document.createElement("label");
        label.textContent = labelText;
        wrapper.appendChild(label);
        wrapper.appendChild(control);
        return wrapper;
      }

      function render() {
        rowsElement.innerHTML = "";
        rows.forEach(function (row, index) {
          var rowElement = document.createElement("div");
          rowElement.className = "plp-row";

          var select = document.createElement("select");
          select.className = "plp-select";
          var emptyOption = document.createElement("option");
          emptyOption.value = "";
          emptyOption.textContent = text.emptyRegion;
          select.appendChild(emptyOption);
          REGIONS.forEach(function (region) {
            var option = document.createElement("option");
            option.value = region;
            option.textContent = text.regions[region];
            select.appendChild(option);
          });
          select.value = row.region || "";
          select.onchange = function () {
            rows[index].region = select.value;
            notify();
            render();
          };

          var input = document.createElement("input");
          input.type = "text";
          input.className = "plp-input";
          input.placeholder = text.countryPlaceholder;
          input.value = row.country || "";
          input.oninput = function () {
            rows[index].country = input.value;
            notify();
          };
          input.onblur = render;

          var removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "plp-remove";
          removeButton.textContent = text.remove;
          removeButton.onclick = function () {
            rows.splice(index, 1);
            notify();
            render();
          };

          rowElement.appendChild(
            field(text.emptyRegion.replace("Choisir une ", "").replace("Choose a ", ""), select),
          );
          rowElement.appendChild(field(text.country, input));
          rowElement.appendChild(removeButton);
          if ((!row.region && row.country.trim()) || (row.region && !row.country.trim())) {
            var error = document.createElement("p");
            error.className = "plp-error";
            error.textContent = text.incomplete;
            error.style.gridColumn = "1 / -1";
            rowElement.appendChild(error);
          }
          rowsElement.appendChild(rowElement);
        });
      }

      addButton.onclick = function () {
        rows.push({ region: "", country: "" });
        render();
      };

      container._plpSetValue = function (nextValue) {
        if (nextValue === serializedRows()) return;
        rows = parse(nextValue);
        render();
      };

      render();
    });
  }

  window.jahia.uiExtender.registry.add("selectorType", "PartnerLocationsPicker", {
    cmp: PartnerLocationsPicker,
    supportMultiple: false,
  });
})();
