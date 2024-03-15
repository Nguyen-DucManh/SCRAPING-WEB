//Nguyễn Đức Mạnh
import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import fs from 'fs';
import pLimit from 'p-limit';

const fetchShelves = async (page) => {
  try {
    const url =  `https://fousel.com/vi/collection?page=${page}`;
    const browser = await puppeteer.launch(); 

    const page2 = await browser.newPage(); 

    await page2.goto(url, { 
      waitUntil: 'networkidle0', 
    }); 
   
    const html = await page2.content(); 
    const $ = cheerio.load(html);
    await browser.close(); 
    let contentValue = $('.container-xl.py-4');
    const shelves = [];
    contentValue.find("div.campain-list.row.mt-4").each((_idx, el) => {
      $(el).find('div.col-6.mb-3.col-lg-4').each((_idx, el) => {
        let campaign = $(el);
        let tmpHtml = cheerio.load(campaign.find('a.d-block.thumb').html());
        let title = tmpHtml('picture').attr('title');
        let image = tmpHtml('img').attr('src');
        let link = campaign.find('a.d-block.thumb').attr('href');         
        let price = campaign.find('span.main-price').text();
        let title_id =  link != undefined && link.split('?').length > 0 ? link.split('?')[0] : "NONE";
        let element = {
          "crawler": "Fousel",
          "domainName": "fousel.com",
          "title": title,
          "images": [
              {
                "url": image 
              }
            ],
          "title_id": title_id,
          "url": `https://fousel.com${title_id}`, // Concatenate 'link' variable
          "price": price
        }

        console.log(element);
        shelves.push(element);
      });
    });
    return shelves;
  } catch (error) {
    throw error;
  }
};
const fetchAllShelves = async () => {
  let promises = [];
  const limit = pLimit(5)

  for (let i = 1; i <= 29; i++) {
    promises.push(limit(async () => {
       return (await fetchShelves(i));
    }
    ));
  }

  let preResults = await Promise.all(promises);
  let results = []
  preResults.forEach(item => {
    results.push(...item.filter(it => results.findIndex(i => i.url === it.url) == -1))
  })
  return results;
};

(async () => {
  try {
    const shelves = await fetchAllShelves();
    const jsonData = JSON.stringify(shelves, null, 2);
    fs.writeFile('shelve.json', jsonData, (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    });
  } catch (error) {
    console.error("Error occurred:", error);
  }
})();
