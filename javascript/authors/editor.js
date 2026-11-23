const jahia = window.jahia;
const element = (type, props = {}, key = null) => ({
  $$typeof: Symbol.for("react.element"),
  type,
  key,
  ref: null,
  props,
  _owner: null,
  _store: {},
});

export function AuthorTopicSuggestions(props) {
  this.props = props;
  this.state = { status: "loading", items: [], options: [], labels: [] };
}
AuthorTopicSuggestions.prototype.isReactComponent = {};
AuthorTopicSuggestions.prototype.update = function (state) {
  if (this.active) this.updater.enqueueSetState(this, state, null, "setState");
};
AuthorTopicSuggestions.prototype.componentDidMount = function () {
  this.active = true;
  if (!document.getElementById("jahiacomAuthorTagStyles")) {
    const stylesheet = document.createElement("link");
    stylesheet.id = "jahiacomAuthorTagStyles";
    stylesheet.rel = "stylesheet";
    stylesheet.href =
      (window.contextJsParameters.contextPath || "") +
      "/modules/jahiacom/javascript/authors/editor.css?v=1";
    document.head.appendChild(stylesheet);
  }
  this.load();
};
AuthorTopicSuggestions.prototype.componentDidUpdate = function (previous) {
  if (
    previous.editorContext?.nodeData?.uuid !== this.props.editorContext?.nodeData?.uuid ||
    previous.editorContext?.lang !== this.props.editorContext?.lang
  )
    this.load();
};
AuthorTopicSuggestions.prototype.componentWillUnmount = function () {
  this.active = false;
  this.controller?.abort();
};
AuthorTopicSuggestions.prototype.load = async function () {
  this.controller?.abort();
  const context = this.props.editorContext || {};
  const path = context.nodeData?.path;
  if (!path || context.mode === "create") {
    this.update({ status: "new", items: [] });
    return;
  }
  if (
    !/^\/sites\/[^/]+\/contents\//.test(path) ||
    !/^[a-z]{2}(?:[_-][A-Za-z]{2})?$/.test(context.lang || "")
  ) {
    this.update({ status: "error", items: [] });
    return;
  }
  const controller = (this.controller = new AbortController());
  this.update({ status: "loading", items: [], options: [], labels: [] });
  try {
    const url =
      (window.contextJsParameters.contextPath || "") +
      "/cms/render/default/" +
      encodeURIComponent(context.lang) +
      path.split("/").map(encodeURIComponent).join("/") +
      ".html";
    const response = await fetch(url, { credentials: "same-origin", signal: controller.signal });
    if (!response.ok) throw Error("Author suggestions unavailable");
    const document = new DOMParser().parseFromString(await response.text(), "text/html");
    const data = document.querySelector("[data-author-topic-suggestions]");
    if (!data) throw Error("Missing author suggestions");
    const items = JSON.parse(data.getAttribute("data-author-topic-suggestions"));
    if (!Array.isArray(items)) throw Error("Invalid suggestions");
    const labels = JSON.parse(data.getAttribute("data-author-topic-selection") || "[]");
    const blogUrl = new URL(data.getAttribute("data-author-blog-url") || "", window.location.href);
    if (!data.getAttribute("data-author-blog-url") || blogUrl.origin !== window.location.origin)
      throw Error("Invalid blog URL");
    const blogResponse = await fetch(blogUrl.href, {
      credentials: "same-origin",
      signal: controller.signal,
    });
    if (!blogResponse.ok) throw Error("Blog filters unavailable");
    const blogDocument = new DOMParser().parseFromString(await blogResponse.text(), "text/html");
    const options = [
      ...new Map(
        [
          ...blogDocument.querySelectorAll(
            'select[name="filter1"] option, select[name="filter2"] option',
          ),
        ]
          .filter((option) => /^[0-9a-f-]{36}$/i.test(option.value))
          .map((option) => [option.value, { id: option.value, label: option.textContent.trim() }]),
      ).values(),
    ].sort((a, b) => a.label.localeCompare(b.label));
    const allowed = new Set(options.map((option) => option.id));
    if (controller.signal.aborted) return;
    this.update({
      status: "ready",
      options,
      labels: Array.isArray(labels) ? labels : [],
      items: items
        .filter(
          (item) =>
            allowed.has(item.id) &&
            typeof item.id === "string" &&
            typeof item.label === "string" &&
            Number.isSafeInteger(item.count) &&
            item.count > 0,
        )
        .slice(0, 5),
    });
  } catch {
    if (!controller.signal.aborted) this.update({ status: "error", items: [] });
  }
};
AuthorTopicSuggestions.prototype.render = function () {
  const props = this.props;
  const language = props.editorContext?.uilang || jahia.reduxStore?.getState().uilang || "en";
  const fr = String(language).startsWith("fr");
  const value = Array.isArray(props.value) ? props.value : [];
  const disabled = Boolean(props.field?.readOnly || props.readOnly || props.disabled);
  const change = (next) => {
    if (disabled) return;
    props.onChange(next);
    if (props.onBlur) props.onBlur();
  };
  const options = this.state.options || [];
  const allowed = new Set(options.map((option) => option.id));
  const items = this.state.items.filter((item) => !value.includes(item.id));
  const status = this.state.status;
  return element("div", {
    className: "authorTagEditor",
    children: [
      element(
        "div",
        {
          className: "authorTagList",
          children: value.map((id) => {
            const selected =
              options.find((item) => item.id === id) ||
              (this.state.labels || []).find((item) => item.id === id);
            const label = selected?.label || (fr ? "Tag enregistré" : "Saved tag");
            return element(
              "span",
              {
                className: "authorTag",
                children: [
                  element("span", {
                    children:
                      label +
                      (this.state.status === "ready" && !allowed.has(id)
                        ? fr
                          ? " (hors filtres du blog)"
                          : " (outside blog filters)"
                        : ""),
                  }),
                  element("button", {
                    "type": "button",
                    disabled,
                    "className": "authorTagRemove",
                    "aria-label": (fr ? "Retirer " : "Remove ") + label,
                    "onClick": () => change(value.filter((item) => item !== id)),
                    "children": "×",
                  }),
                ],
              },
              id,
            );
          }),
        },
        "selected",
      ),
      element(
        "select",
        {
          "aria-label": fr ? "Ajouter un tag du blog" : "Add a blog tag",
          "value": "",
          "disabled": disabled || this.state.status !== "ready",
          "className": "authorTagSelect",
          "onChange": (event) => {
            const id = event.target.value;
            if (!allowed.has(id) || value.includes(id)) return;
            change(value.concat(id));
          },
          "children": [
            element(
              "option",
              {
                value: "",
                children: fr ? "Choisir un tag des filtres du blog" : "Choose a blog filter tag",
              },
              "empty",
            ),
            ...options
              .filter((option) => !value.includes(option.id))
              .map((option) =>
                element("option", { value: option.id, children: option.label }, option.id),
              ),
          ],
        },
        "blog-tags",
      ),
      element(
        "div",
        {
          className: "authorTagAssistant",
          children: [
            element(
              jahia.moonstone.Typography,
              {
                variant: "subheading",
                children: fr
                  ? "Suggestions d’après ses blogs publiés"
                  : "Suggestions from published blog posts",
              },
              "title",
            ),
            element(
              jahia.moonstone.Typography,
              {
                variant: "caption",
                role: "status",
                children:
                  status === "loading"
                    ? fr
                      ? "Chargement des sujets…"
                      : "Loading topics…"
                    : status === "error"
                      ? fr
                        ? "Filtres du blog indisponibles. Rouvrez la fiche pour réessayer."
                        : "Blog filters unavailable. Reopen the author to retry."
                      : status === "new"
                        ? fr
                          ? "Enregistrez la fiche pour rechercher ses publications."
                          : "Save the author to look up publications."
                        : items.length
                          ? fr
                            ? "Ajouter un sujet à la sélection :"
                            : "Add a topic to the selection:"
                          : fr
                            ? "Aucune suggestion supplémentaire."
                            : "No additional suggestions.",
              },
              "status",
            ),
            element(
              "div",
              {
                className: "authorTagSuggestionList",
                children: items.map((item) =>
                  element(
                    jahia.moonstone.Button,
                    {
                      label:
                        (fr ? "Ajouter " : "Add ") +
                        item.label +
                        " · " +
                        item.count +
                        " " +
                        (item.count === 1 ? "article" : "articles"),
                      variant: "outlined",
                      isDisabled: disabled,
                      onClick: () => {
                        if (disabled || !allowed.has(item.id)) return;
                        change([...new Set(value.concat(item.id))]);
                      },
                    },
                    item.id,
                  ),
                ),
              },
              "suggestions",
            ),
          ],
        },
        "assistant",
      ),
    ],
  });
};
