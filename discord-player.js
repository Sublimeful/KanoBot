const EventEmitter = require('events');
const fetch = require("node-fetch")
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('ffprobe-static');
const ytdl = require("ytdl-core");
const yts = require("yt-search");
const ytpl = require('ytpl');
const spotify = require("spotify-url-info");
const scdl = require('soundcloud-downloader').default;

const { getAnimeInfo, getQueryType, stringSimilarity } = require("./utils");

ffmpeg.setFfprobePath(ffprobe.path);



class Player extends EventEmitter {
  constructor(client) {
    super();
    this.servers = {};
    this.client = client;
  }

  /* Getter for currentTrack */
  getCurrentTrack(message) {
    const server = this.getContract(message);

    return server.currentTrack;
  }

  /* Getter for server queue */
  getQueue(message) {
    const server = this.getContract(message);

    return server.queue;
  }

  /* Getter for MAL usernames */
  getMALUsernames(message) {
    const server = this.getContract(message);

    return server.amq.mal.usernames;
  }

  /* Getter for whether play is playing */
  getIsPlaying(message) {
    const server = this.getContract(message);

    return server.isPlaying;
  }

  /* Getter for current timestamp (ms) */
  getTimeStamp(message) {
    const server = this.getContract(message);
    
    // Error handling
    if(!server.isPlaying) return null;

    const st = server.connection.dispatcher.streamTime;
    const s = server.connection.dispatcher.seek;

    return st + (s ? s : 0);
  }

  /* Creates a NEW contract with the server and returns it
      ; basically resetting the player for that server */
  createContract(message) {
    const contract = {
      queue: [],
      currentTrack: -1,
      connection: null,
      volume: 1.0,
      isPlaying: false,
      loop: "off",
      autoplay: {
        isEnabled: false,
        rng: 0,
        unique: true,
        played: new Set()
      },
      amq: {
        isEnabled: false,
        guessMode: false,
        guessTime: 20,
        mal: {
          chance: 1.0,
          usernames: []
        }
      }
    }

    return (this.servers[message.guild.id] = contract);
  }

  /* Getter for server contract, returns the contract if there is one
      ; otherwise, create a new one */
  getContract(message) {
    const contract = this.servers[message.guild.id];
    return contract ? contract : this.createContract(message);
  }

  /* Generate an AMQ track Object */
  async #generateAMQ(message, username) {
    const server = this.getContract(message);

    this.emit("notification", message, "amqChoosingFrom", username?username:"🎲 RANDOM 🎲");

    const anime = await getAnimeInfo(username);

    if(!anime) {
      console.error(`Could not get animeInfo for username ${username?username:"🎲 RANDOM 🎲"}`);
      return null;
    }

    // Concat opening and ending themes
    const openings = anime.opening_themes.map(theme => {
      if(anime.opening_themes.length > 1) 
        return {themeType: `OP ${theme.substr(0, theme.indexOf(":"))}`, 
                themeName: theme.substr(theme.indexOf(":") + 2)};

      return {themeType: `OP #1`, themeName: theme};
    })
    const endings = anime.ending_themes.map(theme => {
      if(anime.ending_themes.length > 1) 
        return {themeType: `ED ${theme.substr(0, theme.indexOf(":"))}`, 
                themeName: theme.substr(theme.indexOf(":") + 2)};

      return {themeType: `ED #1`, themeName: theme};
    })

    const themes = openings.concat(endings);
    const theme = themes[Math.floor(themes.length * Math.random())];

    if(!theme) {
      console.error(`No theme for anime ${anime.mal_id}`);
      return null;
    }

    const songType = theme.themeType;
    const songName = theme.themeName;

    const releaseDate = anime.premiered ?? anime.aired.string;
    const animeTitle = anime.title;
    const malID = anime.mal_id;


    // Get the searchQuery
    var searchQuery;
    const match = songName.match(/^"(.+)"(.+)$/);

    if(match) {
      const songTitle = match[1];
      searchQuery = `${songTitle} - ${animeTitle} ${songType}`.replace(/"/g, '');
    } else {
      console.log(`Cannot extract song title from: ${songName}`);
      searchQuery = songName.replace(/"/g, '');
    }

    console.log(`Search query: ${searchQuery}`);


    // Get the track object
    const track = await this.#generateTrack(message, searchQuery);

    if(!track) {
      console.error(`Could not generate track for search term ${searchQuery}`);
      return null;
    }

    track.requestor = username ? `**${username}**` : "🎲 **RANDOM** 🎲";
    track.title = server.amq.guessMode ? `[AMQ Guess] ${songType}` : `[AMQ Normal] ${songType}`;
    track.amq = {
      songType: songType,
      songName: songName,
      releaseDate: releaseDate,
      animeTitle: animeTitle,
      guessTitles: new Set(),
      malID: malID,
      isGuessable: server.amq.guessMode,
      guessStarted: false,
      guessedCorrectly: new Set(),
      guessTimeout: null,
      autoplayTimeout: null,
      type: server.amq.guessMode ? "guess" : "normal",
      revealed: false,
      reveal: function() {
        track.amq.revealed = true;
        track.amq.isGuessable = false;
        track.title = `${songName} - ${animeTitle} ${songType}`;
      }
    };

    if(track.amq.isGuessable) {
      // Get alternate titles and add it to guessTitles

      if(anime.title) {
        track.amq.guessTitles.add(anime.title.toLowerCase());
      }

      if(anime.title_english) {
        track.amq.guessTitles.add(anime.title_english.toLowerCase());
      }

      if(anime.title_japanese) {
        track.amq.guessTitles.add(anime.title_japanese.toLowerCase());
      }

      anime.title_synonyms.forEach(title => {
        track.amq.guessTitles.add(title.toLowerCase());
      })
    }

    return track;
  }

  /* Generate a track Object from a query */
  async #generateTrack(message, query) {
    const track = {
      requestor: message.author.toString(),
      title: "Unknown Title",
      url: query,
      id: null,
      duration: null,
      thumbnail: null,
      source: null,
      backupUrl: null,
      info: null,
      amq: null
    }

    const queryType = getQueryType(query);

    switch(queryType) {
      case 'soundcloud_playlist': {
        try {
          const playlist = await scdl.getSetInfo(query);

          const tracks = [];

          for (const song of playlist.tracks) {
            const t = {
              url: song.permalink_url,
              title: song.title,
              duration: Math.floor(song.duration/1000),
              thumbnail: song.artwork_url ?? song.user.avatar_url ?? 'https://soundcloud.com/pwa-icon-192.png',
              requestor: message.author.toString(),
              source: 'soundcloud',
            }

            tracks.push(t);
          }

          return tracks;
        } catch(err) {
          console.error(err);

          return null;
        }
      }
      case 'spotify_album':
      case 'spotify_playlist': {
        try {
          const playlist = await spotify.getData(query);

          const tracks = await Promise.all(playlist.tracks.items.map(async (spotifyData) => {
            // If playlist type is 'playlist', then data will be contained in .track prop
            if (playlist.type === 'playlist')
              spotifyData = spotifyData.track;

            const track = {
              url: spotifyData.external_urls?.spotify,
              title: `${spotifyData.name} - ${spotifyData.artists[0]?.name??'Unknown Artist'}`,
              duration: Math.floor(spotifyData.duration_ms/1000),
              thumbnail: null,
              requestor: message.author.toString(),
              source: 'spotify',
              backupUrl: null
            }



            // Setting thumbnail
            track.thumbnail = (playlist.type === 'playlist')
                              ? spotifyData.album?.images[0]?.url 
                              : playlist.images[0]?.url
            if(!track.thumbnail) 
              track.thumbnail = 'https://www.scdn.co/i/_global/twitter_card-default.jpg';



            return track;
          }))

          return tracks;
        } catch(err) {
          console.error(err);

          return null;
        }
      }
      case 'soundcloud_track': {
        try {
          const songDetails = await scdl.getInfo(query);

          track.url = songDetails.permalink_url;
          track.title = songDetails.title;
          track.duration = Math.floor(songDetails.duration/1000);
          track.thumbnail = songDetails.artwork_url ?? songDetails.user.avatar_url ?? 'https://soundcloud.com/pwa-icon-192.png';
          track.source = 'soundcloud';

          return track;
        } catch(err) {
          console.error(err);

          return null;
        }
      }
      case 'spotify_song': {
        try {
          const spotifyData = await spotify.getData(query);

          track.url = spotifyData.external_urls?.spotify;
          track.title = `${spotifyData.name} - ${spotifyData.artists[0]?.name??'Unknown Artist'}`;
          track.duration = Math.floor(spotifyData.duration_ms/1000);
          track.source = 'spotify';



          // Setting thumbnail
          track.thumbnail = spotifyData.album?.images[0]?.url ?? 'https://www.scdn.co/i/_global/twitter_card-default.jpg';



          return track;
        } catch(err) {
          console.error(err);

          return null;
        }
      }
      case 'youtube_playlist': {
        try {
          let playlist = await ytpl(query, { limit: Infinity });

          const tracks = [];

          while(true) {
            for(const video of playlist.items) {
              tracks.push({
                requestor: message.author.toString(),
                title: video.title,
                url: video.shortUrl,
                id: video.id,
                duration: video.durationSec,
                thumbnail: video.bestThumbnail.url,
                info: null,
                source: 'youtube'
              })
            }

            // Return tracks if there is no next page
            if(playlist.continuation === null) return tracks;

            // Else, set playlist to the next page
            playlist = ytpl.continueReq(playlist.continuation);
          }
        } catch(err) {
          console.error(err);

          return null;
        }
      }
      case 'youtube_video': {
        try {
          const videoInfo = await ytdl.getBasicInfo(query);
          const videoDetails = videoInfo?.videoDetails;

          track.url = `https://www.youtube.com/watch?v=${videoDetails.videoId}`;
          track.id = videoDetails.videoId;
          track.title = videoDetails.title;
          track.duration = parseInt(videoDetails.lengthSeconds);
          track.thumbnail = videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url;
          track.info = videoInfo;
          track.source = 'youtube';

          return track;
        } catch(err) {
          console.error(err);

          return null;
        }
      }
      case 'media_link': {
        return await new Promise((resolve, _) => {
          ffmpeg.ffprobe(query, (_, metadata) => {
            if(!metadata || !metadata.format) return resolve(null);

            // Sets the title to the first metadata tag if there is one
            if(metadata.format.tags)
              track.title = metadata.format.tags[Object.keys(metadata.format.tags)[0]];

            track.duration = Math.floor(metadata.format.duration);
            track.source = 'arbitrary'

            resolve(track);
          })
        })
      }
      default: {
        if(!query) return null;

        // Search for the query on Youtube, play first result
        const search = await yts(query);

        if(search.videos.length === 0) return null;

        const video = search.videos[0];

        track.title = video.title;
        track.url = video.url;
        track.id = video.videoId;
        track.duration = video.seconds;
        track.thumbnail = video.thumbnail;
        track.source = 'youtube';

        return track;
      }
    }
  }

  /* Jump to a specific track position, returns success */
  async jump(message, trackPosition) {
    const server = this.getContract(message);

    // Error handling
    if(isNaN(trackPosition)) return this.emit("error", message, "invalidArgs");
    if(trackPosition < 0 || trackPosition >= server.queue.length)
      return this.emit("error", message, "argsOutOfBounds");

    // Prevent AMQ tracks from being guessed on more than once
    const ct = server.queue[server.currentTrack];
    if(ct && ct.amq) {
      clearTimeout(ct.amq.autoplayTimeout);
      clearTimeout(ct.amq.guessTimeout);
      if (ct.amq.isGuessable && ct.amq.guessStarted) {
        ct.amq.reveal();
        this.emit("notification", message, "guessModeExpired", "previous track!");
      }
    }

    server.currentTrack = trackPosition;
    await this.play(message, server.queue[trackPosition]);
  }

  /* Remove from "from" to "to" in queue, pretty self explanatory */
  async remove(message, from, to) {
    const server = this.getContract(message);

    // Error handling
    if(isNaN(from) || isNaN(to)) return this.emit("error", message, "invalidArgs");
    if(from < 0 || from >= server.queue.length || to < 0 || to >= server.queue.length)
      return this.emit("error", message, "argsOutOfBounds");

    const currentTrack = server.queue[server.currentTrack];
    const deletedTracks = server.queue.splice(Math.min(from, to), Math.abs(from - to) + 1);

    // Notify the user that a change has occured!
    this.emit("notification", message, "remove", deletedTracks);

    if(Math.min(from, to) < server.currentTrack) {
      const min = Math.min(from, to);
      const max = Math.max(from, to);
      const clamp = Math.min(server.currentTrack, max + 1);
      server.currentTrack -= clamp - min;
    }
    if(deletedTracks.includes(currentTrack)) {
      if(server.queue[server.currentTrack])
        return await this.jump(message, server.currentTrack);
      if(server.queue[server.queue.length - 1])
        return await this.jump(message, server.queue.length - 1);

      server.currentTrack = -1;
      await this.stop(message);
    }
  }

  /* Clears the queue */
  async clear(message) {
    const server = this.getContract(message);

    // Error handling
    if(server.queue.length === 0) return this.emit("error", message, "queueIsEmpty");

    server.queue = [];

    // Notify the user that a change has occured!
    this.emit("notification", message, "clear");

    // Stop playback if playing something
    if(server.isPlaying) {
      server.currentTrack = -1;
      await this.stop(message);
    }
  }

  /* Moves the track at position "from" to position "to" */
  async move(message, from, to) {
    const server = this.getContract(message);

    // Error handling
    if(isNaN(from) || isNaN(to)) return this.emit("error", message, "invalidArgs");
    if(from < 0 || from >= server.queue.length || to < 0 || to >= server.queue.length)
      return this.emit("error", message, "argsOutOfBounds");
    
    // Notify the user that a change has occured!
    this.emit("notification", message, "move", [server.queue[from], from + 1, to + 1]);

    server.queue.splice(to, 0, ...server.queue.splice(from, 1));

    if(server.currentTrack === from) {
      server.currentTrack = to;
    } else if(from > server.currentTrack && to <= server.currentTrack) {
      server.currentTrack++;
    } else if(from < server.currentTrack && to >= server.currentTrack) {
      server.currentTrack--;
    }
  }


  /* Establish a connection to the user's call, and add the server to the server list */
  async join(message) {
    // return FALSE if the user is not in a VC or if there is no permissions
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      this.emit("error", message, "voiceChannel");
      return false;
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      this.emit("error", message, "permissions");
      return false;
    }

    // Attempt to join the VC and establish a connection
    // ; If already in the VC, then don't join again and return true
    const server = this.getContract(message);

    if(server.connection && voiceChannel === server.connection.channel) return true;

    try {
      const connection = await voiceChannel.join();
      server.connection = connection;

      // When the connection has been cut(or disconnected), set the connection to null
      // and isPlaying status to false
      server.connection.on("disconnect", () => {
        // Prevent AMQ tracks from being guessed on more than once
        const ct = server.queue[server.currentTrack];
        if(ct && ct.amq) {
          clearTimeout(ct.amq.autoplayTimeout);
          clearTimeout(ct.amq.guessTimeout);
          if (ct.amq.isGuessable && ct.amq.guessStarted) {
            ct.amq.reveal();
            this.emit("notification", message, "guessModeExpired", "current track!");
          }
        }

        server.connection = null;
        server.isPlaying = false;
        this.emit("notification", message, "disconnected");
      })

      return true;
    } catch(err) {
      console.error(err);

      return false;
    }
  }

  /* Add a MAL account */
  async addMAL(message, username) {
    const server = this.getContract(message);
    
    // Error handling
    if(!username) return this.emit("error", message, "invalidArgs");

    // Testing to see if the username is valid
    const res = await fetch(`https://api.jikan.moe/v3/user/${username}`);

    // ; If not, then return an error
    if(!res.ok) 
      return this.emit("error", message, "invalidMALUsername", username);

    server.amq.mal.usernames.push(username);
    this.emit("notification", message, "malAdd", username);
  }

  /* Removes a MAL account */
  async delMAL(message, username) {
    const server = this.getContract(message);

    //Error handling
    if(!username) return this.emit("error", message, "invalidArgs");
    if(!server.amq.mal.usernames.includes(username))
      return this.emit("error", message, "malNotInList", username);
      
    const index = server.amq.mal.usernames.indexOf(username);

    server.amq.mal.usernames.splice(index, 1);

    this.emit("notification", message, "malDel", username);
  }

  /* Removes all MAL accounts */
  async clearMAL(message) {
    const server = this.getContract(message);

    // Error handling
    if(server.amq.mal.usernames.length === 0) return this.emit("error", message, "malListEmpty")

    server.amq.mal.usernames = [];

    this.emit("notification", message, "malClear");
  }

  /* Set the chance that MAL is chosen instead of random */
  async setMALChance(message, chance) {
    const server = this.getContract(message);

    // Error handling (show the MAL chance if chance is not a number)
    if(isNaN(chance)) 
      return this.emit("notification", message, "malChance", server.amq.mal.chance);

    // Turn chance into range [0.0 - 1.0]
    chance = chance / 100;

    // Limits and thresholds
    if(chance < 0) chance = 0;
    if(chance > 1) chance = 1;

    server.amq.mal.chance = chance;
    this.emit("notification", message, "setMALChance", server.amq.mal.chance);
  }

  /* Toggles amq mode */
  async toggleAMQ(message) {
    const server = this.getContract(message);

    this.emit("notification", message, "toggleAMQ", server.amq.isEnabled = !server.amq.isEnabled);
  }

  /* Sets the rng of autoplay */
  async setAutoplayRNG(message, rng) {
    const server = this.getContract(message);

    // Error handling (show the autoplay rng if rng is not a number)
    if(isNaN(rng)) 
      return this.emit("notification", message, "autoplayRNG", server.autoplay.rng);

    // Limits and thresholds
    if(rng < 0) rng = 0;

    server.autoplay.rng = rng;
    this.emit("notification", message, "setAutoplayRNG", server.autoplay.rng);
  }

  /* Toggles autoplay mode */
  async toggleAutoplay(message) {
    const server = this.getContract(message);

    this.emit("notification", message, "toggleAutoplay", server.autoplay.isEnabled = !server.autoplay.isEnabled);
  }

  /* Toggles autoplay UNIQUE mode */
  async toggleAutoplayUnique(message) {
    const server = this.getContract(message);

    this.emit("notification", message, "toggleAutoplayUnique", server.autoplay.unique = !server.autoplay.unique);
  }

  /* Generate an AMQ track and add it to the queue */
  async addAMQ(message, username = null) {
    const server = this.getContract(message);

    if(!username) {
      // Get random username
      const usernames = server.amq.mal.usernames;

      let rand = Math.random();
      if(rand < server.amq.mal.chance && usernames.length !== 0) {
        username = usernames[Math.floor(usernames.length * Math.random())];
      }
    } else {
      // Error handling
      if(!server.amq.mal.usernames.includes(username))
        return this.emit("error", message, "malNotInList", username);
    }

    // Generate an AMQ track
    this.emit("notification", message, "addingAMQ");
    let track = await this.#generateAMQ(message, username);

    // Error handling
    if(!track) {
      track = await this.#generateAMQ(message, null);

      // If no track again, then display error
      if(!track) {
        this.emit("error", message, "errorAddingAMQ");
        return null;
      }
    }

    server.queue.push(track);
    this.emit("notification", message, "trackAdded", track);

    return track;
  }

  /* Sets the guess time of AMQ */
  async setGuessTime(message, time) {
    const server = this.getContract(message);

    // Error handling (show the guess time if time is not a number)
    if(isNaN(time)) 
      return this.emit("notification", message, "guessTime", server.amq.guessTime);

    // Thresholds n stuff
    if(time < 5) time = 5;
    if(time > 60) time = 60;

    server.amq.guessTime = time;
    return this.emit("notification", message, "setGuessTime", server.amq.guessTime);
  }

  /* Toggles guess mode */
  async toggleGuessMode(message) {
    const server = this.getContract(message);
    
    this.emit("notification", message, "toggleGuessMode", server.amq.guessMode = !server.amq.guessMode);
  }

  /* Guess the currently playing AMQ song */
  async guessAMQ(message, guess) {
    const server = this.getContract(message);

    // Error handling
    if(!guess)
      return this.emit("error", message, "invalidArgs");
    if(!server.isPlaying)
      return this.emit("error", message, "isNotPlaying");
    if(!server.queue[server.currentTrack].amq)
      return this.emit("error", message, "notAMQTrack");
    if(!server.queue[server.currentTrack].amq.isGuessable)
      return this.emit("error", message, "notGuessable");

    const ct = server.queue[server.currentTrack]

    for(const title of ct.amq.guessTitles) {
      const accuracy = stringSimilarity(guess.toLowerCase(), title);

      if(accuracy >= 0.4) {
        ct.amq.guessedCorrectly.add({username: message.author.username, accuracy: accuracy});
        break;
      }
    }

    message.delete();

    this.emit("notification", message, "amqGuessMade");
  }

  /* Skips current track and attempts to play next track, returns success */
  async skip(message) {
    // Check if there is a next track in queue
    // ; If there is a next track, then increment currentTrack by one and play next track
    // ; If there is no next track, then stop playback and leave the call
    const server = this.getContract(message);

    // Skip to next track if there is a next track in queue
    if(server.queue[server.currentTrack + 1]) {
      await this.jump(message, server.currentTrack + 1);
      return true;
    }

    // If anime music quiz mode is on, then 
    if(server.amq.isEnabled) {
      // Clear the timeout so it doesn't add two things at once
      const ct = server.queue[server.currentTrack];
      if(ct && ct.amq && ct.amq.type === "guess") 
        clearTimeout(ct.amq.autoplayTimeout);

      // Destroy the dispatcher so it doesn't add two things at once
      if(server.connection && server.connection.dispatcher) {
        server.connection.dispatcher.destroy();
        server.isPlaying = false;
      }

      // Generate and add an AMQ track
      if (await this.addAMQ(message)) {
        // ; then play that added track
        await this.jump(message, server.queue.length - 1);
      }
      return true;
    }

    // If autoplay mode is on, then
    if(server.autoplay.isEnabled) {
      const ct = server.queue[server.currentTrack];
      if(ct && ct.source === "youtube") {
        // Emit a notification for autoplay
        this.emit("notification", message, "addingAutoplay");

        // Get ct.info if it does not exist
        if(!ct.info) ct.info = await ytdl.getBasicInfo(ct.url);

        // Get related videos from ct.info
        var related = ct.info?.related_videos;

        // If autoplay unique is on, filter out all the non-unique videos
        if(server.autoplay.unique) {
          related = related.filter(v => !server.autoplay.played.has(v.id));
        }

        if(related.length !== 0) {
          // Play related using rng
          const range = Math.min(related.length, server.autoplay.rng);
          const rand = Math.floor(Math.random() * range)
          const autoplayVideo = related[rand];
          const videoUrl = `https://www.youtube.com/watch?v=${autoplayVideo.id}`;

          // Generate and add the autoplay video
          if (await this.addTrack(message, videoUrl)) {
            // ; then play that added track
            await this.jump(message, server.queue.length - 1);
          }
          return true;
        }

        // Emit an error if there is no related videos
        this.emit("error", message, "noRelatedVideos");
      }
    }

    server.currentTrack = server.queue.length;
    await this.stop(message);
    return false;
  }

  /* Skips to the previous track, returns success */
  async prev(message) {
    // Same thing as skip but reverse
    const server = this.getContract(message);

    // Skip to previous track if there is a previous track in queue
    if(server.queue[server.currentTrack - 1]) {
      await this.jump(message, server.currentTrack - 1);
      return true;
    }

    server.currentTrack = -1;
    await this.stop(message);
    return false;
  }

  /* Stops playback and exits the VC */
  async stop(message) {
    const server = this.getContract(message);

    // Error handling
    if(!server.connection) return this.emit("error", message, "isNotPlaying");

    server.connection.disconnect();
  }

  /* Set loop options */
  async loop(message, option) {
    const server = this.getContract(message);

    switch(option) {
      case "track":
        server.loop = "track";
        this.emit("notification", message, "setLoop", "track");
        break;
      case "queue":
        server.loop = "queue";
        this.emit("notification", message, "setLoop", "queue");
        break;
      case "off":
        server.loop = "off";
        this.emit("notification", message, "setLoop", "off");
        break;
      default:
        this.emit("notification", message, "loop", server.loop);
        break;
    }
  }

  /* Play's the track immediately and without question */
  async play(message, track) {
    const server = this.getContract(message);

    // Error handling
    if(!server.connection && !await this.join(message)) return;

    // Set seek sample for guessmode (+5 seconds of leeway)
    let seek = 0;
    if(track.amq && track.amq.isGuessable) {
      const lw = server.amq.guessTime + 5;
      const range = track.duration - lw;

      seek = Math.floor(Math.random() * range);

      if(seek < 0) seek = 0;
    }

    // set the guess time and autoplay time for guess mode in SECONDS
    let amqGuessTime;
    let amqAutoplayTime;

    // 5 seconds of leeway
    amqGuessTime = Math.min(track.duration - 5, server.amq.guessTime);
    amqAutoplayTime = amqGuessTime + 10;

    // Modify spotify
    if(track.source === "spotify" && !track.backupUrl) {
      const search = await yts(track.title);
      if(search.videos.length !== 0) {
        track.backupUrl = search.videos[0].url;
        track.duration = search.videos[0].seconds;
      }
    }

    // If source is youtube, then add the id to autoplay's played
    if(track.source === "youtube")
      server.autoplay.played.add(track.id);

    // Get the stream
    let stream;

    if(track.source === "youtube" || track.source === "spotify") {
      const url = track.backupUrl ?? track.url;

      // Get info if it does not exist
      if(!track.info) track.info = await ytdl.getBasicInfo(url);

      stream = ytdl(url, { filter: track.info?.videoDetails.isLive ? '' : 'audioonly', dlChunkSize: 0, highWaterMark: 1<<25 });
    } else {
      stream = track.source === "soundcloud" ? await scdl.download(track.url) : track.url;
    }

    server.connection
      .play(stream, { bitrate: 'auto', seek: seek }) // IN SECONDS
      .on("finish", () => {
        if(server.loop === "track")
          return this.jump(message, server.currentTrack);
        if(server.loop === "queue" && server.currentTrack === server.queue.length - 1)
          return this.jump(message, 0);

        this.skip(message);
      })
      .on("error", err => {
        this.skip(message);
        console.error(err);
      })
      .on("start", () => {
        // If it is AMQ song and guess mode is on, then set guess timer
        if(!track.amq || !track.amq.isGuessable) return;

        // Set guessStarted to true to mark that guessing has started for track
        track.amq.guessStarted = true;
        
        // Clear the previous setTimeout so it doesn't overlap
        clearTimeout(track.amq.guessTimeout);

        track.amq.guessTimeout = setTimeout(() => {
          // Error handling
          if(!server.isPlaying || server.queue[server.currentTrack] !== track) return;

          // Emit a notification to reveal the track
          this.emit("notification", message, "amqGuessEnded", track);

        }, amqGuessTime * 1000);

        // Clear the previous setTimeout so it doesn't overlap
        clearTimeout(track.amq.autoplayTimeout)

        // Autoplay a new AMQ track after 10 seconds
        track.amq.autoplayTimeout = setTimeout(async () => {
          // Error handling
          if(!server.isPlaying || server.queue[server.currentTrack] !== track) return;
          if(!server.amq.isEnabled || !server.amq.guessMode) return;
          if(server.queue[server.currentTrack + 1]) return;

          // Destroy the dispatcher as to not trigger "finish" event
          server.connection.dispatcher.destroy();
          server.isPlaying = false;

          // Generate and add an AMQ track
          if (await this.addAMQ(message)) {
            // ; then play that added track
            await this.jump(message, server.queue.length - 1);
          }
        }, amqAutoplayTime * 1000)
      })

    // Set the seek for sample (ms)
    server.connection.dispatcher.seek = seek * 1000;

    // Set the volume of the playback
    server.connection.dispatcher.setVolumeLogarithmic(server.volume);

    server.isPlaying = true;
    this.emit("notification", message, "trackStart", { track: track, seek: seek });
  }

  /* Pause playback */
  async pause(message) {
    const server = this.getContract(message);

    // Error handling
    if(!server.isPlaying) return this.emit("error", message, "isNotPlaying");
    if(server.queue[server.currentTrack].amq && 
       server.queue[server.currentTrack].amq.type === "guess")
      return this.emit("error", message, "isInGuessMode");

    server.connection.dispatcher.pause();
    this.emit("notification", message, "pause");
  }

  /* Resume playback */
  async resume(message) {
    const server = this.getContract(message);

    // Error handling
    if(!server.isPlaying) return this.emit("error", message, "isNotPlaying");
    if(server.queue[server.currentTrack].amq && 
       server.queue[server.currentTrack].amq.type === "guess")
      return this.emit("error", message, "isInGuessMode");

    server.connection.dispatcher.resume();
    this.emit("notification", message, "resume");
  }

  /* Seek to x ms in time */
  async seekTo(message, ms) {
    const server = this.getContract(message);

    // Error handling
    if(isNaN(ms)) return this.emit("error", message, "invalidArgs");
    if(!server.isPlaying) return this.emit("error", message, "isNotPlaying");
    if(server.queue[server.currentTrack].amq && 
       server.queue[server.currentTrack].amq.type === "guess")
      return this.emit("error", message, "isInGuessMode");

    //WTF
    if(!server.connection) return console.error("WTF");

    // Thresholds and stuff
    const ct = server.queue[server.currentTrack];

    if(ms < 0) ms = 0;
    if(ms > ct.duration * 1000) ms = ct.duration * 1000;

    // CONVERT TO SECONDS
    const seek = ms/1000;

    // Get the stream
    let stream;

    if(ct.source === "youtube" || ct.source === "spotify") {
      const url = ct.backupUrl ?? ct.url;

      // Get info if it does not exist
      if(!ct.info) ct.info = await ytdl.getBasicInfo(url);

      stream = ytdl(url, { filter: ct.info?.videoDetails.isLive ? '' : 'audioonly', dlChunkSize: 0, highWaterMark: 1<<25 });
    } else {
      stream = ct.source === "soundcloud" ? await scdl.download(ct.url) : ct.url;
    }

    server.connection
      .play(stream, { bitrate: 'auto', seek: seek }) // IN SECONDS
      .on("finish", () => {
        if(server.loop === "track")
          return this.jump(message, server.currentTrack);
        if(server.loop === "queue" && server.currentTrack === server.queue.length - 1)
          return this.jump(message, 0);

        this.skip(message);
      })
      .on("error", err => {
        this.skip(message);
        console.error(err);
      })

    // Set seek time
    server.connection.dispatcher.seek = ms;

    // Set the volume of the playback
    server.connection.dispatcher.setVolumeLogarithmic(server.volume);

    this.emit("notification", message, "seekTo", ms);
  }

  /* Seek "ms" milliseconds forward or backwards */
  async seek(message, ms) {
    const server = this.getContract(message);

    // Error handling
    if(isNaN(ms)) return this.emit("error", message, "invalidArgs");
    if(!server.isPlaying) return this.emit("error", message, "isNotPlaying");

    const st = server.connection.dispatcher.streamTime;

    // If s is undefined, then set s to 0 instead
    let s = server.connection.dispatcher.seek;
    if(!s) s = 0;

    await this.seekTo(message, s + st + ms);
  }

  /* Set volume (1.0 is 100%, 0.5 is 50%, etc.) */
  async setVolume(message, volume) {
    const server = this.getContract(message);

    // Error handling (show volume if args is not a number)
    if(isNaN(volume))
      return this.emit("notification", message, "volume", server.volume);

    // Limits and thresholds
    if(volume < 0) volume = 0;
    if(volume > 2) volume = 2;

    server.volume = volume;
    this.emit("notification", message, "setVolume", volume);

    // Set the volume as it is playing if there is playback
    if(server.isPlaying) {
      server.connection.dispatcher.setVolumeLogarithmic(server.volume);
    }
  }

  /* Adds a track to the queue from query, returns the track */
  async addTrack(message, query) {
    const server = this.getContract(message);
    const track = await this.#generateTrack(message, query);

    // Error handling
    if(!track) {
      this.emit("error", message, "noResults", query);
      return null;
    }

    if(Array.isArray(track)) {
      // If track is a list of tracks (playlist)
      server.queue = server.queue.concat(track);
    } else {
      server.queue.push(track);
    }

    this.emit("notification", message, "trackAdded", track);

    return track;
  }

  /* Play/Enqueue hybrid function for "play" command */
  async execute(message, query) {
    const server = this.getContract(message);

    // Error handling
    if(!query) return this.emit("error", message, "invalidQuery");

    // Add the track, if successfully added and nothing is playing then play that added track
    const track = await this.addTrack(message, query);

    if(track && server.isPlaying === false) {
      if(Array.isArray(track)) {
        // If track is a list of tracks (playlist)
        await this.jump(message, server.queue.length - track.length);
      } else {
        await this.jump(message, server.queue.length - 1);
      }
    }
  }
}



module.exports = Player;

