export const RESOURCE_MODEL = {
  nodeType: "jmix:mainResource",
  blogNodeType: "jahiacom:blogEntry",
  pageNodeType: "jnt:page",
  properties: {
    title: "jcr:title",
    descriptions: ["summary", "jcr:description", "description"],
    dates: ["date", "publicationDate", "jcr:created", "jcr:lastModified"],
    images: ["image", "openGraphImage", "thumbnail", "cover"],
    categories: "j:defaultCategory",
    clusters: "blogType",
    pageType: "pageType",
  },
  resourcePageTypes: {
    "whitepaper-page": "whitepaper",
    "webinar-page": "webinar",
    "case-study": "customerCase",
  },
} as const;
