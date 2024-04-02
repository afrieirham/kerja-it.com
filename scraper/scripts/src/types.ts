export interface GoogleAPIResult {
  kind: string;
  url: Url;
  queries: Queries;
  context: Context;
  searchInformation: SearchInformation;
  items?: Item[];
}

export interface Url {
  type: string;
  template: string;
}

export interface Queries {
  request: Request[];
  nextPage: NextPage[];
}

export interface Request {
  title: string;
  totalResults: string;
  searchTerms: string;
  count: number;
  startIndex: number;
  inputEncoding: string;
  outputEncoding: string;
  safe: string;
  cx: string;
}

export interface NextPage {
  title: string;
  totalResults: string;
  searchTerms: string;
  count: number;
  startIndex: number;
  inputEncoding: string;
  outputEncoding: string;
  safe: string;
  cx: string;
}

export interface Context {
  title: string;
}

export interface SearchInformation {
  searchTime: number;
  formattedSearchTime: string;
  totalResults: string;
  formattedTotalResults: string;
}

export interface Item {
  kind: string;
  title: string;
  htmlTitle: string;
  link: string;
  displayLink: string;
  snippet: string;
  htmlSnippet: string;
  cacheId: string;
  formattedUrl: string;
  htmlFormattedUrl: string;
  pagemap: Pagemap;
}

export interface Pagemap {
  metatags: Metatag[];
  cse_thumbnail?: CseThumbnail[];
  cse_image?: CseImage[];
}

export interface Metatag {
  "og:type"?: string;
  viewport: string;
  "og:title": string;
  "og:url"?: string;
  "og:image"?: string;
  "twitter:card"?: string;
  "twitter:title"?: string;
  handheldfriendly?: string;
  mobileoptimized?: string;
  "twitter:image"?: string;
  "theme-color"?: string;
  "msapplication-tileimage"?: string;
  version?: string;
  "og:description"?: string;
  domain?: string;
  subdomain?: string;
  job?: string;
  account?: string;
  "apple-mobile-web-app-title"?: string;
  "twitter:site"?: string;
  "apple-mobile-web-app-status-bar-style"?: string;
  "twitter:description"?: string;
  "apple-mobile-web-app-capable"?: string;
  ua?: string;
}

export interface CseThumbnail {
  src: string;
  width: string;
  height: string;
}

export interface CseImage {
  src: string;
}
