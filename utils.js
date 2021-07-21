const fetch = require("node-fetch");
const scdl = require('soundcloud-downloader').default;



const spotifySongRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
const spotifyPlaylistRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})/;
const spotifyAlbumRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:album\/|\?uri=spotify:album:)((\w|-){22})/;
const youtubePlaylistRegex = /^.*(youtu.be\/|list=)([^#\&\?]*).*/;
const youtubeVideoRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
const vimeoRegex = /(http|https)?:\/\/(www\.|player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|video\/|)(\d+)(?:|\/\?)/;
const facebookRegex = /(https?:\/\/)(www\.|m\.)?(facebook|fb).com\/.*\/videos\/.*/;
const reverbnationRegex = /https:\/\/(www.)?reverbnation.com\/(.+)\/song\/(.+)/;
const attachmentRegex = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;



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
  if (youtubePlaylistRegex.test(query)) return 'youtube_playlist';
  if (youtubeVideoRegex.test(query)) return 'youtube_video';
  if (validateURL(query)) return 'media_link';

  return 'youtube_search';
}

/* Getter for anime info */
async function getAnimeInfo(malUsername) {
  if(!malUsername) {
    const res = await fetch("https://themes.moe/api/roulette");

    // If something failed with the api, then return null
    if(!res.ok) return null;

    return await res.json();
  }

  const page = await (async () => {
    const res = await fetch(`https://api.jikan.moe/v3/user/${malUsername}`);
    const json = await res.json();
    const totalEntries = json.anime_stats.total_entries;
    const pages = Math.ceil(totalEntries / 300);
    
    return (Math.floor(Math.random() * pages) + 1);
  })();

  const res = await fetch(`https://api.jikan.moe/v3/user/${malUsername}/animelist/all/${page}`);

  // If something failed with the api or username is invalid, then return null
  if(!res.ok) return null;

  const json = await res.json();

  const entries = json.anime;

  const filter = entries.filter(entry => {
    const watchStatus = parseInt(entry.watching_status);

    // Keep the entry if the watchStatus is completed or watching
    return (watchStatus === 1 || watchStatus === 2);
  })

  if(filter.length === 0) return null;

  const entry = filter[Math.floor(filter.length * Math.random())];

  const r = await fetch(`https://themes.moe/api/themes/${entry.mal_id}`);

  // If something failed with the api
  // ; Or if the api does not recognize the mal_id, then return null
  if(!r.ok) return null;

  // The object is returned in a single-sized list for some reason
  return (await r.json())[0];
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
  "getAnimeInfo": getAnimeInfo,
  "getQueryType": getQueryType,
  "stringSimilarity": stringSimilarity
}

