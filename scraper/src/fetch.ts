import axios from "axios";
import puppeteer from "puppeteer-core";
import qs from "query-string";

import { format, sub } from "date-fns";
import { JobPosting } from "schema-dts";

import { location, title } from "./constant";
import { GoogleAPIResult } from "./types";

const fake = [1]; // config: use empty array to skip fetching real data

const runner = async () => {
  // start construct google query
  const time = `after:${format(sub(new Date(), { days: 1 }), "yyyy-MM-dd")}`;
  const terms = title.map((job) => `"${job}"`).join(" | ");
  const locations = location.map((location) => `"${location}"`).join(" | ");
  const query = `${time} (${locations}) (${terms})`;
  // end construct google query

  // start fetching jobs
  const cx = process.env.GOOGLE_SEARCH_CX;
  const key = process.env.GOOGLE_SEARCH_KEY;
  const apiUrl = "https://www.googleapis.com/customsearch/v1";

  let links = [];
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

    // config: change start === 11 to fetch 1 round
    if (start > 91) {
      break;
    }
  }

  if (links.length === 0) {
    return;
  }
  // end fetching jobs

  const results = await Promise.allSettled(
    links.map(async (link) => scrapeJobPostingSchema(link))
  );

  console.log(results);
};

runner();

async function scrapeJobPostingSchema(url: string) {
  // Launch the browser
  const browser = await puppeteer.launch({ channel: "chrome" });
  const page = await browser.newPage();

  // Navigate to the page
  await page.goto(url, { waitUntil: "networkidle2" });

  // Extract the JobPosting schema
  const jobPosting = await page.evaluate(() => {
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );

    // Loop through each script tag and parse JSON-LD content
    for (let script of scripts) {
      const jsonContent = script.textContent;
      if (jsonContent) {
        try {
          const jsonData = JSON.parse(jsonContent);

          // Check if the schema is JobPosting
          if (jsonData["@type"] === "JobPosting") {
            return jsonData as JobPosting;
          }
        } catch (error) {
          console.error("Error parsing JSON-LD:", error);
        }
      }
    }

    return null; // Return null if no JobPosting schema is found
  });

  // Close the browser
  await browser.close();

  if (!jobPosting) {
    // console.log("No JobPosting schema found on this page.", url);
    return null;
  }
  // console.log("JobPosting schema found", url);

  const jobUrl = url;
  const jobTitle = jobPosting.title;
  const jobType = jobPosting.employmentType ?? "";

  const companyName = jobPosting.hiringOrganization?.name;
  const companyLogo = jobPosting.hiringOrganization?.logo ?? "";
  const companyUrl = jobPosting.hiringOrganization?.url ?? "";

  const description = jobPosting.description;
  const responsibilities = jobPosting.responsibilities;

  const postedAt = jobPosting.datePosted;
  const validUntil = jobPosting.validThrough ?? "";

  const baseSalary = jobPosting.baseSalary ?? "";
  const estimatedSalary = jobPosting.estimatedSalary ?? "";
  const salaryCurrency = jobPosting.salaryCurrency ?? "";

  const jobLocation =
    (jobPosting.jobLocation?.address?.stressAddress ||
      jobPosting.jobLocation?.address?.addressLocality ||
      jobPosting.jobLocation?.address?.addressRegion ||
      jobPosting.jobLocation?.address?.addressCountry) ??
    "";

  await axios.post("https://v2.kerja-it.com/api/cron/insert", {
    body: {
      apiKey: process.env.CRON_API_KEY,
      input: {
        url: jobUrl,
        title: jobTitle,
        companyName,
        location: jobLocation,
      },
    },
  });

  return {
    jobUrl,
    jobTitle,
    jobType,
    companyName,
    companyLogo,
    companyUrl,
    description,
    responsibilities,
    postedAt,
    validUntil,
    baseSalary,
    estimatedSalary,
    salaryCurrency,
    jobLocation,
  };
}
