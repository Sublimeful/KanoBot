const { MessageEmbed } = require("discord.js")



function codify(str) {
  return `\`\`\`${str}\`\`\``;
}

function getTrack(track, title, timestamp) {
  // Timestamp is in seconds
  let value;
  if(track.amq && track.amq.revealed) {
    const title = `[${track.title}](${track.url})`;
    const requestor = `[${track.requestor}]`;
    const releaseDate = track.amq.releaseDate;
    const link = `[MyAnimeList](https://myanimelist.net/anime/${track.amq.malID})`;
    value = [title, requestor, releaseDate, link].join('\n');
  } else if(track.amq) {
    value = `${track.title} [${track.requestor}]`;
  } else {
    value = `[${track.title}](${track.url}) [${track.requestor}]`;
  }

  return {embed: {
    "color": Math.floor(Math.random() * 16777215),
    "footer": {
      "icon_url": "https://images-na.ssl-images-amazon.com/images/I/71a04y-NNgL.png",
      "text": `${timestamp !== null ? formatTime(timestamp) : "--:--"}/${isNaN(track.duration) ? "∞" : formatTime(track.duration)}`
    },
    "fields": [
      {
        "name": title,
        "value": value
      }
    ],
    "thumbnail": {
      "url": track.thumbnail && (!track.amq || (track.amq && track.amq.revealed)) ? track.thumbnail : 
            "https://i.pinimg.com/originals/a5/23/c9/a523c90df954c60bb327dfac20b65022.jpg"
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

function getPrintableQueue(queue, currentTrack, offset = 0) {
  const charLimit = 34;

  let message = "glsl\n";
  let counter = 0;

  message += queue.map(track => {
    const t = track.title;
    const tL = track.title.length;

    let title = 
      tL > charLimit ? `${t.substr(0, charLimit - 3)}...` : t;

    title = title.padEnd(charLimit, " ");

    const position = offset + (counter++);

    let r = `${position + 1}) ${title} ${formatTime(track.duration)}`;

    if(position === currentTrack)
      r += "\n    ⬑ current track";

    return r;
  })
  .join('\n');

  return codify(message);
}

async function printQueue(message, queue, currentTrack) {
  if(!queue || queue.length === 0) 
    return message.channel.send(codify("Queue empty   ;("));

  let currentPage = 0;

  const sliceAmount = 20;
  const embedSlices = [];

  for(let i = 0; i < queue.length; i += sliceAmount) {
    const slice = queue.slice(i, i + sliceAmount);
    const embed = new MessageEmbed();

    embed.setDescription(getPrintableQueue(slice, currentTrack, i));

    embedSlices.push(embed);
  }

  const m1 = `**Current Page: ${currentPage + 1}/${embedSlices.length}**`;
  const queueEmbed = await message.channel.send(m1, embedSlices[currentPage]);

  queueEmbed.react("⬅️");
  queueEmbed.react("➡️");
  queueEmbed.react("❌");

  const collector = queueEmbed.createReactionCollector((reaction, user) =>
    ["⬅️", "➡️", "❌"].includes(reaction.emoji.name) && (message.author.id === user.id)
  )

  collector.on('collect', async (reaction, user) => {
    switch(reaction.emoji.name) {
      case "➡️": {
        if(currentPage + 1 === embedSlices.length) break;

        currentPage++;

        const m = `**Current Page: ${currentPage + 1}/${embedSlices.length}**`;
        queueEmbed.edit(m, embedSlices[currentPage]);
        break;
      }
      case "⬅️": {
        if(currentPage === 0) break;
        
        currentPage--;

        const m = `**Current Page: ${currentPage + 1}/${embedSlices.length}**`;
        queueEmbed.edit(m, embedSlices[currentPage]);
        break;
      }
      case "❌": {
        collector.stop();
        await queueEmbed.delete();
        break;
      }
    }
  })
}

function getReveal(track, timestamp) {
  if(!track) return getSimpleEmbed("⚠️ There is no song at this position...");
  if(!track.amq) return getSimpleEmbed("⚠️ This is not an AMQ song...");

  track.amq.reveal();

  return getTrack(track, "---------- Reveal ----------", timestamp);
}

function getSong(track, timestamp) {
  if(!track) return getSimpleEmbed("⚠️ There is no song at this position...");
  
  return getTrack(track, "---------- Song ----------", timestamp);
}

function getNowPlaying(track, timestamp) {
  if(!track) return getSimpleEmbed("⚠️ Nothing is playing right now...");

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

  if (find === "") {
    embed
      .setDescription(commandNames.map(c => {
        return `\`${c.padEnd(longestCommand.length)}\` :: ${commands[c].description}`;
      }).join('\n'))

    return embed;
  }

  let command = commandNames.includes(find) ? find : commandNames.find(name => {
    return commands[name].aliases && commands[name].aliases.includes(find)
  })

  if (command !== undefined) {
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
  "printQueue": printQueue,
  "getNowPlaying": getNowPlaying,
  "getSimpleEmbed": getSimpleEmbed,
  "getMoveEmbed": getMoveEmbed,
  "getSong": getSong,
  "getHelp": getHelp,
  "getReveal": getReveal
}

