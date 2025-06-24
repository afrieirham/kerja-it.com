import axios from "axios";
import * as dateFns from "date-fns";
import qs from "query-string";

import { location, job_title } from "./constant";
import { GoogleAPIResult } from "./types";

const fake = [1]; // config: use empty array to skip fetching real data

const runner = async () => {
  console.log("starting cron");
  const { format, sub } = dateFns;
  // start construct google query
  const time = `after:${format(sub(new Date(), { days: 1 }), "yyyy-MM-dd")}`;
  const terms = job_title.map((job) => `"${job}"`).join(" | ");
  const locations = location.map((location) => `"${location}"`).join(" | ");
  const query = `${time} (${locations}) (${terms})`;
  // end construct google query

  // start fetching jobs
  const cx = process.env.GOOGLE_SEARCH_CX;
  const key = process.env.GOOGLE_SEARCH_KEY;
  const apiUrl = "https://www.googleapis.com/customsearch/v1";

  let links: Array<{
    title: string;
    description: string;
    url: string;
    source: string;
  }> = [];
  let start = 1;

  while (fake.length !== 0) {
    const requestUrl = qs.stringifyUrl({
      url: apiUrl,
      query: { start, cx, key, q: query },
    });

    const { data } = await axios.get(requestUrl);
    const results = data as GoogleAPIResult;

    // early break if no results
    if (!results.items) {
      console.log("no jobs found");
      break;
    }

    // add results if exist
    if (results.items.length > 0) {
      console.log("pushing jobs to array");
      links.push(
        ...results.items.map((item) => ({
          title:
            item.pagemap.metatags[0].title ||
            item.pagemap.metatags[0]["og:title"] ||
            item.pagemap.metatags[0]["twitter:title"] ||
            item.title,
          description:
            item.pagemap.metatags[0]["og:description"] ||
            item.pagemap.metatags[0]["twitter:description"] ||
            item.snippet,
          url: item.link,
          source: item.displayLink,
        }))
      );
    }

    // stop if no next page
    if (!results.queries.nextPage) {
      console.log("no more jobs next page");
      break;
    }

    start += 10;

    // config: change start === 11 to fetch 1 round else start > 91
    if (start > 91) {
      break;
    }
  }

  if (links.length === 0) {
    console.log("no jobs found");
    return;
  }
  // end fetching jobs

  // start saving jobs
  console.log("sending jobs to db");
  const res = await fetch(`${process.env.BASE_API_URL}/cron/insert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: process.env.CRON_API_KEY,
      input: links.map((link) => ({
        ...link,
        title: link.title
          .replaceAll(" di ", " | ")
          .replaceAll("sedang mencari pekerja untuk jawatan", "|"),
        description: link.description
          .replaceAll("Lihat ini dan pekerjaan yang serupa di LinkedIn.", "")
          .replaceAll(
            /^Dipaparkan\s+\d{1,2}:\d{2}:\d{2}\s+(?:PG|PTG)\.\s*/g,
            ""
          ),
      })),
    }),
  });
  console.log("sucessfully save jobs in db");
  console.log(JSON.stringify(await res.json()));
  // end saving jobs
};

runner();
