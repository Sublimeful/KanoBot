const fetch = require("node-fetch")

const { validateURL: SoundcloudValidateURL } = require('soundcloud-scraper');
const YouTube = require('youtube-sr').default;



const spotifySongRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-){22})/;
const spotifyPlaylistRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})/;
const spotifyAlbumRegex = /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:album\/|\?uri=spotify:album:)((\w|-){22})/;
const vimeoRegex = /(http|https)?:\/\/(www\.|player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|video\/|)(\d+)(?:|\/\?)/;
const facebookRegex = /(https?:\/\/)(www\.|m\.)?(facebook|fb).com\/.*\/videos\/.*/;
const reverbnationRegex = /https:\/\/(www.)?reverbnation.com\/(.+)\/song\/(.+)/;



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
  if (SoundcloudValidateURL(query, 'track')) return 'soundcloud_track';
  if (SoundcloudValidateURL(query, 'playlist') || query.includes('/sets/')) return 'soundcloud_playlist';
  if (spotifySongRegex.test(query)) return 'spotify_song';
  if (spotifyAlbumRegex.test(query)) return 'spotify_album';
  if (spotifyPlaylistRegex.test(query)) return 'spotify_playlist';
  if (YouTube.validate(query, 'PLAYLIST')) return 'youtube_playlist';
  if (YouTube.validate(query, 'VIDEO')) return 'youtube_video';
  if (vimeoRegex.test(query)) return 'vimeo';
  if (facebookRegex.test(query)) return 'facebook';
  if (reverbnationRegex.test(query)) return 'reverbnation';
  if (validateURL(query)) return 'attachment';

  return 'youtube_search';
}

/* Getter for anime info */
async function getAnimeInfo(malUsername) {
  if(malUsername == null) {
    const res = await fetch("https://themes.moe/api/roulette");

    // If something failed with the api, then return null
    if(!res.ok) return null;

    return await res.json();
  }

  const res = await fetch(`https://api.jikan.moe/v3/user/${malUsername}/animelist`);

  // If something failed with the api or username is invalid, then return null
  if(!res.ok) return null;

  const json = await res.json();

  const entries = json.anime;

  const filter = entries.filter(entry => {
    const watchStatus = parseInt(entry.watching_status);

    // Keep the entry if the watchStatus is completed or watching
    return (watchStatus == 1 || watchStatus == 2);
  })

  if(filter.length == 0) return null;

  const entry = filter[Math.floor(filter.length * Math.random())];

  const r = await fetch(`https://themes.moe/api/themes/${entry.mal_id}`);

  // If something failed with the api
  // ; Or if the api does not recognize the mal_id, then return null
  if(!r.ok) return null;

  // The object is returned in a single-sized list for some reason
  return (await r.json())[0];
}



module.exports = {
  "getAnimeInfo": getAnimeInfo,
  "getQueryType": getQueryType
}
