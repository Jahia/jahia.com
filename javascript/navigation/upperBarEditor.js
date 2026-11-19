import { loadPreviewReferences } from "./api.js?editor=tabs-1";
const h = (type, props = {}, key = null) => ({
  $$typeof: Symbol.for("react.element"),
  type,
  key: key === null ? null : String(key),
  ref: null,
  props,
  _owner: null,
  _store: {},
});
const PickerContext = ({ value, children }) =>
  h(window.jahia.jcontent.ContentEditorConfigContext.Provider, {
    value,
    children: h(window.jahia.jcontent.ContentEditorContext.Provider, { value, children }),
  });
export async function setupUpperPicker(manager) {
  try {
    const versions = Object.values(window.jahia.webpackShareScopes.default.formik);
    const factory = await (versions.find((entry) => entry.loaded) || versions[0]).get();
    if (manager.alive) manager.setState({ upperFormik: factory().Formik });
  } catch {
    if (manager.alive) manager.setState({ upperPickerError: true });
  }
}
export function changeUpperBar(manager, change) {
  if (manager.state.busy || manager.state.contextChanged) return;
  const settings = structuredClone(manager.state.settings);
  settings.upperBar ||= structuredClone(manager.state.snapshot.upperBar);
  change(settings.upperBar);
  manager.setState({ settings, dirty: true, status: manager.text().dirty, error: "" });
}
function pagePicker(manager, key, value, onChange) {
  const ui = window.jahia.moonstone,
    t = manager.text(),
    s = manager.state;
  if (!s.upperFormik)
    return s.upperPickerError
      ? h("p", { role: "alert", children: t.pickerUnavailable })
      : h(ui.Loader, { size: "small" });
  const disabled = s.busy || s.contextChanged;
  const field = {
    name: "upperPage-" + key,
    displayName: t.destination,
    multiple: false,
    mandatory: false,
    readOnly: disabled,
    selectorOptions: [{ name: "type", value: "page" }],
    valueConstraints: [{ displayValue: "jnt:page", value: { string: "jnt:page" } }],
  };
  const resolved = window.jahia.uiExtender.registry
    .get("selectorType", "Picker")
    .resolver(field.selectorOptions, field);
  const selector = {
    ...resolved,
    pickerConfig: {
      ...resolved.pickerConfig,
      pickerDialog: {
        ...resolved.pickerConfig.pickerDialog,
        displayTree: true,
        displaySiteSwitcher: false,
      },
      selectionTable: {
        ...resolved.pickerConfig.selectionTable,
        columns: ["publicationStatus", "name"],
      },
    },
  };
  const editorContext = { site: s.snapshot.site, lang: s.contentLanguage };
  const change = async (uuid) => {
    if (disabled) return;
    if (!uuid) {
      onChange(undefined);
      return;
    }
    const site = manager.state.snapshot.site,
      lang = manager.state.contentLanguage,
      requestId = manager.requestId;
    try {
      const [node] = await loadPreviewReferences(site, [uuid]);
      if (
        !manager.alive ||
        manager.requestId !== requestId ||
        manager.state.snapshot.site !== site ||
        manager.state.contentLanguage !== lang ||
        manager.state.busy ||
        manager.state.contextChanged
      )
        return;
      if (node?.kind !== "jnt:page") throw Error("Invalid page");
      manager.setState({ previewReferences: { ...manager.state.previewReferences, [uuid]: node } });
      onChange(uuid);
    } catch {
      manager.setState({ error: t.upperInvalidPage });
    }
  };
  return h(
    ui.Field,
    {
      label: t.destination,
      children: h(PickerContext, {
        value: editorContext,
        children: h(
          s.upperFormik,
          {
            initialValues: { [field.name]: value || "" },
            enableReinitialize: true,
            onSubmit: () => {},
            children: h(selector.cmp, {
              field,
              value: value || undefined,
              editorContext,
              inputContext: { selectorType: selector, displayActions: false },
              readOnly: disabled,
              onBlur: () => {},
              onChange: change,
            }),
          },
          key + "-" + s.contentLanguage,
        ),
      }),
    },
    "page-" + key,
  );
}
export function renderUpperBar(manager) {
  const ui = window.jahia.moonstone,
    t = manager.text(),
    s = manager.state,
    lang = s.contentLanguage;
  const config = s.settings.upperBar || s.snapshot.upperBar;
  const change = (fn) => changeUpperBar(manager, fn);
  const title = (kind) =>
    ({
      internal: t.upperInternal,
      external: t.upperExternal,
      rss: t.upperRss,
      search: t.upperSearch,
      languages: t.upperLanguages,
    })[kind];
  const action = (label, handler, disabled = false, key = label, accessibleName = label) =>
    h(
      ui.Button,
      {
        label,
        "aria-label": accessibleName,
        "variant": "ghost",
        "isDisabled": disabled || s.busy || s.contextChanged,
        "onClick": handler,
      },
      key,
    );
  const move = (list, index, direction) =>
    change((next) => {
      [next[list][index], next[list][index + direction]] = [
        next[list][index + direction],
        next[list][index],
      ];
    });
  const order = (list, index, name) =>
    h(
      "div",
      {
        "className": "navigationOrderActions",
        "role": "group",
        "aria-label": t.upperOrder + " : " + name,
        "children": [
          action(t.moveUp, () => move(list, index, -1), index === 0, "up", t.moveUp + " : " + name),
          action(
            t.moveDown,
            () => move(list, index, 1),
            index === config[list].length - 1,
            "down",
            t.moveDown + " : " + name,
          ),
        ],
      },
      "order",
    );
  const translatedField = (name, map, update) =>
    manager.field(name, map?.[lang] || "", (value) => change((next) => update(next, value)));
  const known = [
    ...s.snapshot.sections.flatMap(function walk(node) {
      return [node, ...node.children.flatMap(walk)];
    }),
    ...Object.values(s.previewReferences),
  ];
  const nameOf = (item) =>
    item.labels[lang]?.trim() ||
    (item.kind === "internal" && known.find((n) => n.id === item.id)?.[lang]?.["jcr:title"]) ||
    title(item.kind);
  return h("section", {
    className: "navigationPresentation",
    children: [
      h(ui.Typography, { component: "h2", variant: "heading", children: t.upperLinks }, "links"),
      h(
        "ul",
        {
          className: "navigationBranchList",
          children: config.items.map((item, index) => {
            const name = nameOf(item),
              editing = s.upperEditing === item.key;
            const update = (fn) =>
              change((next) => fn(next.items.find((row) => row.key === item.key)));
            return h(
              "li",
              {
                className: "navigationUpperItem",
                children: [
                  h("div", {
                    className: "navigationPageHeading",
                    children: [
                      manager.check(t.visible + " : " + name, item.visible, (value) =>
                        update((row) => {
                          row.visible = value;
                        }),
                      ),
                      h(ui.Typography, { component: "span", children: name, variant: "body" }),
                      h(ui.Button, {
                        "label": t.customize,
                        "aria-label": t.customize + " : " + name,
                        "aria-expanded": editing,
                        "variant": "ghost",
                        "isDisabled": s.busy || s.contextChanged,
                        "onClick": () =>
                          manager.setState({ upperEditing: editing ? undefined : item.key }),
                      }),
                    ],
                  }),
                  order("items", index, name),
                  editing
                    ? h("div", {
                        className: "navigationInlineEditor",
                        children: [
                          translatedField(t.label, item.labels, (_next, value) => {
                            _next.items.find((row) => row.key === item.key).labels[lang] = value;
                          }),
                          item.kind === "internal"
                            ? pagePicker(manager, item.key, item.id, (uuid) =>
                                update((row) => {
                                  if (uuid) row.id = uuid;
                                  else delete row.id;
                                }),
                              )
                            : null,
                          item.kind === "external"
                            ? manager.field(t.upperAddress, item.url || "", (value) =>
                                update((row) => {
                                  row.url = value.trim();
                                }),
                              )
                            : null,
                          item.kind === "rss"
                            ? manager.field(t.upperAddress, config.rss.url, (value) =>
                                change((next) => {
                                  next.rss.url = value.trim();
                                }),
                              )
                            : null,
                          action(t.upperRemove + " : " + name, () =>
                            change((next) => {
                              next.items = next.items.filter((row) => row.key !== item.key);
                            }),
                          ),
                        ],
                      })
                    : null,
                ],
              },
              item.key,
            );
          }),
        },
        "items",
      ),
      h(
        "div",
        {
          className: "navigationOrderActions",
          children: [
            ...["internal", "external"].map((kind) =>
              action(
                kind === "internal" ? t.upperAddPage : t.upperAddExternal,
                () =>
                  change((next) => {
                    next.items.push({
                      key: crypto.randomUUID(),
                      kind,
                      visible: true,
                      labels: {},
                      ...(kind === "external" ? { url: "" } : {}),
                    });
                    manager.setState({ upperEditing: next.items.at(-1).key });
                  }),
                config.items.length >= 40,
                kind,
              ),
            ),
            ...["search", "languages", "rss"]
              .filter((kind) => !config.items.some((item) => item.kind === kind))
              .map((kind) =>
                action(
                  t.upperAdd + " " + title(kind),
                  () =>
                    change((next) => {
                      next.items.push({
                        key: crypto.randomUUID(),
                        kind,
                        visible: true,
                        labels: {},
                      });
                    }),
                  config.items.length >= 40,
                  kind,
                ),
              ),
          ],
        },
        "add",
      ),
      h(
        ui.Typography,
        { component: "h2", variant: "heading", children: t.upperButtons },
        "buttons",
      ),
      ...config.buttons.map((button, index) => {
        const name =
            button.labels[lang]?.trim() ||
            (button.key === "contact" ? t.upperContact : t.upperDemo),
          editing = s.upperEditing === "button-" + button.key;
        const update = (fn) =>
          change((next) => fn(next.buttons.find((row) => row.key === button.key)));
        return h(
          "div",
          {
            className: "navigationUpperItem",
            children: [
              h("div", {
                className: "navigationPageHeading",
                children: [
                  manager.check(t.visible + " : " + name, button.visible, (value) =>
                    update((row) => {
                      row.visible = value;
                    }),
                  ),
                  h(ui.Typography, { component: "span", variant: "body", children: name }),
                  h(ui.Button, {
                    "label": t.customize,
                    "aria-label": t.customize + " : " + name,
                    "aria-expanded": editing,
                    "variant": "ghost",
                    "isDisabled": s.busy || s.contextChanged,
                    "onClick": () =>
                      manager.setState({
                        upperEditing: editing ? undefined : "button-" + button.key,
                      }),
                  }),
                ],
              }),
              order("buttons", index, name),
              editing
                ? h("div", {
                    className: "navigationInlineEditor",
                    children: [
                      translatedField(t.buttonLabel, button.labels, (next, value) => {
                        next.buttons.find((row) => row.key === button.key).labels[lang] = value;
                      }),
                      pagePicker(
                        manager,
                        "button-" + button.key,
                        button.targets?.[lang] || button.target,
                        (uuid) =>
                          update((row) => {
                            row.targets ||= {};
                            row.targets[lang] = uuid || "";
                            delete row.target;
                          }),
                      ),
                      manager.select(
                        t.upperPlacement,
                        button.placement,
                        [
                          ["upper", t.upperTitle],
                          ["main", t.upperMain],
                        ],
                        (value) =>
                          update((row) => {
                            row.placement = value;
                          }),
                      ),
                      manager.select(
                        t.upperStyle,
                        button.style,
                        [
                          ["primary", t.upperPrimary],
                          ["secondary", t.upperSecondary],
                        ],
                        (value) =>
                          update((row) => {
                            row.style = value;
                          }),
                      ),
                    ],
                  })
                : null,
            ],
          },
          button.key,
        );
      }),
    ],
  });
}
