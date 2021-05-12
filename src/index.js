
const https = require("https")
var player = require('play-sound')(opts = {})

const secondesIntervalPulling = 3

const visitMotifID1 = 6970
const visitMotifID2 = 7005
const specialityID = 5494

const hostName = 'www.doctolib.fr'
let isMusicPlaying = false

const centerIDs = [
  6684432,
  6907348,
  6676117,
  6939680,
  6941592,
  6939401,
  6932232,
  6938314,
  6951024,
  6681518,
  6907464,
  6938318,
  6965253,
  6937640,
  6937641,
  6940861,
  6675682,
  6939732,
  6944443,
  6938244,
  6939336,
  6795655,
  6938316,
  346417,
  347824,
  300598,
  347339,
  299946,
  333070,
  346723,
  346295,
  346295,
  2731,
  316126,
  342359,
  297441,
  347233,
  313456,
  120858,
  109359,
  287549,
  296572,
  553859,
]


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

    console.log("url", url)
    console.log("availabilities", json.availabilities)
    console.log(`Appointment available on : https://${hostName}/${json.search_result.link}`)
  }
}

async function requestAvailability(centerID) {
  const options = {
    hostname: hostName,
    path: `/search_results/${centerID}.json?ref_visit_motive_ids%5B%5D=${visitMotifID1}&ref_visit_motive_ids%5B%5D=${visitMotifID2}&speciality_id=${specialityID}&search_result_format=json&force_max_limit=2`,
    method: 'GET'
  }

  let url = `https://${options.hostname + options.path}`
  const req = https.request(options, res => {
    if (res.statusCode != 200) {
      console.error(`Invalid code error on url ${url}`)
    }
    let buf = ""
    res.on('data', d => {
      // check availability
      buf += d
    })

    res.on('end', () => {
      checkAvailability(buf, url)
    })
  })

  req.on('error', error => {
    console.error(error)
  })

  req.end()

}

async function startPulling() {
  // Avoid duplicate centerIDs
  while (true) {
    await intervals(secondesIntervalPulling)
    centerIDs.forEach(async (centerID) => {
      await requestAvailability(centerID)
    });
    console.log("Nothing found ... Let's go again")
  }
}

startPulling()

