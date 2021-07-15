module.exports = {
  'help': {
    description: 'Show a command list, or help on one command',
    format: 'help, help [command]'
  },
  'play': {
    description: 'Play a specified song and add it to the queue',
    format: 'play [search query or link]'
  },
  'nowplaying': {
    description: 'Returns the description of the current song',
    format: 'nowplaying',
    aliases: ['np']
  },
  'song': {
    description: 'Returns the description of the song at \"position\"',
    format: 'song [position]'
  },
  'queue': {
    description: 'Displays the current queue',
    format: 'queue'
  },
  'skip': {
    description: 'Skips the current song',
    format: 'skip'
  },
  'prev': {
    description: 'Plays the previous song',
    format: 'prev'
  },
  'stop': {
    description: 'Stops playback and exits the VC',
    format: 'stop'
  },
  'jump': {
    description: 'Jumps to the song at \"position\"',
    format: 'jump [position]'
  },
  'remove': {
    description: 'Removes one song, or a range of songs',
    format: 'remove [position], remove [from] [to]'
  },
  'clear': {
    description: 'Clears the queue',
    format: 'clear'
  },
  'move': {
    description: 'Move song from \"from\" to \"to\"',
    format: 'move [from] [to]'
  },
  'pause': {
    description: 'Pauses playback',
    format: 'pause'
  },
  'resume': {
    description: 'Resumes playback',
    format: 'resume'
  },
  'volume': {
    description: 'Sets playback volume (1.0 is 100%, etc.)',
    format: 'volume [value]'
  },
  'seekto': {
    description: 'Seeks to \"seconds\" in the playback',
    format: 'seekto [seconds]'
  },
  'seek': {
    description: 'Seeks \"seconds\" seconds forward/backward',
    format: 'seek ±[seconds]'
  },
  'loop': {
    description: 'Set the loop to \"off\", \"track\" or \"queue\"',
    format: 'loop [type]'
  },
  'amq toggle': {
    description: 'Toggles AMQ mode (Anime Music Quiz)',
    format: 'amq, amq toggle'
  },
  'amq reveal': {
    description: 'Reveals an AMQ song',
    format: 'amq reveal, amq reveal [position]'
  },
  'amq generate': {
    description: 'Generates an AMQ song',
    format: 'amq generate'
  },
  'amq mal add': {
    description: 'Adds a MAL account',
    format: 'amq mal add [MyAnimeList Username]'
  },
  'amq mal del': {
    description: 'Removes a MAL account',
    format: 'amq mal del [MyAnimeList Username]'
  },
  'amq mal clear': {
    description: 'Removes all MAL accounts',
    format: 'amq mal clear'
  },
  'amq mal chance': {
    description: 'Sets the chance that AMQ will use MAL',
    format: 'amq mal chance [0.0 - 100.0]'
  },
  'amq mal list': {
    description: 'Lists all the usernames in the MAL list',
    format: 'amq mal list'
  }
}

