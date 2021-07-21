const fetch = require("node-fetch")
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('ffprobe-static');
const EventEmitter = require('events');
const ytdl = require("ytdl-core");
const yts = require("yt-search");
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
    
    if(server.isPlaying) {
      const st = server.connection.dispatcher.streamTime;
      const s = server.connection.dispatcher.seek;

      return st + (s ? s : 0);
    }
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
  async #generateAMQ(message) {
    const server = this.getContract(message);

    const usernames = server.amq.mal.usernames;

    let username = null;
    let rand = Math.random();

    if(rand < server.amq.mal.chance && usernames.length !== 0) {
      username = usernames[Math.floor(usernames.length * Math.random())];
    }

    this.emit("notification", message, "amqChoosingFrom", username);

    const anime = await getAnimeInfo(username);

    if(anime === null) return null;

    const theme = anime.themes[Math.floor(anime.themes.length * Math.random())];
    const songType = theme.themeType;
    const songName = theme.themeName;

    const releaseSeason = anime.season;
    const releaseYear = anime.year;
    const animeTitle = anime.name;
    const malID = anime.malID;

    const track = 
      await this.#generateTrack(message, `${songName} - ${animeTitle} ${songType}`);

    if(!track) return null;

    track.requestor = username ? `**${username}**` : "🎲 **RANDOM** 🎲";
    track.title = server.amq.guessMode ? `[AMQ Guess] ${songType}` : `[AMQ Normal] ${songType}`;
    track.amq = {
      songType: songType,
      songName: songName,
      releaseSeason: releaseSeason,
      releaseYear: releaseYear,
      animeTitle: animeTitle,
      guessTitles: new Set([animeTitle.toLowerCase()]),
      malID: malID,
      isGuessable: server.amq.guessMode,
      guessStarted: false,
      guessedCorrectly: new Set(),
      guessTimeout: null,
      autoplayTimeout: null,
      revealed: false,
      reveal: function() {
        this.revealed = true;
        this.isGuessable = false;
        track.title = `"${songName}" - ${animeTitle} ${songType}`;
      }
    };

    if(track.amq.isGuessable) {
      // Get alternate titles and add it to guessTitles
      const res = await fetch(`https://api.jikan.moe/v3/anime/${malID}`);

      // If something failed with the api then return null
      if(res.ok) {
        const data = await res.json();

        if(data.title_english) {
          track.amq.guessTitles.add(data.title_english.toLowerCase());
        }

        if(data.title_japanese) {
          track.amq.guessTitles.add(data.title_japanese.toLowerCase());
        }

        data.title_synonyms.forEach(title => {
          track.amq.guessTitles.add(title.toLowerCase());
        })
      }
    }

    return track;
  }

  /* Generate a track Object from a query */
  async #generateTrack(message, query) {
    const track = {
      title: "Unknown Title",
      url: query,
      duration: null,
      thumbnail: null,
      requestor: message.author.toString(),
      source: null,
      backupLink: null,
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
        } catch(err) {return null;}
      }
      case 'spotify_album':
      case 'spotify_playlist': {
        try {
          const playlist = await spotify.getData(query);

          const tracks = await Promise.all(playlist.tracks.items.map(async (spotifyData) => {
            const t = {
              url: spotifyData.external_urls?.spotify ?? query,
              title: spotifyData.name,
              duration: Math.floor(spotifyData.duration_ms/1000),
              thumbnail: null,
              requestor: message.author.toString(),
              source: 'spotify',
              backupLink: null
            }

            // Search for the song on Youtube, set first result as backup link
            const search = await yts(`${t.title}${' - ' + spotifyData.artists[0]?.name ?? 'Unknown Artist'}`);

            if(search.videos.length !== 0) {
              const video = search.videos[0];

              t.backupLink = video.url;

              // Get our thumbnail from yts, because spotify will not give us one
              t.thumbnail = video.thumbnail;
            }

            return t;
          }))

          return tracks;
        } catch(err) {return null;}
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
        } catch(err) {return null;}
      }
      case 'spotify_song': {
        try {
          const spotifyData = await spotify.getData(query);

          track.url = spotifyData.external_urls?.spotify ?? query;
          track.title = spotifyData.name;
          track.duration = Math.floor(spotifyData.duration_ms/1000);
          track.source = 'spotify';

          // Search for the song on Youtube, set first result as backup link
          const search = await yts(`${track.title}${' - ' + spotifyData.artists[0]?.name ?? 'Unknown Artist'}`);

          if(search.videos.length !== 0) {
            const video = search.videos[0];

            track.backupLink = video.url;

            // Get our thumbnail from yts, because spotify will not give us one
            track.thumbnail = video.thumbnail;
          }

          return track;
        } catch(err) {return null;}
      }
      case 'youtube_playlist': {
        try {
          const id = query.match(/(PL|UU|LL|RD|OL)[a-zA-Z0-9-_]{16,41}/)[0];
          const playlist = await yts({ listId: id });

          if (!playlist) return null;

          const tracks = playlist.videos.map(video => {
            return {
              title: video.title,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              duration: video.duration.seconds,
              thumbnail: video.thumbnail,
              requestor: message.author.toString(),
              source: 'youtube'
            }
          })

          return tracks;
        } catch(err) {return null;}
      }
      case 'youtube_video': {
        try {
          const videoInfo = await ytdl.getBasicInfo(query);
          const videoDetails = videoInfo?.videoDetails;

          track.url = `https://www.youtube.com/watch?v=${videoDetails.videoId}`;
          track.title = videoDetails.title;
          track.duration = parseInt(videoDetails.lengthSeconds);
          track.thumbnail = videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url;
          track.source = 'youtube'

          return track;
        } catch(err) {return null;}
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
        track.duration = video.seconds;
        track.thumbnail = video.thumbnail;
        track.source = 'youtube'

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
    if(server.isPlaying) {
      const ct = server.queue[server.currentTrack];
      if(ct && ct.amq) {
        clearTimeout(ct.amq.autoplayTimeout);
        clearTimeout(ct.amq.guessTimeout);
        if (ct.amq.isGuessable && ct.amq.guessStarted) {
          ct.amq.reveal();
          this.emit("notification", message, "guessModeExpired", "previous track!");
        }
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
    if(!server.isPlaying) return;

    server.currentTrack = -1;
    await this.stop(message);
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
        if(server.isPlaying) {
          const ct = server.queue[server.currentTrack];
          if(ct && ct.amq) {
            clearTimeout(ct.amq.autoplayTimeout);
            clearTimeout(ct.amq.guessTimeout);
            if (ct.amq.isGuessable && ct.amq.guessStarted) {
              ct.amq.reveal();
              this.emit("notification", message, "guessModeExpired", "current track!");
            }
          }
        }

        server.connection = null;
        server.isPlaying = false;
        this.emit("notification", message, "disconnected");
      })

      return true;
    } catch(err) {
      console.log(err);

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

  /* Generate an AMQ track and add it to the queue */
  async addAMQ(message) {
    const server = this.getContract(message);

    // Generate an AMQ track
    this.emit("notification", message, "addingAMQ");
    const track = await this.#generateAMQ(message);

    // Error handling
    if(!track) {
      this.emit("error", message, "errorAddingAMQ");
      return null;
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
      console.log(`Guess: ${guess.toLowerCase().padEnd(guess.length + 3)}Title: ${title.padEnd([...ct.amq.guessTitles].reduce((p, c) => p.length > c.length ? p : c).length + 3)}Similar: ${stringSimilarity(guess.toLowerCase(), title)}`);

      if(stringSimilarity(guess.toLowerCase(), title) >= 0.4) {
        ct.amq.guessedCorrectly.add(message.author);
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
      // Clear the autoplayTimeout so that it doesn't double-add
      if(server.isPlaying) {
        const ct = server.queue[server.currentTrack];
        if(ct && ct.amq) clearTimeout(ct.amq.autoplayTimeout);
      }

      // ; generate and add an AMQ track
      if (await this.addAMQ(message)) {
        // ; then play that added track
        await this.jump(message, server.queue.length - 1);
      }
      return true;
    }

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
    // Don't play anything if is not in VC
    if(!await this.join(message)) return;

    const server = this.getContract(message);

    let stream;

    if(track.source === "youtube" || track.source === "spotify") {
      stream = ytdl(track.backupLink ?? track.url, {filter: 'audioonly', dlChunkSize: 0});
    } else {
      stream = track.source === "soundcloud" ? await scdl.download(track.url) : track.url;
    }

    // Set seek sample for guessmode (5 seconds of leeway)
    let seek = (track.amq && track.amq.isGuessable) ? Math.floor(Math.random() * (track.duration - server.amq.guessTime - 5)) : 0;
    if(seek < 0) seek = 0;

    server.connection
      .play(stream, { bitrate: 'auto', seek: seek })
      .on("finish", () => {
        // To prevent double adding (Dont skip or jump if current song is guessmode song)
        if(server.isPlaying) {
          const ct = server.queue[server.currentTrack];
          if(ct && ct.amq && (ct.amq.isGuessable || ct.amq.guessStarted)) return;
        }

        if(server.loop === "track")
          return this.jump(message, server.currentTrack);
        if(server.currentTrack === server.queue.length - 1 && server.loop === "queue")
          return this.jump(message, 0);

        this.skip(message);
      })
      .on("error", err => {
        this.skip(message);
        console.log(err);
      })
      .on("start", () => {
        // If it is AMQ song and guess mode is on, then set guess timer
        if(!track.amq || !track.amq.isGuessable) return;

        // Set guessStarted to true to mark that guessing has started for track
        track.amq.guessStarted = true;
        
        // Clear the previous setTimeout so it doesn't overlap
        clearTimeout(track.amq.guessTimeout);

        track.amq.guessTimeout = setTimeout(async () => {
          // Error handling
          if(!server.isPlaying || !track.amq.isGuessable || server.queue[server.currentTrack] !== track) return;

          track.amq.reveal();
          this.emit("notification", message, "amqGuessEnded", track);

          // Clear the previous setTimeout so it doesn't overlap
          clearTimeout(track.amq.autoplayTimeout)

          // Autoplay a new AMQ track after 10 seconds
          track.amq.autoplayTimeout = setTimeout(async () => {
            // Error handling
            if(!server.isPlaying || !server.amq.isEnabled || !server.amq.guessMode || server.queue[server.currentTrack + 1] || server.queue[server.currentTrack] !== track) return;

            // Generate and add an AMQ track
            if (await this.addAMQ(message)) {
              // ; then play that added track
              await this.jump(message, server.queue.length - 1);
            }
          }, 10000)
        }, Math.min((track.duration - 5) * 1000, server.amq.guessTime * 1000));
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
      (server.queue[server.currentTrack].amq.isGuessable || server.queue[server.currentTrack].amq.guessStarted))
      return this.emit("error", message, "guessMode");

    server.connection.dispatcher.pause();
    this.emit("notification", message, "pause");
  }

  /* Resume playback */
  async resume(message) {
    const server = this.getContract(message);

    // Error handling
    if(!server.isPlaying) return this.emit("error", message, "isNotPlaying");
    if(server.queue[server.currentTrack].amq && 
      (server.queue[server.currentTrack].amq.isGuessable || server.queue[server.currentTrack].amq.guessStarted))
      return this.emit("error", message, "guessMode");

    if(server.isPlaying) {
      server.connection.dispatcher.resume();
      this.emit("notification", message, "resume");
    }
  }

  /* Seek to x ms in time */
  async seekTo(message, ms) {
    const server = this.getContract(message);

    // Error handling
    if(isNaN(ms)) return this.emit("error", message, "invalidArgs");
    if(!server.isPlaying) return this.emit("error", message, "isNotPlaying");
    if(server.queue[server.currentTrack].amq && 
      (server.queue[server.currentTrack].amq.isGuessable || server.queue[server.currentTrack].amq.guessStarted))
      return this.emit("error", message, "guessMode");

    const track = server.queue[server.currentTrack];

    ms = ms < 0 ? 0 : (ms > track.duration * 1000 ? track.duration * 1000 : ms);

    let stream;

    if(track.source === "youtube" || track.source === "spotify") {
      stream = ytdl(track.backupLink ?? track.url, {filter: 'audioonly', dlChunkSize: 0});
    } else {
      stream = track.source === "soundcloud" ? await scdl.download(track.url) : track.url;
    }

    server.connection
      .play(stream, { bitrate: 'auto', seek: ms/1000 })
      .on("finish", () => {
        if(server.loop === "track")
          return this.jump(message, server.currentTrack);
        if(server.currentTrack === server.queue.length - 1 && server.loop === "queue")
          return this.jump(message, 0);

        this.skip(message);
      })
      .on("error", err => {
        this.skip(message);
        console.log(err);
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
    const s = server.connection.dispatcher.seek;

    await this.seekTo(message, st + ms + (s ? s : 0));
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

