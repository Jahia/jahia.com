import { load, save, publish, label } from "./api.js";
const h = (type, props = {}, key = null) => ({
  $$typeof: Symbol.for("react.element"),
  type,
  key: key === null ? null : String(key),
  ref: null,
  props,
  _owner: null,
  _store: {},
});
const clone = (value) => JSON.parse(JSON.stringify(value));
const PickerContext = ({ value, children }) =>
  h(window.jahia.jcontent.ContentEditorConfigContext.Provider, {
    value,
    children: h(window.jahia.jcontent.ContentEditorContext.Provider, { value, children }),
  });
const context = () => {
  const state = window.jahia.reduxStore.getState();
  return {
    site: state.site,
    lang: state.language || "fr",
    ui: String(state.uilang || "fr").startsWith("fr") ? "fr" : "en",
  };
};
const messages = {
  fr: {
    title: "Fil d’Ariane",
    reload: "Recharger",
    save: "Enregistrer",
    publish: "Publier le fil d’Ariane",
    enabled: "Afficher le fil d’Ariane",
    home: "Libellé d’Accueil",
    category: "Rubrique",
    element: "Page ou groupe",
    language: "Langue des libellés",
    custom: "Libellé personnalisé",
    original: "Libellé existant",
    parent: "Page mère de la rubrique",
    removeParent: "Supprimer la page mère",
    parentHelp:
      "Choisissez dans l’arborescence du site la page à ouvrir pour cette grande rubrique (Produit, Solutions…). Une seule association par rubrique, indépendante des libellés ci-dessous.",
    invalidPage: "Choisissez une page de ce site.",
    noParent: "Aucune page mère : la rubrique reste du texte non cliquable dans le fil d’Ariane.",
    scope:
      "Configuration indépendante de la navbar. Les pages gardent leur place ; seules les étapes du fil d’Ariane sont adaptées.",
    help: "Laissez un libellé vide pour conserver le texte existant. Enregistrer prépare le brouillon ; Publier applique uniquement les réglages du fil d’Ariane, sans republier les pages.",
    dirty: "Modifications non enregistrées",
    ready: "Réglages du fil d’Ariane",
    saved: "Brouillon enregistré. Vous pouvez le publier.",
    published: "Fil d’Ariane publié.",
    pending: "Publication demandée, confirmation LIVE en attente.",
    conflict: "Les réglages ont changé ailleurs. Rechargez avant d’enregistrer.",
    forbidden:
      "Publication indisponible : vérifiez les droits, le verrouillage et le statut de travail.",
    error: "Opération impossible",
    context: "Le site ou la langue a changé. Rechargez pour continuer.",
    preview: "Voir le brouillon enregistré",
    empty: "Aucune page disponible.",
  },
  en: {
    title: "Breadcrumb",
    reload: "Reload",
    save: "Save",
    publish: "Publish breadcrumb",
    enabled: "Show breadcrumb",
    home: "Home label",
    category: "Section",
    element: "Page or group",
    language: "Label language",
    custom: "Custom label",
    original: "Existing label",
    parent: "Section parent page",
    removeParent: "Remove parent page",
    parentHelp:
      "Choose in the site tree the page to open for this top-level section (Product, Solutions…). One association per section, independent of the labels below.",
    invalidPage: "Choose a page from this site.",
    noParent: "No parent page: this section stays as non-clickable text in the breadcrumb.",
    scope:
      "Independent from navbar settings. Site pages keep their place; only breadcrumb steps change.",
    help: "Leave a label empty to keep the existing text. Save prepares a draft; Publish applies only breadcrumb settings, without republishing pages.",
    dirty: "Unsaved changes",
    ready: "Breadcrumb settings",
    saved: "Draft saved. Ready to publish.",
    published: "Breadcrumb published.",
    pending: "Publication requested; waiting for LIVE confirmation.",
    conflict: "Settings changed elsewhere. Reload before saving.",
    forbidden: "Publication unavailable: check rights, locks and work-in-progress status.",
    error: "Operation failed",
    context: "The site or language changed. Reload to continue.",
    preview: "Open saved draft",
    empty: "No pages available.",
  },
};
export class BreadcrumbManager {
  constructor(props) {
    this.props = props;
    this.state = {
      busy: true,
      dirty: false,
      snapshot: null,
      settings: null,
      status: "",
      error: "",
      root: null,
      selected: null,
      lang: context().lang,
    };
  }
  setState(patch) {
    if (this.alive) this.updater.enqueueSetState(this, patch, null, "setState");
  }
  text() {
    return messages[context().ui];
  }
  componentDidMount() {
    this.alive = true;
    this.previousEditorLanguage = window.jahia.reduxStore.getState().contenteditor.ceLanguage;
    this.syncPickerLanguage();
    this.setupPicker();
    this.ctx = context();
    const id = "jahiacomBreadcrumb-style";
    if (!document.getElementById(id)) {
      const css = document.createElement("link");
      css.id = id;
      css.rel = "stylesheet";
      css.href =
        (window.contextJsParameters.contextPath || "") +
        "/modules/jahiacom/javascript/breadcrumb/manager.css";
      document.head.append(css);
    }
    this.unsubscribe = window.jahia.reduxStore.subscribe(() => {
      const next = context();
      if (next.site !== this.ctx.site || next.lang !== this.ctx.lang) {
        this.ctx = next;
        if (this.state.dirty) this.setState({ contextChanged: true, error: this.text().context });
        else this.reload();
      }
    });
    this.beforeUnload = (e) => {
      if (this.state.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", this.beforeUnload);
    this.unblock = window.jahia.routerHistory?.block?.(() =>
      this.state.dirty ? this.text().dirty : undefined,
    );
    this.reload();
  }
  componentDidUpdate(_props, previous) {
    if (previous.lang !== this.state.lang) this.syncPickerLanguage();
  }
  syncPickerLanguage() {
    // Jahia's native picker tree and table read this editor language from Redux.
    this.pickerLanguage = this.state.lang;
    window.jahia.reduxStore.dispatch({ type: "CE_SWITCH_LANGUAGE", payload: this.pickerLanguage });
  }
  componentWillUnmount() {
    this.alive = false;
    this.unsubscribe?.();
    this.unblock?.();
    window.removeEventListener("beforeunload", this.beforeUnload);
    if (window.jahia.reduxStore.getState().contenteditor.ceLanguage === this.pickerLanguage)
      window.jahia.reduxStore.dispatch({
        type: "CE_SWITCH_LANGUAGE",
        payload: this.previousEditorLanguage,
      });
  }
  async reload() {
    const request = (this.requestId || 0) + 1;
    this.requestId = request;
    this.setState({ busy: true, error: "", contextChanged: false });
    try {
      const c = context(),
        snapshot = await load(c.site);
      if (request !== this.requestId) return;
      const root = snapshot.roots.includes(this.state.root) ? this.state.root : snapshot.roots[0];
      this.setState({
        snapshot,
        settings: clone(snapshot.settings),
        root,
        selected: root,
        lang: c.lang,
        dirty: false,
        busy: false,
        status: this.text().ready,
      });
    } catch (e) {
      this.setState({ busy: false, error: e.message });
    }
  }
  change(fn) {
    if (this.state.busy || this.state.contextChanged) return;
    const settings = clone(this.state.settings);
    fn(settings);
    this.setState({ settings, dirty: true, status: this.text().dirty, error: "" });
  }
  async action(kind) {
    const t = this.text();
    this.setState({ busy: true, error: "" });
    try {
      if (kind === "save") {
        const snapshot = await save(this.state.snapshot, this.state.settings);
        this.setState({
          snapshot,
          settings: clone(snapshot.settings),
          busy: false,
          dirty: false,
          status: t.saved,
        });
      } else {
        const done = await publish(this.state.snapshot);
        this.setState({ busy: false, status: done ? t.published : t.pending });
      }
    } catch (e) {
      this.setState({
        busy: false,
        error:
          e.message === "CONFLICT"
            ? t.conflict
            : e.message === "PUBLICATION_NOT_ALLOWED"
              ? t.forbidden
              : t.error + " : " + e.message,
      });
    }
  }
  select(title, value, items, onChange) {
    const ui = window.jahia.moonstone;
    return h(
      ui.Field,
      {
        label: title,
        children: h(ui.Dropdown, {
          "aria-label": title,
          "value": String(value || ""),
          "data": items.map(([key, text]) => ({ value: String(key), label: text })),
          "isDisabled": this.state.busy || this.state.contextChanged,
          "onChange": (_e, item) => onChange(item.value),
        }),
      },
      title,
    );
  }
  field(title, value, onChange) {
    const ui = window.jahia.moonstone;
    return h(
      ui.Field,
      {
        label: title,
        children: h(ui.Input, {
          "aria-label": title,
          value,
          "maxLength": 250,
          "isDisabled": this.state.busy || this.state.contextChanged,
          "onChange": (e) => onChange(e.target.value),
        }),
      },
      title,
    );
  }
  mother(node) {
    const items = this.state.snapshot.items,
      custom = this.state.settings.parents[node.uuid];
    return items.find((n) => n.uuid === custom && n.page);
  }
  async setupPicker() {
    try {
      const versions = Object.values(window.jahia.webpackShareScopes.default.formik);
      const shared = versions.find((entry) => entry.loaded) || versions[0];
      const factory = await shared.get();
      this.setState({ Formik: factory().Formik });
    } catch (error) {
      this.setState({ pickerError: error.message });
    }
  }
  pagePicker(root) {
    const ui = window.jahia.moonstone,
      s = this.state,
      t = this.text(),
      disabled = s.busy || s.contextChanged,
      field = {
        name: "breadcrumbParent",
        displayName: t.parent,
        multiple: false,
        mandatory: false,
        readOnly: disabled,
        selectorOptions: [{ name: "type", value: "page" }],
        valueConstraints: [{ displayValue: "jnt:page", value: { string: "jnt:page" } }],
      };
    if (!s.Formik)
      return s.pickerError
        ? h("p", { role: "alert", children: t.error + " : " + s.pickerError })
        : h(ui.Loader, { size: "small" });
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
    const value = s.settings.parents[root.uuid] || undefined;
    return h(
      ui.Field,
      {
        label: t.parent,
        children: [
          h(
            PickerContext,
            {
              value: { site: s.snapshot.site, lang: s.lang },
              children: h(
                s.Formik,
                {
                  initialValues: { breadcrumbParent: value || "" },
                  enableReinitialize: true,
                  onSubmit: () => {},
                  children: h(selector.cmp, {
                    field,
                    value,
                    editorContext: { site: s.snapshot.site, lang: s.lang },
                    inputContext: { selectorType: selector, displayActions: false },
                    onBlur: () => {},
                    onChange: (uuid) => {
                      if (
                        uuid &&
                        !s.snapshot.items.some((node) => node.uuid === uuid && node.page)
                      ) {
                        this.setState({ error: t.invalidPage });
                        return;
                      }
                      this.change((settings) => {
                        if (uuid) settings.parents[root.uuid] = uuid;
                        else delete settings.parents[root.uuid];
                      });
                    },
                  }),
                },
                root.uuid + "-" + s.lang,
              ),
            },
            "picker",
          ),
          s.settings.parents[root.uuid]
            ? h(
                ui.Button,
                {
                  label: t.removeParent,
                  isDisabled: disabled,
                  onClick: () =>
                    this.change((settings) => {
                      delete settings.parents[root.uuid];
                    }),
                },
                "reset",
              )
            : h(
                ui.Typography,
                { component: "p", variant: "caption", children: t.noParent },
                "no-parent",
              ),
        ],
      },
      "rubric-parent-" + root.uuid,
    );
  }
  render() {
    const ui = window.jahia.moonstone,
      t = this.text(),
      s = this.state,
      disabled = s.busy || s.contextChanged;
    const root = s.snapshot?.items.find((n) => n.uuid === s.root),
      item = s.snapshot?.items.find((n) => n.uuid === s.selected),
      mother = item && !item.page ? this.mother(item) : item;
    const action = (text, fn, off) =>
      h(ui.Button, { label: text, onClick: fn, isDisabled: off }, text);
    const header = h(ui.Header, {
      title: t.title,
      mainActions: [
        action(t.reload, () => this.reload(), s.busy),
        action(
          t.preview,
          () =>
            window.open(
              (window.contextJsParameters.contextPath || "") +
                "/cms/render/default/" +
                s.lang +
                encodeURI(mother.path) +
                ".html",
              "_blank",
              "noopener",
            ),
          disabled || !mother,
        ),
        action(t.save, () => this.action("save"), disabled || !s.dirty),
        action(t.publish, () => this.action("publish"), disabled || s.dirty || !s.snapshot?.exists),
      ],
      status: h(ui.Typography, {
        component: "span",
        variant: "caption",
        children: s.dirty ? t.dirty : s.snapshot?.site || "",
      }),
    });
    let body = s.snapshot
      ? h("div", {
          className: "breadcrumbSettingsBody",
          children: [
            h(ui.Typography, { component: "p", children: t.scope }, "scope"),
            h(ui.Typography, { component: "p", variant: "caption", children: t.help }, "help"),
            h(
              ui.Field,
              {
                label: t.enabled,
                children: h(ui.Checkbox, {
                  "aria-label": t.enabled,
                  "checked": s.settings.enabled,
                  "isDisabled": disabled,
                  "onChange": () =>
                    this.change((value) => {
                      value.enabled = !value.enabled;
                    }),
                }),
              },
              "enabled",
            ),
            this.select(
              t.language,
              s.lang,
              [
                ["fr", "Français"],
                ["en", "English"],
              ],
              (lang) => this.setState({ lang }),
            ),
            this.field(t.home, s.settings.homeLabels[s.lang] || "", (value) =>
              this.change((v) => {
                v.homeLabels[s.lang] = value;
              }),
            ),
            this.select(
              t.category,
              s.root,
              s.snapshot.roots.map((id) => {
                const node = s.snapshot.items.find((n) => n.uuid === id);
                return [id, label(node, s.lang)];
              }),
              (root) => this.setState({ root, selected: root }),
            ),
            root && !root.page ? this.pagePicker(root) : null,
            root && !root.page
              ? h(
                  ui.Typography,
                  { component: "p", variant: "caption", children: t.parentHelp },
                  "parent-help",
                )
              : null,
            this.select(
              t.element,
              s.selected,
              (() => {
                const root = s.snapshot.items.find((n) => n.uuid === s.root);
                if (!root) return [];
                return s.snapshot.items
                  .filter((n) => n.uuid === s.root || n.path.startsWith(root.path + "/"))
                  .map((n) => [n.uuid, label(n, s.lang)]);
              })(),
              (selected) => this.setState({ selected }),
            ),
            item
              ? this.field(t.custom, s.settings.labels[item.uuid]?.[s.lang] || "", (value) =>
                  this.change((v) => {
                    v.labels[item.uuid] ||= {};
                    v.labels[item.uuid][s.lang] = value;
                  }),
                )
              : null,
            item
              ? h(
                  ui.Typography,
                  {
                    component: "p",
                    variant: "caption",
                    children: t.original + " : " + label(item, s.lang),
                  },
                  "original",
                )
              : null,
          ],
        })
      : h(ui.Loader, { size: "big" });
    if (s.snapshot && !s.snapshot.roots.length)
      body = h(ui.Typography, { component: "p", children: t.empty });
    return h(ui.LayoutModule, {
      content: h("div", {
        className: "jahiacomBreadcrumbManager",
        children: [
          header,
          h(
            "div",
            {
              className: "breadcrumbSettingsContent",
              children: [
                s.error ? h("p", { role: "alert", children: s.error }, "error") : null,
                h("p", { "role": "status", "aria-live": "polite", "children": s.status }, "status"),
                body,
              ],
            },
            "content",
          ),
        ],
      }),
    });
  }
}
BreadcrumbManager.prototype.isReactComponent = {};
