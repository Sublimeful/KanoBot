const { MessageEmbed } = require("discord.js")
const commands = require("./help");
const config = require("./config");



function codify(str) {
  return `\`\`\`${str}\`\`\``;
}

function getTrack(track, title, timestamp) {
  // Timestamp is in seconds
  return {embed: {
    "color": Math.floor(Math.random() * 16777215),
    "footer": {
      "icon_url": "https://images-na.ssl-images-amazon.com/images/I/71a04y-NNgL.png",
      "text": `${timestamp != null ? formatTime(timestamp) : "--:--"}/${formatTime(track.duration)}`
    },
    "fields": [
      {
        "name": title,
        "value": `[${track.title}](${track.url}) [${track.requestor}]`
      }
    ],
    "thumbnail": {
      "url": track.thumbnail ? track.thumbnail : "https://i.pinimg.com/originals/a5/23/c9/a523c90df954c60bb327dfac20b65022.jpg"
    }
  }};
}

function formatTime(time) {
  const hh = Math.floor(time / 3600);
  const mm = Math.floor(time % 3600 / 60);
  const ss = time % 60;
  const formattedTime =
    (hh > 0  ? `${hh}:` : '') +
    (mm < 10 ? `0${mm}` : mm) + ":" +
    (ss < 10 ? `0${ss}` : ss);
  return formattedTime;
}

function getPrintableQueue(queue, currentTrack) {
  if(queue == null) return codify("Queue empty   ;(");
  if(queue.length == 0) return codify("Queue empty   ;(");

  var counter = 0;
  var message = "glsl\n";
  const charLimit = 34;

  queue.forEach(track => {
    const t = track.title, tL = track.title.length;
    var title = tL > charLimit ? t.substring(0, charLimit - 3) + "..." : t;
    title = title.padEnd(charLimit, " ");
    message += `${counter + 1}) ${title} ${formatTime(track.duration)}\n`;
    if(counter == currentTrack) {
      message += `    ⬑ current track\n`;
    }
    counter++;
  })

  return codify(message);
}

function getSong(track, timestamp) {
  if(track == null) return getSimpleEmbed("There is no song at this position...");
  
  return getTrack(track, "---------- Song ----------", timestamp);
}

function getNowPlaying(track, timestamp) {
  if(track == null) return getSimpleEmbed("Nothing is playing right now...");

  return getTrack(track, "Now Playing...", timestamp);
}

function getHelp(message, client, args) {
  let embed =  new MessageEmbed()
    .setTitle('HELP MENU')
    .setColor('GREEN')
    .setFooter(`Requested by: ${message.member ? message.member.displayName : message.author.username}`, message.author.displayAvatarURL())
    .setThumbnail(client.user.displayAvatarURL());
  if (!args[0])
    embed
      .setDescription(Object.keys(commands).map(command => `\`${command.padEnd(Object.keys(commands).reduce((a, b) => b.length > a.length ? b : a, '').length)}\` :: ${commands[command].description}`).join('\n'));
  else {
    if (Object.keys(commands).includes(args[0].toLowerCase()) || Object.keys(commands).map(c => commands[c].aliases || []).flat().includes(args[0].toLowerCase())) {
      let command = Object.keys(commands).includes(args[0].toLowerCase())? args[0].toLowerCase() : Object.keys(commands).find(c => commands[c].aliases && commands[c].aliases.includes(args[0].toLowerCase()));
      embed
        .setTitle(`COMMAND - ${command}`)

      if (commands[command].aliases)
        embed.addField('Command aliases', `\`${commands[command].aliases.join('`, `')}\``);
      embed
        .addField('DESCRIPTION', commands[command].description)
        .addField('FORMAT', `\`\`\`${config.prefix}${commands[command].format}\`\`\``);
    } else {
      embed
        .setColor('RED')
        .setDescription('This command does not exist. Please use the help command without specifying any commands to list them all.');
    }
  }
  return embed;
}

function getMoveEmbed(track, from, to) {
  return {
    "embed": {
      "color": Math.floor(Math.random() * 16777215),
      "description": `[${track.title}](${track.url}) [${track.requestor}] has moved position`,
      "fields": [
        {
          "name": "From:",
          "value": codify(from),
          "inline": true
        },
        {
          "name": "To:",
          "value": codify(to),
          "inline": true
        }
      ]
    }
  }
}

function getSimpleEmbed(description) {
  return {embed: {
    "color": Math.floor(Math.random() * 16777215),
    "description": description
  }};
}



module.exports = {
  "formatTime": formatTime,
  "codify": codify,
  "getPrintableQueue": getPrintableQueue,
  "getNowPlaying": getNowPlaying,
  "getSimpleEmbed": getSimpleEmbed,
  "getMoveEmbed": getMoveEmbed,
  "getSong": getSong,
  "getHelp": getHelp
}

