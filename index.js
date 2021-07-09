const { Client } = require('discord.js');
const { prefix, token } = require("./config");
const Player = require("./discord-player");

const client = new Client();
const player = new Player();

//player.on("trackStart", (message, track) => message.channel.send(`Now playing ${track.title}...`));


//<-- event: onmessage
client.on("message", async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  switch(command) {
    case "play":
      player.play(message, args[0]);
      break;
    default:
      message.channel.send("```You need to enter a valid command!```");
  }
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

