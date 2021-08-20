const fetch = require("node-fetch");
const scdl = require('soundcloud-downloader').default;
const ytpl = require('ytpl');
const ytdl = require("ytdl-core");
const { port } = require("./config");



const spotifySongRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
const spotifyPlaylistRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})/;
const spotifyAlbumRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:album\/|\?uri=spotify:album:)((\w|-){22})/;



/* URL validator */
function validateURL(str) {
  let url;

  try {
    url = new URL(str);
  } catch (err) {
    return false;  
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

/* Getter for the query type */
function getQueryType(query) {
  if (scdl.isPlaylistURL(query)) return 'soundcloud_playlist';
  if (scdl.isValidUrl(query)) return 'soundcloud_track';
  if (spotifySongRegex.test(query)) return 'spotify_song';
  if (spotifyAlbumRegex.test(query)) return 'spotify_album';
  if (spotifyPlaylistRegex.test(query)) return 'spotify_playlist';
  if (ytpl.validateID(query)) return 'youtube_playlist';
  if (ytdl.validateURL(query)) return 'youtube_video';
  if (validateURL(query)) return 'media_link';

  return 'youtube_search';
}

/* Getter for random anime song */
async function getRandomAnimeSong(malUsername) {
  if(!malUsername) {
    const res = await fetch(`http://localhost:${port}/roulette`);


    return (await res.json()).song;
  }


  // Get all anime ids in db
  let animeList = (await (await fetch(`http://localhost:${port}/animelist`)).json()).animeList;
  animeList = animeList.map(obj => obj.MalId);


  const pages = await (async () => {
    const r = await fetch(`https://api.jikan.moe/v3/user/${malUsername}`);
    const j = await r.json();
    const totalEntries = j.anime_stats?.total_entries;

    // j.anime_stats could be undefined
    if(!totalEntries) return null;

    return Math.ceil(totalEntries / 300);
  })();

  if(!pages) return null;

  const nums = [];

  for(let i = 0; i < pages; i++) nums.push(i);

  while(nums.length > 0) {
    const rand = Math.floor(nums.length * Math.random());
    const num = nums.splice(rand, 1)[0];

    const res = await fetch(`https://api.jikan.moe/v3/user/${malUsername}/animelist/all/${num}`);
    const entries = (await res.json()).anime;

    // Get what anime is actually in the database
    const intersection = entries.filter(e => {
      return animeList.includes(e.mal_id.toString())
    });

    console.log(intersection.length)

    if(intersection.length === 0) continue;

    const entry = intersection[Math.floor(intersection.length * Math.random())];

    const songs = (await (await fetch(`http://localhost:${port}/database/${entry.mal_id}`)).json()).songs;

    return songs[Math.floor(songs.length * Math.random())];
  }
}

function stringSimilarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i === 0)
        costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}



module.exports = {
  getRandomAnimeSong,
  getQueryType,
  stringSimilarity
}

