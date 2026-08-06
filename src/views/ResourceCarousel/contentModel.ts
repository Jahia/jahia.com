export const RESOURCE_MODEL = {
  nodeType: "jahiacom:blogEntry",
  properties: {
    title: "jcr:title",
    descriptions: ["summary", "jcr:description"],
    date: "date",
    image: "image",
    clusters: "blogType",
  },
} as const;
