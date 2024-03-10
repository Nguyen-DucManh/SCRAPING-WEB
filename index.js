const axios = require("axios");
const cheerio = require("cheerio");

// Hàm sleep
const sleep = (milliseconds) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const fetchShelves = async () => {
  let header = {
    'User-Agent':
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
  };

  try {
    const url = 'https://www.amazon.com/s?i=fashion&rh=n%3A7141123011%2Cp_28%3AHello&dc&page=2&hidden-keywords=%22Lightweight%2C+Classic+fit%2C+Double-needle+sleeve+and+bottom+hem%22-tanktop+-raglan+-vneck+-longsleeve&qid=1709821626&refresh=1&ref=sr_pg_2';
    const response = await axios.get(url, { headers: header });
    await sleep(2000); // Wait for 2 seconds
    const html = response.data;

    const $ = cheerio.load(html);

    const links = [];
    $('li.a-spacing-micro.s-navigation-indent-2').each((index, element) => {
      const link = $(element).find('a.a-link-normal.s-navigation-item').attr('href');
      links.push(link);
    });

    const shelves = [];

    for (let i = 0; i < links.length; i++) {
      const url = `https://www.amazon.com${links[i]}`;
      const response = await axios.get(url, { headers: header });
      await sleep(2000); // Wait for 2 seconds
      const html = response.data;

      const $ = cheerio.load(html);

      $('div.sg-col-4-of-12.s-result-item.s-asin.sg-col-4-of-16.sg-col.sg-col-4-of-20').each(
        (_idx, el) => {
          const shelf = $(el);
          const title = shelf.find('span.a-size-base-plus.a-color-base.a-text-normal').text();
          const image = shelf.find('img.s-image').attr('src');
          const link = shelf.find('a.a-link-normal.a-text-normal').attr('href');
          const parts = image.split("/");
          const code = parts[5].split(".")[0];

          let element = {
            "crawler": "Amazon",
            "domainName": "amazon.com",
            "id": link.split('/')[3],
            "images": [
              {
                "id": `amz_${code}`,
                "url": image
              }
            ],
            "siteProductId": link.split('/')[3],
            "title": title,
            "url": `https://amazon.com/dp/${link.split('/')[3]}`
          }

          shelves.push(element);
        }
      );
    }

    return shelves;
  } catch (error) {
    throw error;
  }
};

(async () => {
  try {
    const shelves = await fetchShelves();
    console.log(JSON.stringify(shelves, null, 2));
  } catch (error) {
    console.error("Error occurred:", error);
  }
})();