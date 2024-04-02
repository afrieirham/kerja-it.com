import axios from "axios";
import qs from "query-string";
import { format, sub } from "date-fns";

import { title } from "./constant";
import { GoogleAPIResult, Item } from "./types";

const runner = async () => {
  // start construct google query
  const time = `after:${format(sub(new Date(), { days: 1 }), "yyyy-MM-dd")}`;
  const terms = title.map((job) => `"${job}"`).join(" | ");
  const query = `${time} ${terms}`;
  // end construct google query

  // start fetching jobs
  const cx = process.env.GOOGLE_SEARCH_CX;
  const key = process.env.GOOGLE_SEARCH_KEY;
  const URL = "https://www.googleapis.com/customsearch/v1";

  let allResults: Item[] = [];
  let start = 1;

  while (true) {
    const requestUrl = qs.stringifyUrl({
      url: URL,
      query: { start, cx, key, q: query },
    });

    console.log(requestUrl);

    const { data } = await axios.get(requestUrl);
    const results = data as GoogleAPIResult;

    // early break if no results
    if (!results.items) {
      break;
    }

    // add results if exist
    if (results.items.length > 0) {
      allResults.push(...results.items);
    }

    // stop if no next page
    if (!results.queries.nextPage) {
      break;
    }
  }
  // end fetching jobs
  console.log(allResults);
};

runner();
