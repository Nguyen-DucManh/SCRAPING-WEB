import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import pLimit from 'p-limit';
import axiosRetry from 'axios-retry';
import XLSX from 'xlsx';



async function extractImageUrlsFromPage(url, title_id) {
  try {
    const header = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36' };
    const specialTitleIds = ["image0-1", "image1-1", "image2-1", "image3-1", "custom-rap-tee"];
    if (title_id ==="as-cheek-3-toes-detroit-tshirt-sweatshirt-hoodie") {
      const specificUrl = `https://fousel.com/vi/${title_id}?product=unisex-standard-t-shirt`;
      const response = await axios.get(specificUrl, { headers: header });
      
      const data = response.data;
      const regex = /default[^ ]+.jpg/g;
      let matches = data.match(regex);
      if (!matches) {
        console.log('Không tìm thấy kết quả khớp');
        return;
      }

      matches = matches.map(match => {
        let replacedStr = match.replace(/\\u002F/g, "/");

        replacedStr = replacedStr.replace("default", "");

        replacedStr = replacedStr.replace(`",\"${title_id}\",\"/`, "");

        return "https://images.fousel.com/rx/1000x1250,q_90,ofmt_webp/" + replacedStr;
      });

      matches.push("https://images.fousel.com/rx/1000x1250,q_90,ofmt_webp/s4/l_p:3105952:c72817bfd6e66a44/co_rgb:181818,e_colorize:100/fl_layer_apply/l_p:3105952:8db84b_sh/fl_layer_apply/c_thumb,w_1280/f_jpg/v1/p/3105952/de5846e5b6114138/t/95eeb35a619bb1c8.jpg");
      return matches;
    }
    else if (specialTitleIds.includes(title_id)) {
      const specificUrl = `https://fousel.com/vi/${title_id}?product=unisex-premium-t-shirt`;
      const response = await axios.get(specificUrl, { headers: header });
      
      const data = response.data;
      const regex = new RegExp(`default[^ ]+.jpg`, 'g');
      let matches = data.match(regex);
      if (!matches) {
        console.log('Không tìm thấy kết quả khớp');
        return;
      }

      matches = matches.map(match => {
        let replacedStr = match.replace(/\\u002F/g, "/");
        replacedStr = replacedStr.replace("default", "");

        replacedStr = replacedStr.replace(`",\"${title_id}\",\"/`, "");

        return "https://images.fousel.com/rx/1000x1250,q_90,ofmt_webp/" + replacedStr;
      });

      matches.push("https://images.fousel.com/rx/1000x1250,q_90,ofmt_webp/s4/l_p:3108552:67e8aead42e64f18/co_rgb:181818,e_colorize:100/fl_layer_apply/l_p:3108552:9fb713_sh/fl_layer_apply/c_thumb,w_1280/f_jpg/v1/p/3108552/864b078d52ee7254/t/98725178c2348155.jpg");
      return matches;
    } else {
      const response = await axios.get(url, { headers: header });
      const data = response.data;
      const regex = /\,\"p\\u002F(.*?)\.jpeg/g;
      let matches = data.match(regex);
      matches = matches.map(match => "https://images.fousel.com/rx/p/s2/" + match.replace(/\,\"p\\u002F/g, 'p/').replace(/\\u002F/g, '/'));
      return matches;
    }
  } catch (error) {
    console.error("Error occurred in extractImageUrlsFromPage:", error);
  }
}


const fetchShelves = async (page) => {
  try {
    const url = `https://fousel.com/vi/collection?page=${page}`;
    const header = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36' };

    const response = await axios.get(url, { headers: header });
    const html = response.data;
    const $ = cheerio.load(html);
    let contentValue = $('.container-xl.py-4');
    const shelves = [];
    const productLimit = pLimit(30);
    let productPromises = [];
    contentValue.find("div.campain-list.row.mt-4").each((_idx, el) => {
      $(el).find('div.col-6.mb-3.col-lg-4').each((_idx, el) => {
        let campaign = $(el);
        let tmpHtml = cheerio.load(campaign.find('a.d-block.thumb').html());
        let title = tmpHtml('div').attr('title');
        let link = campaign.find('a.d-block.thumb').attr('href');
        let price = campaign.find('span.main-price').text();
        let title_id = link != undefined && link.split('?').length > 0 ? link.split('/').pop().split('?')[0] : "NONE";

        productPromises.push(productLimit(async () => {
          let images = await extractImageUrlsFromPage(`https://fousel.com/${title_id}`, title_id);

          let element = {
            "crawler": "Fousel",
            "domainName": "fousel.com",
            "title": title,
            "images": images.join('; '), 
            "title_id": title_id,
            "url": `https://fousel.com/${title_id}`,
            "price": price
          }

          console.log(element);
          shelves.push(element);
        }));
      });
    });
    await Promise.all(productPromises);
    return shelves;
  } catch (error) {
    console.error("Error occurred in fetchShelves:", error);
  }
};

const fetchAllShelves = async () => {
  let promises = [];
  const pageLimit = pLimit(3)

  for (let i = 1; i <= 25; i++) {
    promises.push(pageLimit(async () => {
       return (await fetchShelves(i));
    }
    ));
  }

  let preResults = await Promise.all(promises);
let results = []
preResults.forEach(item => {
  if (Array.isArray(item)) {
    results.push(...item.filter(it => results.findIndex(i => i.url === it.url) == -1))
  }
})

  return results;
};
(async () => {
  try {
    const shelves = await fetchAllShelves();
    
    let wb = XLSX.utils.book_new();

    let ws = XLSX.utils.json_to_sheet(shelves);

    XLSX.utils.book_append_sheet(wb, ws, "Shelves");

    XLSX.writeFile(wb, 'okay.xlsx');
  } catch (error) {
    console.error("Error occurred:", error);
  }
})();
