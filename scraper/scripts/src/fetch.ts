import axios from "axios";
import { load } from "cheerio";
import { format, sub } from "date-fns";
import qs from "query-string";

import { title } from "./constant";
import { GoogleAPIResult } from "./types";

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

  let links = [];
  let start = 1;

  while (true) {
    const requestUrl = qs.stringifyUrl({
      url: URL,
      query: { start, cx, key, q: query },
    });

    const { data } = await axios.get(requestUrl);
    const results = data as GoogleAPIResult;

    // early break if no results
    if (!results.items) {
      break;
    }

    // add results if exist
    if (results.items.length > 0) {
      links.push(...results.items.map(({ link }) => link));
    }

    // stop if no next page
    if (!results.queries.nextPage) {
      break;
    }

    start += 10;

    if (start > 91) {
      break;
    }
  }

  if (links.length === 0) {
    return;
  }
  // end fetching jobs

  // start get html from links
  const responses = await Promise.all(links.map((link) => fetch(link)));
  const success = responses.filter((res) => res.status < 400);
  const htmls = await Promise.all(success.map((res) => res.text()));
  // end get html from links

  // start extract json-ld from htmls
  const jobs = htmls
    .map((html) => {
      // get all ld+json
      const $ = load(html);
      let jobSchema = $("script[type='application/ld+json']").text();
      if (!jobSchema) {
        return false;
      }

      // start if there's multiple ld+json
      const split = jobSchema.split("}{");
      if (split.length > 1) {
        const fixed = split.map((item, i) =>
          i % 2 === 0 ? item + "}" : "{" + item
        );
        const formatted = fixed.map((i) => JSON.parse(i));
        const schema = formatted.find((item) => item["@type"] === "JobPosting");
        return schema;
      }
      // end if there's multiple ld+json

      const parsedSchema = JSON.parse(jobSchema);
      if (parsedSchema && parsedSchema["@type"] === "JobPosting") {
        return parsedSchema;
      }
      return false;
    })
    .filter(Boolean);
  // end extract json-ld from htmls
  console.log(jobs);
};

runner();
