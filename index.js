const { Client } = require('discord.js');
const { prefix, token } = require("./config");
const { formatTime, codify, getPrintableQueue, getNowPlaying, getSimpleEmbed, getMoveEmbed, getSong, getHelp, getReveal } = require("./formatter");

const Player = require("./discord-player");

const client = new Client();
const player = new Player();

let processor;



//<-- event: onnotification
player.on("notification", (message, type, data) => {
  switch(type) {
    case "trackStart": {
      const m1 = getNowPlaying(data, 0);
      message.channel.send(m1);
      break;
    }
    case "trackAdded": {
      const value = data.amq ? `Track added: **${data.title}**` : 
                               `Track added: [${data.title}](${data.url})`
      const m1 = getSimpleEmbed(`${value} [${data.requestor}]`);
      message.channel.send(m1);
      break;
    }
    case "disconnected": {
      const m1 = getSimpleEmbed("🛑 Playback has been stopped because I have disconnected!");
      message.channel.send(m1);
      break;
    }
    case "clear": {
      const m1 = getSimpleEmbed("🗑️ Cleared the queue!");
      message.channel.send(m1);
      break;
    }
    case "remove": {
      const m1 = getSimpleEmbed(`${data.length} songs have been removed! These are the songs:`);
      const m2 = getPrintableQueue(data);
      message.channel.send(m1);
      message.channel.send(m2);
      break;
    }
    case "move": {
      const m1 = getMoveEmbed(data[0], data[1], data[2]);
      message.channel.send(m1);
      break;
    }
    case "search": {
      const m1 = getSimpleEmbed(`**----- Searching for -----**${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    case "pause": {
      const m1 = getSimpleEmbed("⏸ Playback has been paused!");
      message.channel.send(m1);
      break;
    }
    case "resume": {
      const m1 = getSimpleEmbed("▶️ Playback has been resumed!");
      message.channel.send(m1);
      break;
    }
    case "seekTo": {
      const ts = formatTime(Math.floor(data/1000));
      const m1 = getSimpleEmbed(`**----- Seeked to -----**${codify(ts)}`);
      message.channel.send(m1);
      break;
    }
    case "setVolume": {
      const vol = `${Math.floor(data * 100)}%`;
      const m1 = getSimpleEmbed(`**----- New volume -----**${codify(vol)}`);
      message.channel.send(m1);
      break;
    }
    case "loop": {
      const m1 = getSimpleEmbed(`**----- Loop -----**${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    case "toggleAMQ": {
      const enabled = data ? "Enabled" : "Disabled";
      const m1 = getSimpleEmbed(`**----- Anime Music Quiz -----**${codify(enabled)}`);
      message.channel.send(m1);
      break;
    }
    case "addingAMQ": {
      const m1 = getSimpleEmbed("🤖 Generating AMQ song...");
      message.channel.send(m1);
      break;
    }
    case "malAdd": {
      const m1 = getSimpleEmbed(`**----- MyAnimeList Added -----**${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    case "malDel": {
      const m1 = getSimpleEmbed(`**----- MyAnimeList Removed -----**${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    case "malClear": {
      const m1 = getSimpleEmbed("🗑️ Cleared the MAL list!");
      message.channel.send(m1);
      break;
    }
    case "malChanceSet": {
      const chance = `${(data * 100).toFixed(1)}%`;
      const m1 = getSimpleEmbed(`**----- MyAnimeList Chance -----**${codify(chance)}`);
      message.channel.send(m1);
      break;
    }
    case "amqChoosingFrom": {
      const source = 
              data == null ? "🎲 RANDOM 🎲" : data;
      const m1 = getSimpleEmbed(`**----- Choosing From -----**${codify(source)}`);
      message.channel.send(m1);
      break;
    }
    default: {
      const m1 = getSimpleEmbed("How is this even possible?");
      message.channel.send(m1);
      break;
    }
  }
})
//-->

//<-- event: onerror
player.on("error", (message, reason, data) => {
  switch(reason) {
    case "voiceChannel": {
      const m1 = getSimpleEmbed("⚠️ You need to be in a voice channel to play music!");
      message.channel.send(m1);
      break;
    }
    case "permissions": {
      const m1 = getSimpleEmbed("⚠️ I need permissions to join and speak in your voice channel!");
      message.channel.send(m1);
      break;
    }
    case "invalidArgs": {
      const m1 = getSimpleEmbed("⚠️ Please provide valid arguments!");
      message.channel.send(m1);
      break;
    }
    case "isNotPlaying": {
      const m1 = getSimpleEmbed("⚠️ Nothing is playing right now...");
      message.channel.send(m1);
      break;
    }
    case "argsOutOfBounds": {
      const m1 = getSimpleEmbed("⚠️ Arguments are out of bounds!");
      message.channel.send(m1);
      break;
    }
    case "invalidQuery": {
      const m1 = getSimpleEmbed("⚠️ Please enter a valid query!");
      message.channel.send(m1);
      break;
    }
    case "noResults": {
      const m1 = getSimpleEmbed(`⚠️ No results could be found for query:${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    case "errorAddingAMQ": {
      const m1 = getSimpleEmbed("⚠️ There was an error generating the AMQ song");
      message.channel.send(m1);
      break;
    }
    case "invalidMALUsername": {
      const m1 = getSimpleEmbed(`⚠️ This MyAnimeList username is invalid!${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    case "queueIsEmpty": {
      const m1 = getSimpleEmbed("⚠️ The queue is empty!");
      message.channel.send(m1);
      break;
    }
    case "malListEmpty": {
      const m1 = getSimpleEmbed("⚠️ The MAL list is empty!");
      message.channel.send(m1);
      break;
    }
    case "malNotInList": {
      const m1 = getSimpleEmbed(`⚠️ The username is not in the MAL list!${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    case "noPlayableMALSongs": {
      const m1 = getSimpleEmbed(`⚠️ This user has no playable MAL songs!${codify(data)}`);
      message.channel.send(m1);
      break;
    }
    default: {
      const m1 = getSimpleEmbed("How the fuck did this even happen?");
      message.channel.send(m1);
      break;
    }
  }
})
//-->

//<-- event: onmessage
client.on("message", async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  const serverQueue = player.getQueue(message);
  const serverCurrentTrack = player.getCurrentTrack(message);
  const serverIsPlaying = player.getIsPlaying(message);

  // Waits until the previous command is fully processed before continuing
  await processor;

  processor = new Promise(async (resolve, _) => {
    switch(command) {
      case "help": {
        const m1 = getHelp(message, client, args.join(" "));
        message.channel.send(m1);
        break;
      }
      case "play": {
        await player.execute(message, args.join(" "));
        break;
      }
      case "np":
      case "nowplaying": {
        const ct = serverQueue[serverCurrentTrack];
        const ts = Math.floor(player.getTimeStamp(message)/1000);
        const m1 = getNowPlaying(ct, ts);
        message.channel.send(m1);
        break;
      }
      case "song": {
        const c = (args[0] == null || args[0] == "current" || args[0] == "c");
        if(c && serverIsPlaying == false) {
          const m1 = getSimpleEmbed("⚠️ Nothing is playing right now...");
          message.channel.send(m1);
          break;
        }
        const a1 =
              args[0] == null                        ? serverCurrentTrack           :
              args[0] == "current" || args[0] == "c" ? serverCurrentTrack           :
              args[0] == "first"   || args[0] == "f" ? 0                            :
              args[0] == "last"    || args[0] == "l" ? serverQueue.length - 1       :
                                                       parseInt(args[0]) - 1;
        const tsc = (a1 == serverCurrentTrack && serverIsPlaying);
        const ts = tsc ? Math.floor(player.getTimeStamp(message)/1000) : null;
        const m1 = getSong(serverQueue[a1], ts);
        message.channel.send(m1);
        break;
      }
      case "queue": {
        const m1 = getPrintableQueue(serverQueue, serverCurrentTrack);
        message.channel.send(m1);
        break;
      }
      case "skip": {
        await player.skip(message);
        break;
      }
      case "prev": {
        await player.prev(message);
        break;
      }
      case "stop": {
        await player.stop(message);
        break;
      }
      case "jump": {
        const a1 =
              args[0] == "first" || args[0] == "f" ? 0                            :
              args[0] == "last"  || args[0] == "l" ? serverQueue.length - 1       :
                                                     parseInt(args[0]) - 1;
        await player.jump(message, a1);
        break;
      }
      case "remove": {
        const a1 =
              args[0] == "current" || args[0] == "c" ? serverCurrentTrack           :
              args[0] == "first"   || args[0] == "f" ? 0                            :
              args[0] == "last"    || args[0] == "l" ? serverQueue.length - 1       :
                                                       parseInt(args[0]) - 1;
        const a2 =
              args[1] == null                        ? a1                           :
              args[1] == "current" || args[1] == "c" ? serverCurrentTrack           :
              args[1] == "first"   || args[1] == "f" ? 0                            :
              args[1] == "last"    || args[1] == "l" ? serverQueue.length - 1       :
                                                       parseInt(args[1]) - 1;
        await player.remove(message, a1, args.length < 2 ? a1 : a2);
        break;
      }
      case "clear": {
        await player.clear(message);
        break;
      }
      case "move": {
        const a1 =
              args[0] == "current" || args[0] == "c" ? serverCurrentTrack           :
              args[0] == "first"   || args[0] == "f" ? 0                            :
              args[0] == "last"    || args[0] == "l" ? serverQueue.length - 1       :
                                                       parseInt(args[0]) - 1;
        const a2 =
              args[1] == "current" || args[1] == "c" ? serverCurrentTrack           :
              args[1] == "first"   || args[1] == "f" ? 0                            :
              args[1] == "last"    || args[1] == "l" ? serverQueue.length - 1       :
                                                       parseInt(args[1]) - 1;
        await player.move(message, a1, a2);
        break;
      }
      case "pause": {
        await player.pause(message);
        break;
      }
      case "resume": {
        await player.resume(message);
        break;
      }
      case "volume": {
        await player.setVolume(message, parseFloat(args[0]));
        break;
      }
      case "seekto": {
        await player.seekTo(message, Math.floor(parseFloat(args[0]) * 1000));
        break;
      }
      case "seek": {
        await player.seek(message, Math.floor(parseFloat(args[0]) * 1000));
        break;
      }
      case "loop": {
        await player.loop(message, args[0]);
        break;
      }
      case "amq": {
        switch(args[0]) {
          case undefined:
          case "toggle": {
            await player.toggleAMQ(message);
            break;
          }
          case "reveal": {
            const c = (args[1] == null || args[1] == "current" || args[1] == "c");
            if(c && serverIsPlaying == false) {
              const m1 = getSimpleEmbed("⚠️ Nothing is playing right now...");
              message.channel.send(m1);
              break;
            }
            const arg = 
              args[1] == null                        ? serverCurrentTrack     :
              args[1] == "current" || args[1] == "c" ? serverCurrentTrack     :
              args[1] == "first"   || args[1] == "f" ? 0                      :
              args[1] == "last"    || args[1] == "l" ? serverQueue.length - 1 :
                                                       parseInt(args[1]) - 1;
            const tsc = (arg == serverCurrentTrack && serverIsPlaying);
            const ts = tsc ? Math.floor(player.getTimeStamp(message)/1000) : null;
            const m1 = getReveal(serverQueue[arg], ts);
            message.channel.send(m1);
            break;
          }
          case "generate": {
            await player.addAMQ(message);
            break;
          }
          case "mal": {
            switch(args[1]) {
              case "list": {
                const usernames = player.getMALUsernames(message);

                if(usernames.length == 0) {
                  const m1 = getSimpleEmbed("⚠️ There are no usernames in the MAL list");
                  message.channel.send(m1);
                  break;
                }

                let val = "";

                usernames.forEach(username => {
                  val += `${username}, `;
                })

                val = val.substr(0, val.length - 2);

                const m1 = getSimpleEmbed(codify(val));
                message.channel.send(m1);
                break;
              }
              case "add": {
                await player.addMAL(message, args[2]);
                break;
              }
              case "del": {
                await player.delMAL(message, args[2]);
                break;
              }
              case "clear": {
                await player.clearMAL(message);
                break;
              }
              case "chance": {
                await player.setMALChance(message, parseFloat(args[2]));
                break;
              }
              default: {
                const mention = message.author.toString();
                const m1 = getSimpleEmbed(`⚠️ Please provide a valid command! [${mention}]`);
                message.channel.send(m1);
                break;
              }
            }
            break;
          }
          default: {
            const mention = message.author.toString();
            const m1 = getSimpleEmbed(`⚠️ Please provide a valid command! [${mention}]`);
            message.channel.send(m1);
            break;
          }
        }
        break;
      }
      default: {
        const mention = message.author.toString();
        const m1 = getSimpleEmbed(`⚠️ Please provide a valid command! [${mention}]`);
        message.channel.send(m1);
        break;
      }
    }

    // Resolve after the switch statement is complete, meaning command has been carried out
    resolve();
  })
});
//-->

//<-- event: onvoiceStateUpdate
client.on('voiceStateUpdate', (oldState, newState) => {
  // if nobody disconnected, then return
  if (oldState.channelID != oldState.guild.me.voice.channelID || newState.channel) return;

  // if there is only one person left (bot), then wait two seconds
  if (oldState.channel.members.size == 1)
    setTimeout(() => {
      // if there is still only one person left, then leave
      if (oldState.channel.members.size == 1)
        oldState.channel.leave();
    }, 2000);
});
//-->

//<-- event: onceready
client.once("ready", () => {
  console.log("Ready!");
})
//-->

client.login(token);
require('./server')();

