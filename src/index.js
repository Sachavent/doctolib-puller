
const https = require("https")
var player = require('play-sound')(opts = {})
const prompt = require('prompt-sync')();

const secondesIntervalPulling = 2

const visitMotifID1 = 6970
const visitMotifID2 = 7005
const specialityID = 5494

const hostName = 'www.doctolib.fr'
let isMusicPlaying = false

function intervals(seconds) {
  return new Promise((resolve) => {
    setInterval(resolve, seconds * 1000)
  });
}

async function checkAvailability(body, url) {
  var json = JSON.parse(body)

  // Have availability
  if (json.availabilities.length > 0) {
    if (isMusicPlaying == false) {
      isMusicPlaying = true
      player.play('./src/audio/file_example_MP3_700KB.mp3', function (err) {
        if (err) throw err;
        console.log("Audio finished");
        isMusicPlaying = false
      })
    }

    console.log("url called to get availability", url)
    console.log("Slot availabled", JSON.stringify(json.availabilities))
    console.log(`Appointment available on : https://${hostName}/${json.search_result.link}`)
  }
}

async function request(host, path, method) {
  const options = {
    hostname: host,
    path: path,
    method: method
  }

  let url = `https://${options.hostname + options.path}`
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      if (res.statusCode != 200) {
        console.error(`Invalid code error on url ${url}`)
      }
      let buf = ""
      res.on('data', d => {
        buf += d
      })

      res.on('end', () => {
        return resolve(buf)
      })
    })

    req.on('error', error => {
      return reject(`Request failed '${error}' on url '${url}'`)
    })

    req.end()
  })
}

async function requestAvailabilityByCenterID(centerID) {
  let buf = []
  try {
    const path = `/search_results/${centerID}.json?ref_visit_motive_ids%5B%5D=${visitMotifID1}&ref_visit_motive_ids%5B%5D=${visitMotifID2}&speciality_id=${specialityID}&search_result_format=json&force_max_limit=2`
    buf = await request(hostName, path, 'GET')
    const url = `https://${hostName + path}`
    return checkAvailability(buf, url)
  } catch (err) {
    return
  }
}

async function getTotalOfPage(city) {
  let buf = []
  try {
    buf = await request(hostName, `/vaccination-covid-19/${city}?ref_visit_motive_ids%5B%5D=${visitMotifID1}&ref_visit_motive_ids%5B%5D=${visitMotifID2}`, 'GET')
    const regex = /search_results_total&quot;:\d+/;
    const found = buf.match(regex)
    if (found === null || found.length == 0) {
      console.error(`[get-total-page] Cannot find any result on '${url}'`)
      return
    }
    const splitArr = found[0].split(":")
    if (!Array.isArray(splitArr) && splitArr.length < 2) {
      console.log(`[get-total-page] Split str failed on '${found}' and url '${url}'`)
      return
    }
    return Math.ceil(splitArr[1] / 10)
  } catch (err) {
    return
  }
}

async function getCenterIDs(pageNumber, city) {
  let buf = []
  try {
    // Care: special case on first page ...
    // Increment to get the correct page number
    pageNumber++;
    let path = ""
    if (pageNumber == 1) {
      path = `/vaccination-covid-19/${city}?ref_visit_motive_ids%5B%5D=${visitMotifID1}&ref_visit_motive_ids%5B%5D=${visitMotifID2}`
    } else {
      path = `/vaccination-covid-19/${city}?page=${pageNumber}&ref_visit_motive_ids%5B%5D=${visitMotifID1}&ref_visit_motive_ids%5B%5D=${visitMotifID2}`
    }
    buf = await request(hostName, path, 'GET')
    const regex = /id="search-result-\d+/g
    const found = buf.match(regex)
    if (found === null || found.length == 0) {
      console.error(`[get-center-id] Cannot find any result on '${url}'`)
      return
    }
    let centerIDs = []
    found.forEach(element => {
      const splitArr = element.split("-")
      if (!Array.isArray(splitArr) && splitArr.length < 3) {
        console.log(`[get-center-id] Split str failed on '${element}' and url '${url}'`)
        return
      }
      centerIDs.push(splitArr[2])
    });
    return centerIDs
  } catch (err) {
    return
  }
}

async function startPulling() {
  const city = prompt('What is your city? (should be written like this : villeneuve-le-roi) ');
  while (true) {
    // Get number of page
    const pageTotal = await getTotalOfPage(city)
    if (pageTotal === null || typeof pageTotal !== "number") {
      console.error("Cannot get number of page")
    }

    // Get center ids to check
    var centerIDsArr = []
    for (let i= 0; i < pageTotal; i++) {
      const centerIDs = await getCenterIDs(i, city)
      centerIDsArr.push(...centerIDs)
    }

    centerIDsArr.forEach(async (centerID) => {
      await requestAvailabilityByCenterID(centerID)
    });
    console.log("Let's go again")
    await intervals(secondesIntervalPulling)
  }
}

startPulling()

