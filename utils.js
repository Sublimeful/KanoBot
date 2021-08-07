const fetch = require("node-fetch");
const scdl = require('soundcloud-downloader').default;



const spotifySongRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
const spotifyPlaylistRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})/;
const spotifyAlbumRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:album\/|\?uri=spotify:album:)((\w|-){22})/;
const youtubePlaylistRegex = /^.*(youtu.be\/|list=)([^#\&\?]*)$/;
const youtubeVideoRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;



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

    // Return info pertaining to the anime
    return await (async () => {
      const r = await fetch(`https://api.jikan.moe/v3/anime/${(await res.json()).malID}`);

      // If something failed with the api
      // ; Or if the api does not recognize the mal_id, then return null
      if(!r.ok) {
        console.error(`Could not get animeInfo for anime ${(await res.json()).malID}`);
        return null;
      }

      // The json returned is the anime info
      return (await r.json());
    })();
  }



  const page = await (async () => {
    const r = await fetch(`https://api.jikan.moe/v3/user/${malUsername}`);
    const j = await r.json();
    const totalEntries = j.anime_stats?.total_entries;

    // j.anime_stats could be undefined
    if(!totalEntries) return null;

    const pages = Math.ceil(totalEntries / 300);
    
    return (Math.floor(Math.random() * pages) + 1);
  })();

  // Return null if page is null
  if(!page) return null;

  const res = await fetch(`https://api.jikan.moe/v3/user/${malUsername}/animelist/all/${page}`);

  // If something failed with the api or username is invalid, then return null
  if(!res.ok) {
    console.error(`Could not get a result for user ${malUsername} on page ${page}`);
    return null;
  }

  const json = await res.json();

  const entries = json.anime;

  const filter = entries.filter(entry => {
    // Keep the entry no matter what
    return true;

    // const watchStatus = parseInt(entry.watching_status);

    // Keep the entry if the watchStatus is completed or watching
    // return (watchStatus === 1 || watchStatus === 2);
  })

  // Return null if there is no anime in their completed/watching list
  if(filter.length === 0) {
    console.error(`No anime with watchStatus completed or watching for user ${malUsername} on page ${page}`);
    return null;
  }



  // Get random entry from their filtered list
  const entry = filter[Math.floor(filter.length * Math.random())];

  // Return info pertaining to the anime
  return await (async () => {
    const r = await fetch(`https://api.jikan.moe/v3/anime/${entry.mal_id}`);

    // If something failed with the api
    // ; Or if the api does not recognize the mal_id, then return null
    if(!r.ok) {
      console.error(`Could not fetch animeInfo for anime ${entry.mal_id}`);
      return null;
    }

    // The json returned is the anime info
    return (await r.json());
  })();
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

