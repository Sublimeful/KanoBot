const { Client } = require('discord.js');
const { prefix, token } = require("./config");
const { formatTime, codify, getPrintableQueue, getNowPlaying, getSimpleEmbed, getMoveEmbed, getSong, getHelp } = require("./formatter");

const Player = require("./discord-player");

const client = new Client();
const player = new Player();

var processor;



//<-- event: onnotification
player.on("notification", (message, type, data) => {
  switch(type) {
    case "trackStart":
      message.channel.send(getNowPlaying(data));
      break;
    case "trackAdded":
      message.channel.send(getSimpleEmbed(`Track added: [${data.title}](${data.url}) [${data.requestor}]`));
      break;
    case "disconnected":
      message.channel.send(getSimpleEmbed("🛑 Playback has been stopped because I have disconnected!"))
      break;
    case "clear":
      message.channel.send(getSimpleEmbed("🗑️ Cleared the queue!"))
      break;
    case "remove":
      message.channel.send(getSimpleEmbed(`${data.length} songs have been removed! These are the songs:`))
      message.channel.send(getPrintableQueue(data));
      break;
    case "move":
      message.channel.send(getMoveEmbed(data[0], data[1], data[2]));
      break;
    case "search":
      message.channel.send(getSimpleEmbed(`**----- Searching for -----** ${codify(data)}`));
      break;
    case "noResults":
      message.channel.send(getSimpleEmbed(`No results could be found for search query: ${codify(data)}`));
      break;
    case "pause":
      message.channel.send(getSimpleEmbed("⏸ Playback has been paused!"))
      break;
    case "resume":
      message.channel.send(getSimpleEmbed("▶️ Playback has been resumed!"))
      break;
    case "seekTo":
      message.channel.send(getSimpleEmbed(`**----- Seeked to -----** ${codify(formatTime(Math.floor(data/1000)))}`));
      break;
    case "setVolume":
      message.channel.send(getSimpleEmbed(`**----- New volume -----** ${codify(`${Math.floor(data * 100)}%`)}`));
      break;
    case "loop":
      message.channel.send(getSimpleEmbed(`**----- Loop -----** ${codify(data)}`));
      break;
    default:
      message.channel.send(getSimpleEmbed("How is this even possible?"));
  }
})
//-->

//<-- event: onerror
player.on("error", (message, reason) => {
  switch(reason) {
    case "voiceChannel":
      message.channel.send(getSimpleEmbed("You need to be in a voice channel to play music!"));
      break;
    case "permissions":
      message.channel.send(getSimpleEmbed("I need the permissions to join and speak in your voice channel!"));
      break;
    default:
      message.channel.send(getSimpleEmbed("How the fuck did this even happen?"));
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

  if(serverQueue == null) player.createContract(message);

  // Waits until the previous command is fully processed before continuing
  await processor;

  processor = new Promise(async (resolve, _) => {
    switch(command) {
      case "help":
        message.channel.send(getHelp(message, client, args));
        break;
      case "play":
        await player.execute(message, args.join(" "));
        break;
      case "nowplaying":
        if(!serverQueue) {
          message.channel.send(getNowPlaying(null));
          break;
        }
        message.channel.send(getNowPlaying(serverQueue[serverCurrentTrack]));
        break;
      case "song":
        if(!serverQueue) {
          message.channel.send(getSong(null));
          break;
        }
        message.channel.send(getSong(serverQueue[parseInt(args[0]) - 1]));
        break;
      case "queue":
        message.channel.send(getPrintableQueue(serverQueue, serverCurrentTrack));
        break;
      case "skip":
        await player.skip(message);
        break;
      case "prev":
        await player.prev(message);
        break;
      case "stop":
        await player.stop(message);
        break;
      case "jump":
        await player.jump(message, parseInt(args[0]) - 1);
        break;
      case "remove":
        const a1 = parseInt(args[0]) - 1;
        const a2 = parseInt(args[1]) - 1;
        await player.remove(message, a1, args.length < 2 ? a1 : a2);
        break;
      case "clear":
        await player.clear(message);
        break;
      case "move":
        await player.move(message, parseInt(args[0]) - 1, parseInt(args[1]) - 1);
        break;
      case "pause":
        await player.pause(message);
        break;
      case "resume":
        await player.resume(message);
        break;
      case "volume":
        await player.setVolume(message, parseFloat(args[0]));
        break;
      case "seekto":
        await player.seekTo(message, Math.floor(parseFloat(args[0]) * 1000));
        break;
      case "seek":
        await player.seek(message, Math.floor(parseFloat(args[0]) * 1000));
        break;
      case "loop":
        await player.loop(message, args[0]);
        break;
      default:
        message.channel.send(getSimpleEmbed(`Please provide a valid command! [${message.author.toString()}]`));
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

//<-- event: once ready
client.once("ready", () => {
  console.log("Ready!");
})
//-->

client.login(token);



require('./server')();

