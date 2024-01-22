const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const zlib = require("zlib");
const ndjson = require("ndjson");

const headers = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8,hi;q=0.7",
};
function extractLastPrice(priceString) {
  const regex = /₹(\d{1,3}(?:,\d{3})*$)/;
  const match = regex.exec(priceString);
  return match ? `₹${match[1]}` : null;
}

const extractData = async (url) => {
  try {
    return axios
      .get(url, {
        headers: headers,
        responseType: "text",
        responseEncoding: "utf8",
      })
      .then((response) => {
        let laptopData = [];
        let $ = cheerio.load(response.data);
        $("div.a-section").each((index, element) => {
          let lappy = $(element);
          let Name = lappy.find("h2.a-size-mini.s-line-clamp-1").text();
          let TitleMatch = lappy
            .find("h2.a-size-mini.a-spacing-none.a-color-base.s-line-clamp-2")
            .text()
            .trim()
            .match(/^(.*?,)/i);
          let Title = TitleMatch ? TitleMatch[1] : "";
          let category = lappy.find("div#n-title span").text();
          let Description = lappy
            .find("h2.a-size-mini.a-spacing-none.a-color-base.s-line-clamp-2")
            .text()
            .trim();
          let MRP = lappy.find("span.a-offscreen").text();
          let Price = extractLastPrice(MRP);
          let sellingPrice = lappy.find("span.a-price-whole").text();
          let Discount = lappy
            .find("div.a-row.a-size-base.a-color-base span")
            .last()
            .text();
          let BrandName = lappy.find("h2.a-size-mini.s-line-clamp-1").text();
          let Image = lappy.find("img.s-image").attr("src");
          if (
            Name &&
            Title &&
            Description &&
            Price &&
            sellingPrice &&
            Discount &&
            BrandName &&
            category &&
            Image
          ) {
            let data = {
              Name,
              Title,
              Description,
              Price,
              sellingPrice,
              Discount,
              BrandName,
              category,
              Image,
            };
            laptopData.push(data);
          }
        });
        return laptopData;
      });
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

const saveDataToFile = (data, filePath) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};
const extractDataAll = async (first, last) => {
  let allLaptopData = [];
  for (let currentPage = first; currentPage <= last; currentPage++) {
    const pageUrl = `https://www.amazon.in/s?k=laptop&crid=1AQ9PSH4JKERK&sprefix=%2Caps%2C221&page=${currentPage}&ref=nb_sb_ss_recent_2_0_recent`;
    const pageData = await extractData(pageUrl);
    const filePath = `page_${currentPage}.json`;
    saveDataToFile(pageData, filePath);

    allLaptopData = allLaptopData.concat(pageData);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return allLaptopData;
};

(async () => {
  const startPage = 1;
  const endPage = 20;
  const allLaptopData = await extractDataAll(startPage, endPage);

  const filePath = `all_laptops.ndjson.gz`;
  const gzip = zlib.createGzip();
  const outputStream = fs.createWriteStream(filePath);
  for (const laptop of allLaptopData) {
    outputStream.write(JSON.stringify(laptop) + "\n");
  }
  outputStream.end();
})();
