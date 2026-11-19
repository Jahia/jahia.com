import { renderUpperBar, setupUpperPicker } from "./upperBarEditor.js?editor=tabs-1";
import { emptySection } from "./model.js";
import {
  load,
  save,
  publish,
  walk,
  sourceLabel,
  loadIconImage,
  loadPreviewReferences,
} from "./api.js?editor=tabs-1";
import { messages } from "./messages.js?editor=tabs-1";
import { navigationRows, navigationColumnRows, assignedColumn } from "./structure.js";

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
const context = () => {
  const state = window.jahia.reduxStore.getState();
  return {
    site: state.site,
    language: state.language || "fr",
    uiLanguage: String(state.uilang || "fr").startsWith("fr") ? "fr" : "en",
  };
};
const labelMap = () => ({ fr: "", en: "" });

export class NavigationManager {
  constructor(props) {
    this.props = props;
    this.state = {
      busy: true,
      snapshot: null,
      settings: null,
      selected: null,
      tab: "structure",
      dirty: false,
      status: "",
      error: "",
      contextChanged: false,
      contentLanguage: context().language,
      columnFilter: "all",

      structureView: "columns",
      imagePreviews: {},
      collapsed: {},
      showPreview: false,
      previewWidth: "1440",
      previewScale: 1,
      previewReady: false,
      previewReferences: {},
    };
    this.alive = false;
    this.previewToken = crypto.randomUUID();
  }
  setState(patch) {
    if (this.alive) this.updater.enqueueSetState(this, patch, null, "setState");
  }
  componentDidMount() {
    this.alive = true;
    setupUpperPicker(this);
    const id = "jahiacomNavigationManager-style";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        (window.contextJsParameters.contextPath || "") +
        "/modules/jahiacom/javascript/navigation/manager.css?editor=tabs-1";
      document.head.append(link);
    }
    this.lastContext = context();
    this.unsubscribe = window.jahia.reduxStore.subscribe(() => {
      const next = context();
      if (next.site !== this.lastContext.site || next.language !== this.lastContext.language) {
        this.lastContext = next;
        if (this.state.dirty)
          this.setState({ contextChanged: true, error: messages[next.uiLanguage].context });
        else this.reload();
      }
    });
    this.beforeUnload = (event) => {
      if (this.state.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", this.beforeUnload);
    this.previewMessage = (event) => {
      const frame = document.getElementById("navigation-editor-preview-frame");
      if (
        !frame ||
        event.source !== frame.contentWindow ||
        event.origin !== location.origin ||
        event.data?.token !== this.previewChannel()
      )
        return;
      if (event.data.type === "jahiacom-navigation-preview-ready") this.sendPreview();
      if (event.data.type === "jahiacom-navigation-preview-applied") {
        clearTimeout(this.previewTimeout);
        this.setState({ previewReady: true, previewError: "" });
      }
      if (event.data.type === "jahiacom-navigation-preview-error")
        this.setState({ previewError: this.text().previewError });
    };
    window.addEventListener("message", this.previewMessage);
    this.previewFullscreenChanged = () =>
      this.setState({
        previewFullscreen:
          document.fullscreenElement?.classList.contains("navigationPreview") || false,
      });
    document.addEventListener("fullscreenchange", this.previewFullscreenChanged);
    this.unblock = window.jahia.routerHistory?.block?.(() =>
      this.state.dirty ? this.text().unsaved : undefined,
    );
    this.reload();
  }
  componentWillUnmount() {
    this.alive = false;
    this.unsubscribe?.();
    this.unblock?.();
    window.removeEventListener("beforeunload", this.beforeUnload);
    window.removeEventListener("message", this.previewMessage);
    document.removeEventListener("fullscreenchange", this.previewFullscreenChanged);
    this.previewObserver?.disconnect();
    cancelAnimationFrame(this.previewResizeFrame);
    clearTimeout(this.previewTimeout);
  }
  componentDidUpdate(_props, previous) {
    if (
      this.state.showPreview &&
      this.state.settings?.mode === "automatic" &&
      (!previous.showPreview ||
        previous.previewRevision !== this.state.previewRevision ||
        previous.settings?.mode !== this.state.settings?.mode ||
        previous.contentLanguage !== this.state.contentLanguage ||
        previous.snapshot?.site !== this.state.snapshot?.site)
    ) {
      this.setState({ previewReady: false, previewError: "" });
      this.startPreviewTimer();
    }
    const box = document.getElementById("navigation-editor-preview");
    if (box && !this.previewObserver) {
      this.previewObserver = new ResizeObserver(() => {
        cancelAnimationFrame(this.previewResizeFrame);
        this.previewResizeFrame = requestAnimationFrame(() => {
          const scale = Math.min(1, box.clientWidth / Number(this.state.previewWidth));
          if (scale > 0 && scale !== this.state.previewScale)
            this.setState({ previewScale: scale });
        });
      });
      this.previewObserver.observe(box);
      if (!previous.showPreview)
        requestAnimationFrame(() => {
          const layout = box.closest(".navigationEditorLayout");
          if (layout && getComputedStyle(layout).display !== "grid")
            box.closest(".navigationPreview")?.scrollIntoView({ block: "start" });
        });
    } else if (!box) {
      this.previewObserver?.disconnect();
      cancelAnimationFrame(this.previewResizeFrame);
      this.previewObserver = undefined;
    }
    if (
      this.state.showPreview &&
      (previous.showPreview !== this.state.showPreview ||
        previous.settings !== this.state.settings ||
        previous.selected !== this.state.selected ||
        previous.tab !== this.state.tab ||
        previous.imagePreviews !== this.state.imagePreviews ||
        previous.previewReferences !== this.state.previewReferences ||
        previous.contentLanguage !== this.state.contentLanguage ||
        previous.previewWidth !== this.state.previewWidth)
    ) {
      requestAnimationFrame(() => requestAnimationFrame(() => this.sendPreview()));
      this.preloadPreviewImages();
      this.preloadPreviewReferences();
    }
    if (
      this.state.tab === "upper" &&
      (previous.tab !== "upper" ||
        previous.settings !== this.state.settings ||
        previous.snapshot !== this.state.snapshot)
    )
      this.preloadPreviewReferences();
    if (
      this.state.tab === "structure" &&
      this.state.editingItemId &&
      (previous.editingItemId !== this.state.editingItemId ||
        previous.selected !== this.state.selected ||
        previous.iconItemId !== this.state.iconItemId ||
        previous.settings !== this.state.settings)
    )
      this.preloadIcon();
  }
  sendPreview() {
    const state = this.state,
      frame = document.getElementById("navigation-editor-preview-frame");
    if (!state.showPreview || !state.snapshot || !frame?.contentWindow) return;
    const imageUrls = Object.fromEntries(
      Object.entries(state.imagePreviews)
        .filter(([, image]) => image.url)
        .map(([id, image]) => [id, image.url]),
    );
    frame.contentWindow.postMessage(
      {
        type: "jahiacom-navigation-preview",
        token: this.previewChannel(),
        site: state.snapshot.site,
        language: state.contentLanguage,
        settings: state.settings,
        sections: state.snapshot.sections,
        selected: state.tab === "upper" ? null : state.selected,
        imageUrls,
        references: Object.values(state.previewReferences),
        context: window.contextJsParameters.contextPath || "",
      },
      location.origin,
    );
  }
  previewChannel() {
    return `${this.previewToken}-${this.state.contentLanguage}-${this.state.previewRevision || 0}`;
  }
  async preloadPreviewReferences() {
    if ((!this.state.showPreview && this.state.tab !== "upper") || !this.state.snapshot) return;
    const site = this.state.snapshot.site,
      tree = walk(this.state.snapshot.sections),
      known = new Set([
        ...tree.map((node) => node.id),
        ...Object.keys(this.state.previewReferences),
      ]),
      ids = new Set();
    for (const node of [...tree, ...Object.values(this.state.previewReferences)])
      for (const property of ["navLandingPage", "navDiscoverPage", "navFeatureLink", "j:node"])
        if (typeof node.native[property] === "string") ids.add(node.native[property]);
    for (const section of Object.values(this.state.settings.sections)) {
      if (section.discover?.target) ids.add(section.discover.target);
      if (section.feature?.target) ids.add(section.feature.target);
    }
    const upper = this.state.settings.upperBar || this.state.snapshot.upperBar;
    for (const item of upper?.items || []) if (item.id) ids.add(item.id);
    for (const button of upper?.buttons || []) {
      if (button.target) ids.add(button.target);
      Object.values(button.targets || {})
        .filter(Boolean)
        .forEach((id) => ids.add(id));
    }
    this.requestedReferences ||= new Set();
    const pending = [...ids].filter(
      (id) => !known.has(id) && !this.requestedReferences.has(site + ":" + id),
    );
    if (!pending.length) return;
    pending.forEach((id) => this.requestedReferences.add(site + ":" + id));
    const requestId = this.requestId;
    try {
      const nodes = await loadPreviewReferences(site, pending);
      if (this.state.snapshot.site === site && this.requestId === requestId)
        this.setState({
          previewReferences: {
            ...this.state.previewReferences,
            ...Object.fromEntries(nodes.map((node) => [node.id, node])),
          },
        });
    } catch {
      this.setState({ previewError: this.text().previewReferenceError });
    }
  }
  startPreviewTimer() {
    clearTimeout(this.previewTimeout);
    this.previewTimeout = setTimeout(() => {
      if (this.alive && this.state.showPreview && !this.state.previewReady)
        this.setState({ previewError: this.text().previewError });
    }, 20000);
  }
  async preloadPreviewImages() {
    if (!this.state.showPreview || !this.state.snapshot) return;
    const ids = new Set(
      walk(this.state.snapshot.sections)
        .map((node) => node.native.navIconImage)
        .filter((id) => typeof id === "string"),
    );
    for (const section of Object.values(this.state.settings.sections))
      for (const choice of Object.values(section.icons || {}))
        if (choice?.kind === "image") ids.add(choice.id);
    const rssImage = (this.state.settings.upperBar || this.state.snapshot.upperBar)?.rss.image;
    if (rssImage) ids.add(rssImage);
    this.requestedImages ||= new Set();
    const pending = [...ids].filter(
      (id) => !this.state.imagePreviews[id] && !this.requestedImages.has(id),
    );
    if (!pending.length) return;
    pending.forEach((id) => this.requestedImages.add(id));
    const results = await Promise.all(
      pending.map(async (id) => {
        try {
          return [id, await loadIconImage(id, this.state.contentLanguage)];
        } catch {
          return [id, { unavailable: true }];
        }
      }),
    );
    this.setState({
      imagePreviews: { ...this.state.imagePreviews, ...Object.fromEntries(results) },
    });
  }
  renderPreview() {
    if (!this.state.showPreview) return null;
    const state = this.state,
      ui = window.jahia.moonstone,
      t = this.text();
    if (state.settings.mode !== "automatic")
      return h(ui.Typography, { component: "p", children: t.previewLegacy }, "preview");
    const src = `${window.contextJsParameters.contextPath || ""}/cms/render/default/${state.contentLanguage}/sites/${state.snapshot.site}/home.html?navigationPreview=${this.previewChannel()}`;
    return h(
      "section",
      {
        "className": "navigationPreview",
        "aria-label": t.previewTitle,
        "children": [
          h(
            ui.Typography,
            { component: "h2", variant: "heading", children: t.previewTitle },
            "title",
          ),
          h(ui.Typography, { component: "p", variant: "caption", children: t.previewHelp }, "help"),
          state.previewFullscreen
            ? null
            : this.select(
                t.previewFormat,
                state.previewWidth,
                [
                  ["1440", t.previewDesktop],
                  ["375", t.previewMobile],
                ],
                (value) => {
                  const box = document.getElementById("navigation-editor-preview");
                  this.setState({
                    previewWidth: value,
                    previewScale: Math.min(1, (box?.clientWidth || Number(value)) / Number(value)),
                  });
                },
              ),
          h(
            "div",
            {
              className: "navigationOrderActions",
              children: [
                document.fullscreenEnabled
                  ? h(
                      ui.Button,
                      {
                        label: state.previewFullscreen ? t.previewReduce : t.previewExpand,
                        variant: "outlined",
                        onClick: () => {
                          const panel = document.querySelector(
                            ".jahiacomNavigationManager .navigationPreview",
                          );
                          const operation = state.previewFullscreen
                            ? document.exitFullscreen()
                            : panel?.requestFullscreen();
                          operation?.catch(() =>
                            this.setState({ previewError: t.previewFullscreenError }),
                          );
                        },
                      },
                      "expand",
                    )
                  : null,
                h(
                  ui.Typography,
                  {
                    component: "p",
                    role: "status",
                    children:
                      state.previewError ||
                      (state.previewReady ? t.previewReady : t.previewLoading),
                  },
                  "status",
                ),
                h(
                  ui.Button,
                  {
                    label: t.previewRefresh,
                    variant: "ghost",
                    onClick: () => {
                      this.requestedReferences?.clear();
                      this.setState({
                        previewRevision: (state.previewRevision || 0) + 1,
                        previewReady: false,
                        previewError: "",
                        previewReferences: {},
                      });
                    },
                  },
                  "refresh",
                ),
              ],
            },
            "toolbar",
          ),
          h(
            "div",
            {
              id: "navigation-editor-preview",
              className: "navigationPreviewViewport",
              style: { height: 800 * state.previewScale },
              children: h(
                "iframe",
                {
                  id: "navigation-editor-preview-frame",
                  title: t.previewTitle,
                  src: src,
                  sandbox: "allow-scripts allow-same-origin",
                  referrerPolicy: "same-origin",
                  style: {
                    width: Number(state.previewWidth),
                    height: 800,
                    transform: `scale(${state.previewScale})`,
                    visibility: state.previewReady ? "visible" : "hidden",
                  },
                },
                state.snapshot.site + state.contentLanguage,
              ),
            },
            "viewport",
          ),
        ],
      },
      "preview",
    );
  }
  iconNode() {
    const source = this.state.snapshot?.sections.find((node) => node.id === this.state.selected);
    return source && (walk([source]).find((node) => node.id === this.state.iconItemId) || source);
  }
  openIconEditor(id) {
    const editingItemId = this.state.editingItemId === id ? undefined : id;
    this.setState({ tab: "structure", iconItemId: editingItemId, editingItemId });
    if (editingItemId)
      requestAnimationFrame(() =>
        document
          .getElementById("navigation-inline-editor-" + id)
          ?.querySelector("input")
          ?.focus(),
      );
  }
  renderItemEditor(node, settings) {
    if (!node || this.state.editingItemId !== node.id) return null;
    const t = this.text(),
      lang = this.state.contentLanguage;
    return h("div", {
      "id": "navigation-inline-editor-" + node.id,
      "className": "navigationInlineEditor",
      "role": "group",
      "aria-label": sourceLabel(node, lang),
      "children": [
        this.field(
          t.label + " : " + sourceLabel(node, lang),
          settings.labels[node.id]?.[lang] || "",
          (value) =>
            this.changeSection((section) => {
              section.labels[node.id] ||= {};
              section.labels[node.id][lang] = value;
            }),
        ),
        h(
          window.jahia.moonstone.Typography,
          {
            component: "p",
            variant: "caption",
            children: t.original + " : " + sourceLabel(node, lang),
          },
          "original",
        ),
        this.select(
          t.weight + " : " + sourceLabel(node, lang),
          settings.weights?.[node.id] ||
            (node.id !== this.state.selected &&
            node.children.length &&
            !settings.direct.includes(node.id)
              ? "bold"
              : "normal"),
          [
            ["bold", t.weightBold],
            ["normal", t.weightNormal],
          ],
          (value) =>
            this.changeSection((section) => {
              section.weights ||= {};
              section.weights[node.id] = value;
            }),
        ),
        node.kind !== "jnt:navMenuText" || node.id === this.state.selected
          ? this.renderIconFields(node, settings)
          : null,
      ],
    });
  }
  storeOrder(ids, column, parentId) {
    this.changeSection((section) => {
      if (parentId) {
        section.childOrder ||= {};
        section.childOrder[parentId] = ids;
      } else {
        section.order ||= {};
        section.order[String(column)] = ids;
      }
    });
  }
  foldControl(node) {
    if (!node.children.length) return null;
    const collapsed = this.state.collapsed[node.id] !== false,
      t = this.text();
    return h(
      window.jahia.moonstone.Button,
      {
        "label": collapsed ? t.unfold : t.fold,
        "aria-label":
          (collapsed ? t.unfold : t.fold) + " : " + sourceLabel(node, this.state.contentLanguage),
        "aria-expanded": !collapsed,
        "variant": "ghost",
        "onClick": () => {
          const patch = { collapsed: { ...this.state.collapsed, [node.id]: !collapsed } };
          if (
            !collapsed &&
            walk(node.children).some((child) => child.id === this.state.editingItemId)
          )
            Object.assign(patch, { editingItemId: undefined, iconItemId: undefined });
          this.setState(patch);
        },
      },
      "fold",
    );
  }
  foldAll(source, collapsed) {
    const nodes = walk(source.children),
      next = { ...this.state.collapsed };
    for (const node of nodes) if (node.children.length) next[node.id] = collapsed;
    const patch = { collapsed: next };
    if (collapsed && nodes.some((node) => node.id === this.state.editingItemId))
      Object.assign(patch, { editingItemId: undefined, iconItemId: undefined });
    this.setState(patch);
  }
  orderControls(settings, branches, index, column, parentId) {
    const t = this.text(),
      ui = window.jahia.moonstone,
      label = sourceLabel(branches[index].node, this.state.contentLanguage);
    const move = (direction) => {
      const ids = branches.map((row) => row.node.id);
      [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
      this.storeOrder(ids, column, parentId);
      requestAnimationFrame(() => {
        const row = document.querySelector(
          '[data-navigation-page="' + branches[index].node.id + '"]',
        );
        const button = row?.querySelector('[data-order="' + direction + '"]');
        (button && !button.disabled
          ? button
          : row?.querySelector("button:not(:disabled)")
        )?.focus();
      });
    };
    return h("div", {
      "className": "navigationOrderActions",
      "role": "group",
      "aria-label": parentId ? t.childOrder : t.order,
      "children": [-1, 1].map((direction) =>
        h(
          ui.Button,
          {
            "label": direction < 0 ? t.moveUp : t.moveDown,
            "aria-label": (direction < 0 ? t.moveUp : t.moveDown) + " : " + label,
            "data-order": String(direction),
            "variant": "ghost",
            "isDisabled":
              this.state.busy ||
              this.state.contextChanged ||
              (direction < 0 ? index === 0 : index === branches.length - 1),
            "onClick": () => move(direction),
          },
          direction,
        ),
      ),
    });
  }
  async preloadIcon() {
    const node = this.iconNode();
    if (!node) return;
    const section = this.state.settings.sections[this.state.selected],
      choice = section.icons?.[node.id];
    const id =
      choice?.kind === "image"
        ? choice.id
        : !Object.hasOwn(section.icons || {}, node.id)
          ? node.native.navIconImage
          : null;
    if (!id || this.state.imagePreviews[id]) return;
    this.requestedImages ||= new Set();
    if (this.requestedImages.has(id)) return;
    this.requestedImages.add(id);
    try {
      const preview = await loadIconImage(id, this.state.contentLanguage);
      this.setState({ imagePreviews: { ...this.state.imagePreviews, [id]: preview } });
    } catch {
      this.setState({
        imagePreviews: { ...this.state.imagePreviews, [id]: { unavailable: true } },
      });
    }
  }
  chooseIconImage(node) {
    const t = this.text(),
      selected = this.state.selected,
      site = this.state.snapshot.site;
    if (this.state.busy || this.state.contextChanged) return;
    if (typeof window.CE_API?.openPicker !== "function") {
      this.setState({ error: t.pickerUnavailable });
      return;
    }
    const trigger = document.activeElement,
      choice = this.state.settings.sections[selected].icons?.[node.id];
    window.CE_API.openPicker({
      type: "image",
      site,
      lang: this.state.contentLanguage,
      uilang: context().uiLanguage,
      isMultiple: false,
      value:
        choice?.kind === "image"
          ? choice.id
          : !Object.hasOwn(this.state.settings.sections[selected].icons || {}, node.id)
            ? node.native.navIconImage
            : undefined,
      setValue: async (items) => {
        if (!this.alive || this.state.selected !== selected || this.state.snapshot.site !== site)
          return;
        try {
          if (!items?.[0]?.uuid) throw Error("IMAGE_UNAVAILABLE");
          const image = await loadIconImage(items[0].uuid, this.state.contentLanguage);
          if (this.state.selected !== selected || this.state.snapshot.site !== site) return;
          this.setState({ imagePreviews: { ...this.state.imagePreviews, [image.uuid]: image } });
          this.changeSection((section) => {
            section.icons ||= {};
            section.icons[node.id] = { kind: "image", id: image.uuid };
          });
          requestAnimationFrame(() => {
            if (trigger?.isConnected) trigger.focus();
          });
        } catch {
          this.setState({ error: t.imageUnavailable });
        }
      },
    });
  }
  renderIconFields(node, settings) {
    const ui = window.jahia.moonstone,
      t = this.text();
    const choice = settings.icons?.[node.id],
      inherited = !Object.hasOwn(settings.icons || {}, node.id);
    const value = inherited
      ? "inherit"
      : choice === null
        ? "none"
        : choice.kind === "preset"
          ? choice.name
          : "image";
    const preset =
      inherited && !node.native.navIconImage
        ? node.native.navIcon
        : choice?.kind === "preset"
          ? choice.name
          : null;
    const imageId =
      choice?.kind === "image" ? choice.id : inherited ? node.native.navIconImage : null;
    const image = imageId ? this.state.imagePreviews[imageId] : null;
    const url =
      preset && ["cms", "dxp", "ai"].includes(preset)
        ? `${window.contextJsParameters.contextPath || ""}/modules/jahiacom/static/icons/navigation/${preset}.${preset === "ai" ? "svg" : "png"}`
        : image?.url;
    return h("section", {
      children: [
        this.select(
          t.iconChoice,
          value,
          [
            ["inherit", t.iconInherit],
            ["none", t.iconNone],
            ["cms", "Jahia CMS"],
            ["dxp", "Jahia DXP"],
            ["ai", "Jahia AI"],
            ["image", t.iconMedia],
          ],
          (next) => {
            if (next === "image") return this.chooseIconImage(node);
            this.changeSection((section) => {
              section.icons ||= {};
              if (next === "inherit") delete section.icons[node.id];
              else section.icons[node.id] = next === "none" ? null : { kind: "preset", name: next };
            });
          },
        ),
        h(
          "div",
          {
            className: "navigationIconPreview",
            children: [
              url ? h("img", { src: url, alt: "", width: 48, height: 48 }, "image") : null,
              h(
                ui.Typography,
                {
                  component: "p",
                  variant: "body",
                  children: image?.unavailable
                    ? t.imageUnavailable
                    : image?.name ||
                      (url ? t.iconPreview : value === "none" ? t.iconNone : t.iconInherit),
                },
                "label",
              ),
            ],
          },
          "preview",
        ),
        h(
          "div",
          {
            className: "navigationIconActions",
            children: [
              h(
                ui.Button,
                {
                  label: t.chooseImage,
                  variant: "outlined",
                  isDisabled: this.state.busy || this.state.contextChanged,
                  onClick: () => this.chooseIconImage(node),
                },
                "choose",
              ),
              h(
                ui.Button,
                {
                  label: t.removeIcon,
                  variant: "ghost",
                  isDisabled: this.state.busy || this.state.contextChanged || value === "none",
                  onClick: () =>
                    this.changeSection((section) => {
                      section.icons ||= {};
                      section.icons[node.id] = null;
                    }),
                },
                "remove",
              ),
            ],
          },
          "actions",
        ),
        h(
          ui.Typography,
          { component: "p", variant: "caption", children: t.iconMediaHelp },
          "media-help",
        ),
      ],
    });
  }
  text() {
    return messages[context().uiLanguage];
  }
  async reload() {
    this.requestedReferences?.clear();
    const requestId = (this.requestId || 0) + 1;
    this.requestId = requestId;
    this.setState({ busy: true, error: "", contextChanged: false });
    try {
      const c = context(),
        snapshot = await load(c.site);
      if (requestId !== this.requestId) return;
      this.setState({
        snapshot,
        previewReferences: {},
        settings: clone(snapshot.settings),
        selected: snapshot.sections.some((s) => s.id === this.state.selected)
          ? this.state.selected
          : snapshot.sections[0]?.id,
        contentLanguage: c.language,
        busy: false,
        dirty: false,
        status: "",
      });
    } catch (error) {
      if (requestId === this.requestId) this.setState({ busy: false, error: error.message });
    }
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
        const confirmed = await publish(this.state.snapshot);
        this.setState({ busy: false, status: confirmed ? t.published : t.pending });
      }
    } catch (error) {
      this.setState({
        busy: false,
        error:
          error.message === "CONFLICT"
            ? t.conflict
            : error.message === "PUBLICATION_NOT_ALLOWED"
              ? t.publicationNotAllowed
              : `${t.error} : ${error.message}`,
      });
    }
  }
  changeSection(change) {
    if (this.state.busy || this.state.contextChanged) return;
    const settings = clone(this.state.settings);
    const section = (settings.sections[this.state.selected] ||= emptySection());
    change(section);
    this.setState({ settings, dirty: true, status: this.text().dirty, error: "" });
  }
  field(label, value, onChange, options = {}) {
    const ui = window.jahia.moonstone;
    return h(
      ui.Field,
      {
        label,
        children: h(options.multiline ? ui.Textarea : ui.Input, {
          "aria-label": label,
          "value": value || "",
          "isDisabled": this.state.busy || this.state.contextChanged,
          "maxLength": options.multiline ? 4000 : 250,
          "onChange": (event) => onChange(event.target.value),
        }),
      },
      options.key || label,
    );
  }
  select(label, value, data, onChange, disabled = false, compact = false) {
    const ui = window.jahia.moonstone;
    const dropdown = h(ui.Dropdown, {
      "aria-label": label,
      "value": String(value),
      "data": data.map(([key, text]) => ({ value: String(key), label: text })),
      "isDisabled": disabled || this.state.busy || this.state.contextChanged,
      "onChange": (_event, item) => onChange(item.value),
    });
    return compact ? dropdown : h(ui.Field, { label, children: dropdown }, label);
  }
  check(label, checked, onChange, disabled = false) {
    return h(
      window.jahia.moonstone.Checkbox,
      {
        label,
        "aria-label": label,
        checked,
        "isDisabled": disabled || this.state.busy || this.state.contextChanged,
        "onChange": (event) => onChange(event.target.checked),
      },
      label,
    );
  }
  rows(source) {
    return navigationRows(source);
  }
  rowState(source, settings, { node, ancestors }) {
    const excludedParent = ancestors.some(
      (id) => settings.excluded.includes(id) || settings.direct.includes(id),
    );
    const overview =
      node.id === source.native.navLandingPage || node.id === source.native.navDiscoverPage;
    const selected =
      settings.mode === "selected"
        ? settings.selected.includes(node.id)
        : !settings.excluded.includes(node.id);
    return {
      overview,
      label:
        settings.labels[node.id]?.[this.state.contentLanguage]?.trim() ||
        sourceLabel(node, this.state.contentLanguage),
      checked: selected && !excludedParent && !overview,
      disabled: excludedParent || overview,
      toggle: (value) =>
        this.changeSection((section) => {
          const ids = node.children.length ? walk([node]).map((n) => n.id) : [node.id];
          const key = section.mode === "selected" ? "selected" : "excluded";
          if (key === "selected")
            section.excluded = section.excluded.filter((id) => !ids.includes(id));
          section[key] = section[key].filter((id) => !ids.includes(id));
          if (section.mode === "selected" ? value : !value) section[key].push(...ids);
        }),
    };
  }
  branchColumn(settings, row, disabled = false) {
    const t = this.text();
    return this.select(
      `${t.column} : ${sourceLabel(row.node, this.state.contentLanguage)}`,
      assignedColumn(settings, row.branch),
      Array.from({ length: settings.columnCount }, (_, index) => [
        index + 1,
        `${t.columnPrefix} ${index + 1}`,
      ]),
      (value) => {
        this.changeSection((section) => {
          section.columns[row.branch] = Number(value);
          if (section.order)
            for (const column of Object.keys(section.order))
              section.order[column] = section.order[column].filter((id) => id !== row.branch);
        });
        // Moving a branch remounts its controls in another column; keep keyboard focus.
        if (this.state.structureView === "columns")
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              const field = document.querySelector(
                `[data-navigation-page="${row.node.id}"] .navigationBranchControls [aria-label]`,
              );
              const container = field || document.querySelector(`[aria-label="${t.columnFilter}"]`);
              (container?.querySelector('[tabindex="0"]') || container)?.focus();
            }),
          );
      },
      disabled,
      true,
    );
  }
  branchBehavior(settings, node, disabled = false) {
    const t = this.text();
    return this.select(
      `${t.behavior} : ${sourceLabel(node, this.state.contentLanguage)}`,
      settings.direct.includes(node.id) ? "direct" : "expand",
      [
        ["expand", t.expand],
        ["direct", t.direct],
      ],
      (value) =>
        this.changeSection((section) => {
          section.direct = section.direct.filter((id) => id !== node.id);
          if (value === "direct") section.direct.push(node.id);
        }),
      disabled,
      true,
    );
  }
  renderColumns(source, settings, rows) {
    const ui = window.jahia.moonstone,
      t = this.text();
    const overviewRows = rows.filter((row) => this.rowState(source, settings, row).overview);
    const columns = navigationColumnRows(
      rows.filter((row) => !this.rowState(source, settings, row).overview),
      settings,
    );
    return h("div", {
      children: [
        h(
          "div",
          {
            className: "navigationColumns",
            children: columns.map((column, index) => {
              const number = index + 1,
                title = `${t.columnPrefix} ${number}`;
              if (this.state.columnFilter !== "all" && this.state.columnFilter !== String(number))
                return null;
              const branches = column.filter((row) => row.depth === 0);
              return h(
                "section",
                {
                  "className": "navigationColumn",
                  "aria-label": title,
                  "data-navigation-column": String(number),
                  "children": [
                    h(
                      ui.Typography,
                      { component: "h2", variant: "heading", children: title },
                      "title",
                    ),
                    branches.length
                      ? h(
                          "ul",
                          {
                            className: "navigationBranchList",
                            children: branches.map((root) =>
                              h(
                                "li",
                                {
                                  className: "navigationBranch",
                                  children: column
                                    .filter(
                                      (row) =>
                                        row.branch === root.branch &&
                                        !row.ancestors.some(
                                          (id) => this.state.collapsed[id] !== false,
                                        ),
                                    )
                                    .map((row) => {
                                      const { node, depth } = row,
                                        state = this.rowState(source, settings, row),
                                        parentId = row.ancestors.at(-1),
                                        siblings =
                                          depth === 0
                                            ? branches
                                            : column.filter(
                                                (candidate) =>
                                                  candidate.ancestors.at(-1) === parentId,
                                              );
                                      return h(
                                        "div",
                                        {
                                          "className": "navigationColumnPage",
                                          "data-navigation-page": node.id,
                                          "style": { paddingInlineStart: `${depth * 20}px` },
                                          "children": [
                                            h(
                                              "div",
                                              {
                                                className: "navigationPageHeading",
                                                children: [
                                                  this.check(
                                                    `${t.visible} : ${state.label}`,
                                                    state.checked,
                                                    state.toggle,
                                                    state.disabled,
                                                  ),
                                                  h(
                                                    ui.Typography,
                                                    {
                                                      component: "span",
                                                      variant: "body",
                                                      children: state.label,
                                                      style: {
                                                        fontWeight:
                                                          settings.weights?.[node.id] === "bold"
                                                            ? 700
                                                            : settings.weights?.[node.id] ===
                                                                "normal"
                                                              ? 500
                                                              : undefined,
                                                      },
                                                    },
                                                    "title",
                                                  ),
                                                  h(
                                                    ui.Button,
                                                    {
                                                      "label": t.customize,
                                                      "aria-label": `${t.customize} : ${sourceLabel(node, this.state.contentLanguage)}`,
                                                      "aria-expanded":
                                                        this.state.editingItemId === node.id,
                                                      "variant": "ghost",
                                                      "isDisabled":
                                                        this.state.busy ||
                                                        this.state.contextChanged,
                                                      "onClick": () => this.openIconEditor(node.id),
                                                    },
                                                    "icon-action",
                                                  ),
                                                ],
                                              },
                                              "name",
                                            ),
                                            this.renderItemEditor(node, settings),
                                            this.foldControl(node),
                                            state.disabled
                                              ? h(
                                                  ui.Typography,
                                                  {
                                                    component: "p",
                                                    variant: "caption",
                                                    children: t.inactive,
                                                  },
                                                  "inactive",
                                                )
                                              : null,
                                            depth === 0 || siblings.length > 1
                                              ? this.orderControls(
                                                  settings,
                                                  siblings,
                                                  depth === 0
                                                    ? branches.indexOf(root)
                                                    : siblings.indexOf(row),
                                                  number,
                                                  parentId,
                                                )
                                              : null,
                                            depth === 0
                                              ? h(
                                                  "div",
                                                  {
                                                    "className": "navigationBranchControls",
                                                    "role": "group",
                                                    "aria-label": state.label,
                                                    "children": [
                                                      h(
                                                        "div",
                                                        {
                                                          children: this.branchColumn(
                                                            settings,
                                                            row,
                                                          ),
                                                        },
                                                        "column",
                                                      ),
                                                      node.children.length
                                                        ? h(
                                                            "div",
                                                            {
                                                              children: this.branchBehavior(
                                                                settings,
                                                                node,
                                                              ),
                                                            },
                                                            "behavior",
                                                          )
                                                        : null,
                                                    ],
                                                  },
                                                  "controls",
                                                )
                                              : null,
                                          ],
                                        },
                                        node.id,
                                      );
                                    }),
                                },
                                root.branch,
                              ),
                            ),
                          },
                          "branches",
                        )
                      : h(
                          ui.Typography,
                          {
                            component: "p",
                            variant: "body",
                            children: t.emptyColumn,
                          },
                          "empty",
                        ),
                  ],
                },
                number,
              );
            }),
          },
          "columns",
        ),
        overviewRows.length
          ? h(
              ui.Typography,
              {
                component: "p",
                variant: "caption",
                children: `${t.overviewHelp} ${overviewRows.map((row) => sourceLabel(row.node, this.state.contentLanguage)).join(", ")}`,
              },
              "overview",
            )
          : null,
      ],
    });
  }
  renderStructure(source, settings) {
    const ui = window.jahia.moonstone,
      t = this.text(),
      rows = this.rows(source);
    const hasDestination =
      source.kind !== "jnt:navMenuText" ||
      source.native.navLandingPage ||
      source.native.navDiscoverPage ||
      settings.discover.target;
    const rowDisabled = settings.mode === "link" || settings.mode === "hidden";
    const modes = [
      ["automatic", t.automatic],
      ["selected", t.selected],
      ["link", t.link],
      ["hidden", t.hidden],
    ];
    const mode = this.select(t.mode, settings.mode, modes, (value) => {
      if (value === "link" && !hasDestination) {
        this.setState({ error: t.noPage });
        return;
      }
      this.changeSection((section) => {
        if (value === "selected" && section.mode !== "selected") {
          section.selected = rows
            .filter(
              ({ node, ancestors }) =>
                !section.excluded.includes(node.id) &&
                !ancestors.some((id) => section.excluded.includes(id)),
            )
            .map(({ node }) => node.id);
          section.excluded = [];
        }
        section.mode = value;
      });
    });
    const count = this.select(
      t.count,
      settings.columnCount,
      [1, 2, 3, 4].map((n) => [n, String(n)]),
      (value) => {
        this.setState({ columnFilter: "all" });
        this.changeSection((section) => {
          section.columnCount = Number(value);
          for (const key of Object.keys(section.columns))
            section.columns[key] = Math.min(section.columns[key], section.columnCount);
        });
      },
      rowDisabled,
    );
    const filter = this.select(
      t.columnFilter,
      this.state.columnFilter,
      [
        ["all", t.allColumns],
        ...Array.from({ length: settings.columnCount }, (_, i) => [
          i + 1,
          `${t.columnPrefix} ${i + 1}`,
        ]),
      ],
      (value) => this.setState({ columnFilter: value }),
      rowDisabled,
    );
    const view = this.select(
      t.structureView,
      this.state.structureView,
      [
        ["columns", t.byColumns],
        ["tree", t.byTree],
      ],
      (value) => this.setState({ structureView: value }),
    );
    if (rowDisabled)
      return h("section", {
        children: [
          h("div", { className: "navigationControls", children: [mode, count] }, "controls"),
          h(
            ui.Typography,
            {
              component: "p",
              variant: "body",
              children: settings.mode === "link" ? t.link : t.hidden,
            },
            "mode",
          ),
          h(ui.Typography, { component: "p", variant: "caption", children: t.privacy }, "privacy"),
        ],
      });
    const body = rows
      .filter((row) => !row.ancestors.some((id) => this.state.collapsed[id] !== false))
      .filter(
        ({ branch }) =>
          this.state.columnFilter === "all" ||
          String(assignedColumn(settings, branch)) === this.state.columnFilter,
      )
      .map(({ node, depth, branch, ancestors }) => {
        const { overview, checked, disabled, label, toggle } = this.rowState(source, settings, {
          node,
          ancestors,
        });
        return h(
          ui.TableRow,
          {
            "hasMultipleLines": true,
            "data-navigation-page": node.id,
            "children": [
              h(
                ui.TableBodyCell,
                {
                  width: 96,
                  children: this.check(
                    `${t.visible} : ${label}`,
                    checked,
                    toggle,
                    rowDisabled || disabled,
                  ),
                },
                "visible",
              ),
              h(
                ui.TableBodyCell,
                {
                  children: h("div", {
                    className: "navigationSourceRow",
                    style: { paddingInlineStart: `${depth * 20}px` },
                    children: [
                      this.foldControl(node),
                      h(
                        node.kind === "jnt:navMenuText" ? ui.Folder : ui.Page,
                        { size: "small" },
                        "icon",
                      ),
                      h(
                        "div",
                        {
                          children: [
                            h(
                              ui.Typography,
                              {
                                component: "span",
                                variant: "body",
                                children: label,
                                style: {
                                  fontWeight:
                                    settings.weights?.[node.id] === "bold"
                                      ? 700
                                      : settings.weights?.[node.id] === "normal"
                                        ? 500
                                        : undefined,
                                },
                              },
                              "label",
                            ),
                            overview
                              ? h(
                                  ui.Typography,
                                  { component: "p", variant: "caption", children: t.overview },
                                  "overview",
                                )
                              : null,
                          ],
                        },
                        "name",
                      ),
                      h(
                        ui.Button,
                        {
                          "label": t.customize,
                          "aria-label":
                            t.customize + " : " + sourceLabel(node, this.state.contentLanguage),
                          "aria-expanded": this.state.editingItemId === node.id,
                          "variant": "ghost",
                          "isDisabled": overview || disabled,
                          "onClick": () => this.openIconEditor(node.id),
                        },
                        "customize",
                      ),
                    ],
                  }),
                },
                "page",
              ),
              h(
                ui.TableBodyCell,
                {
                  width: 190,
                  children:
                    depth === 0
                      ? this.branchColumn(settings, { node, branch }, rowDisabled || overview)
                      : h(ui.Typography, {
                          component: "span",
                          variant: "caption",
                          children: `${t.inherited} · ${assignedColumn(settings, branch)}`,
                        }),
                },
                "column",
              ),
              h(
                ui.TableBodyCell,
                {
                  width: 250,
                  children: node.children.length
                    ? this.branchBehavior(settings, node, rowDisabled || overview)
                    : null,
                },
                "children",
              ),
            ],
          },
          node.id,
        );
      });
    return h("section", {
      children: [
        h(
          "div",
          { className: "navigationControls", children: [mode, count, view, filter] },
          "controls",
        ),
        h(ui.Typography, { component: "p", variant: "caption", children: t.treeHelp }, "help"),
        h(
          "div",
          {
            className: "navigationOrderActions",
            children: [
              h(
                ui.Button,
                {
                  label: t.foldAll,

                  variant: "outlined",
                  onClick: () => this.foldAll(source, true),
                },
                "fold-all",
              ),
              h(
                ui.Button,
                {
                  label: t.unfoldAll,

                  variant: "outlined",
                  onClick: () => this.foldAll(source, false),
                },
                "unfold-all",
              ),
            ],
          },
          "fold-controls",
        ),
        this.state.structureView === "columns"
          ? this.renderColumns(source, settings, rows)
          : h(
              "div",
              {
                className: "navigationTable",
                children: h(ui.Table, {
                  children: [
                    h(
                      ui.TableHead,
                      {
                        children: h(ui.TableRow, {
                          children: [t.visible, t.page, t.column, t.behavior].map((text, index) =>
                            h(
                              ui.TableHeadCell,
                              { children: text, width: [96, undefined, 190, 250][index] },
                              text,
                            ),
                          ),
                        }),
                      },
                      "head",
                    ),
                    h(ui.TableBody, { children: body }, "body"),
                  ],
                }),
              },
              "table",
            ),
      ],
    });
  }
  renderPresentation(source, settings) {
    const ui = window.jahia.moonstone,
      t = this.text(),
      lang = this.state.contentLanguage;
    const candidates = walk(this.state.snapshot.sections).filter(
      (n) => n.kind !== "jnt:navMenuText",
    );
    const destinations = candidates.map((n) => [n.id, sourceLabel(n, lang)]);
    const feature = settings.feature || {
      visible: false,
      eyebrow: labelMap(),
      heading: labelMap(),
      text: labelMap(),
      label: labelMap(),
    };
    const featureChange = (change) =>
      this.changeSection((section) => {
        section.feature ||= clone(feature);
        change(section.feature);
      });
    const heading = (text) =>
      h(ui.Typography, { component: "h2", variant: "heading", children: text }, text);
    const choices = [["", t.noTarget], ...destinations];
    if (feature.target && !candidates.some((n) => n.id === feature.target))
      choices.push([
        feature.target,
        feature.label[lang] || feature.heading[lang] || feature.target,
      ]);
    return h("section", {
      className: "navigationPresentation",
      children: [
        heading(t.discover),
        this.check(t.discoverShow, settings.discover.visible, (value) =>
          this.changeSection((section) => {
            section.discover.visible = value;
          }),
        ),
        this.field(t.discoverLabel, settings.discover.labels[lang], (value) =>
          this.changeSection((section) => {
            section.discover.labels[lang] = value;
          }),
        ),
        this.select(
          `${t.discover} · ${t.destination}`,
          settings.discover.target || "",
          [["", t.defaultDestination], ...destinations],
          (value) =>
            this.changeSection((section) => {
              if (value) section.discover.target = value;
              else delete section.discover.target;
            }),
        ),
        heading(t.feature),
        h(ui.Typography, { component: "p", variant: "caption", children: t.legacyFeature }, "help"),
        this.check(t.featureShow, feature.visible, (value) =>
          featureChange((f) => {
            f.visible = value;
          }),
        ),
        this.select(`${t.feature} · ${t.destination}`, feature.target || "", choices, (value) =>
          featureChange((f) => {
            if (value) f.target = value;
            else delete f.target;
          }),
        ),
        ...[
          ["eyebrow", t.eyebrow],
          ["heading", t.heading],
          ["text", t.text],
          ["label", t.buttonLabel],
        ].map(([key, label]) =>
          this.field(
            label,
            feature[key][lang],
            (value) =>
              featureChange((f) => {
                f[key][lang] = value;
              }),
            { multiline: key === "text" },
          ),
        ),
      ],
    });
  }
  render() {
    const ui = window.jahia.moonstone,
      t = this.text(),
      state = this.state;
    const disabled = state.busy || state.contextChanged;
    const action = (label, onClick, isDisabled, variant = "default") =>
      h(ui.Button, { label, isDisabled, variant, onClick }, label);
    const header = h(ui.Header, {
      title: t.title,
      mainActions: [
        action(t.reload, () => this.reload(), state.busy),
        action(
          state.showPreview ? t.previewHide : t.preview,
          () => {
            this.setState({
              showPreview: !state.showPreview,
              previewReady: false,
              previewError: "",
            });
            this.preloadPreviewImages();
          },
          disabled,
        ),
        action(t.save, () => this.action("save"), disabled || !state.dirty, "default"),
        action(
          t.publish,
          () => this.action("publish"),
          disabled || state.dirty || !state.snapshot?.exists,
          "default",
        ),
      ],
      status: h(ui.Typography, {
        component: "span",
        variant: "caption",
        children: state.dirty ? t.dirty : state.snapshot?.site || "",
      }),
    });
    let content = state.error
      ? h(ui.Typography, { component: "p", variant: "body", role: "alert", children: state.error })
      : null;
    if (!state.settings || !state.snapshot)
      content = h("div", {
        className: "navigationContent",
        children: [content, state.busy ? h(ui.Loader, { size: "big" }, "loader") : null],
      });
    else {
      const source = state.snapshot.sections.find((section) => section.id === state.selected);
      const settings = state.settings.sections[state.selected];
      const tabs = [
        ["upper", t.upperTitle],
        ["structure", t.structure],
        ["presentation", t.presentation],
      ];
      const tabBar = h(ui.Tab, {
        "aria-label": t.navsettings,
        "children": tabs.map(([key, label]) =>
          h(
            ui.TabItem,
            {
              label,
              "isSelected": state.tab === key,
              "onClick": () => this.setState({ tab: key }),
              "aria-controls": "navigation-settings-panel",
              "id": `navigation-tab-${key}`,
            },
            key,
          ),
        ),
      });
      let panel;
      if (state.tab === "upper") panel = renderUpperBar(this);
      else if (!source) panel = h(ui.Typography, { component: "p", children: t.empty });
      else
        panel =
          state.tab === "structure"
            ? h("section", {
                children: [
                  h(
                    window.jahia.moonstone.Button,
                    {
                      "label": t.customizeSection,
                      "variant": "outlined",
                      "aria-expanded": state.editingItemId === source.id,
                      "isDisabled": disabled,
                      "onClick": () => this.openIconEditor(source.id),
                    },
                    "root-editor",
                  ),
                  this.renderItemEditor(source, settings),
                  this.renderStructure(source, settings),
                  state.structureView === "tree" && state.editingItemId !== source.id
                    ? this.renderItemEditor(
                        walk([source]).find((node) => node.id === state.editingItemId),
                        settings,
                      )
                    : null,
                ],
              })
            : this.renderPresentation(source, settings);
      content = h("div", {
        className: "navigationWorkspace",
        children: [
          h(
            "div",
            {
              className: "navigationContext",
              children: [
                state.tab !== "upper"
                  ? this.select(
                      t.section,
                      state.selected || "",
                      state.snapshot.sections.map((section) => [
                        section.id,
                        sourceLabel(section, state.contentLanguage),
                      ]),
                      (value) =>
                        this.setState({
                          selected: value,
                          columnFilter: "all",
                          iconItemId: undefined,
                        }),
                    )
                  : null,
                this.select(
                  t.language,
                  state.contentLanguage,
                  [
                    ["fr", "Français"],
                    ["en", "English"],
                  ],
                  (value) => this.setState({ contentLanguage: value }),
                ),
              ],
            },
            "context",
          ),
          tabBar,
          h(
            "div",
            {
              className: "navigationContent",
              children: [
                content,
                h(
                  "div",
                  {
                    "className": "navigationEditorLayout",
                    "data-preview":
                      state.showPreview && state.settings.mode === "automatic" ? "true" : undefined,
                    "children": [
                      h(
                        "div",
                        {
                          className: "navigationSettingsPane",
                          children: [
                            state.status
                              ? h(
                                  "p",
                                  {
                                    "role": "status",
                                    "aria-live": "polite",
                                    "children": state.status,
                                  },
                                  "status",
                                )
                              : null,
                            h(
                              "div",
                              {
                                "id": "navigation-settings-panel",
                                "role": "tabpanel",
                                "aria-labelledby": `navigation-tab-${state.tab}`,
                                "children": panel,
                              },
                              "panel",
                            ),
                          ],
                        },
                        "settings",
                      ),
                      this.renderPreview(),
                    ],
                  },
                  "editor-layout",
                ),
              ],
            },
            "content",
          ),
        ],
      });
    }
    return h(ui.LayoutModule, {
      content: h("div", { className: "jahiacomNavigationManager", children: [header, content] }),
    });
  }
}
NavigationManager.prototype.isReactComponent = {};
