import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import pLimit from 'p-limit';

function extractScriptContent($) {
  const scriptElement = $('script').filter((i, script) => {
    return $(script).text().includes('window.__NUXT_');
  }).first();

  if (scriptElement.length > 0) {
    return scriptElement.text();
  } else {
    throw new Error('No script element containing the desired string found');
  }
}

async function extractImageUrls(scriptContent) {
  const imageUrlRegex = /thumb_url:\"(.*?)\.(?:jpeg|jpg)\"/g;

  const imageUrls = [];
  scriptContent.match(imageUrlRegex)?.forEach((url) => {
    imageUrls.push(
      url
        .replace(/\\u002F/g, '/') 
        .replace(/thumb_url:"/, '')
        .replace(/^\//, '') 
        .replace(/\"/, '')
    );
  });

  return imageUrls;
}

const fetchShelves = async (page) => {
  try {
    const url =  `https://fousel.com/vi/collection?page=${page}`;
    const header = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36' };

    const response = await axios.get(url, { headers: header });
    const html = response.data;
    const $ = cheerio.load(html);
    let contentValue = $('.container-xl.py-4');
    const shelves = [];
    let imageUrls = await extractImageUrls(extractScriptContent($));
    contentValue.find("div.campain-list.row.mt-4").each((_idx, el) => {
      $(el).find('div.col-6.mb-3.col-lg-4').each(async (_idx, el) => {
        let campaign = $(el);
        let tmpHtml = cheerio.load(campaign.find('a.d-block.thumb').html());
        let title = tmpHtml('div').attr('title');
        let link = campaign.find('a.d-block.thumb').attr('href');         
        let price = campaign.find('span.main-price').text();
        let title_id =  link != undefined && link.split('?').length > 0 ? link.split('/').pop().split('?')[0] : "NONE";
        let imageUrl = imageUrls[_idx].includes('jpeg') ? `https://images.fousel.com/rx/600x750,c_1,q_90,ofmt_webp/s2/${imageUrls[_idx]}` : `https://images.fousel.com/rx/600x750,c_1,q_90,ofmt_webp/${imageUrls[_idx]}`;
        let element = {
          "crawler": "Fousel",
          "domainName": "fousel.com",
          "title": title,
          "images": imageUrl, 
          "title_id": title_id,
          "url": `https://fousel.com/${title_id}`,
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

  for (let i = 1; i <= 33; i++) {
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

    // Write to oke.json
    fs.writeFile('oke.json', jsonData, (err) => {
      if (err) {
        console.error("Error occurred:", err);
      } else {
        console.log('The file has been saved!');
      }
    });
  } catch (error) {
    console.error("Error occurred:", error);
  }
})();
