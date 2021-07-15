const { MessageEmbed } = require("discord.js")



function codify(str) {
  return `\`\`\`${str}\`\`\``;
}

function getTrack(track, title, timestamp, reveal = false) {
  // Timestamp is in seconds
  let value;
  if(track.amq && reveal) {
    const rS = track.amq.releaseSeason;
    const rY = track.amq.releaseYear;

    value =  `[${track.amq.animeTitle} - ${track.title.substr(19)}](${track.url}) `;
    value += `[${track.requestor}]`;
    value += `\n`;
    value += `${rS[0].toUpperCase() + rS.substr(1)} ${rY}`;
    value += `\n`;
    value += `[MyAnimeList](https://myanimelist.net/anime/${track.amq.malID})`;
  } else if(track.amq) {
    value = `${track.title} [${track.requestor}]`;
  } else {
    value = `[${track.title}](${track.url}) [${track.requestor}]`;
  }

  return {embed: {
    "color": Math.floor(Math.random() * 16777215),
    "footer": {
      "icon_url": "https://images-na.ssl-images-amazon.com/images/I/71a04y-NNgL.png",
      "text": `${timestamp != null ? formatTime(timestamp) : "--:--"}/${isNaN(track.duration) ? "∞" : formatTime(track.duration)}`
    },
    "fields": [
      {
        "name": title,
        "value": value
      }
    ],
    "thumbnail": {
      "url": track.thumbnail && track.amq == null ? track.thumbnail : "https://i.pinimg.com/originals/a5/23/c9/a523c90df954c60bb327dfac20b65022.jpg"
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

  let counter = 0;
  let message = "glsl\n";
  const charLimit = 34;

  queue.forEach(track => {
    const t = track.title, tL = track.title.length;
    let title = tL > charLimit ? t.substring(0, charLimit - 3) + "..." : t;
    title = title.padEnd(charLimit, " ");
    message += `${counter + 1}) ${title} ${formatTime(track.duration)}\n`;
    if(counter == currentTrack) {
      message += `    ⬑ current track\n`;
    }
    counter++;
  })

  return codify(message);
}

function getReveal(track, timestamp) {
  if(track == null) return getSimpleEmbed("⚠️ There is no song at this position...");
  if(track.amq == null) return getSimpleEmbed("⚠️ This is not an AMQ song...");

  return getTrack(track, `"${track.amq.songName}"`, timestamp, reveal = true);
}

function getSong(track, timestamp) {
  if(track == null) return getSimpleEmbed("⚠️ There is no song at this position...");
  
  return getTrack(track, "---------- Song ----------", timestamp);
}

function getNowPlaying(track, timestamp) {
  if(track == null) return getSimpleEmbed("⚠️ Nothing is playing right now...");

  return getTrack(track, "Now Playing...", timestamp);
}

function getHelp(message, client, arg) {
  let embed = new MessageEmbed();

  const commands = require("./help");
  const commandNames = Object.keys(commands);
  const longestCommand = Object.keys(commands).reduce((a, b) => b.length > a.length ? b : a, '');

  const find = arg.toLowerCase();
  const requestor = message.member ? message.member.displayName : message.author.username;
    
  embed
    .setTitle('HELP MENU')
    .setColor('GREEN')
    .setFooter(`Requested by: ${requestor}`, message.author.displayAvatarURL())
    .setThumbnail(client.user.displayAvatarURL())

  if (find == "") {
    embed
      .setDescription(commandNames.map(c => {
        return `\`${c.padEnd(longestCommand.length)}\` :: ${commands[c].description}`;
      }).join('\n'))

    return embed;
  }

  let command = commandNames.includes(find) ? find : commandNames.find(name => {
    return commands[name].aliases && commands[name].aliases.includes(find)
  })

  if (command != undefined) {
    embed
      .setTitle(`COMMAND - ${command}`)

    if (commands[command].aliases)
      embed.addField('Command aliases', `\`${commands[command].aliases.join('`, `')}\``);

    embed
      .addField('DESCRIPTION', commands[command].description)
      .addField('FORMAT', `\`\`\`${commands[command].format}\`\`\``);

    return embed;
  }

  embed
    .setColor('RED')
    .setDescription('This command does not exist. Please use the help command without specifying any commands to list them all.');

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
  "getHelp": getHelp,
  "getReveal": getReveal
}

