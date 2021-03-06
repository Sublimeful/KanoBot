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
    description: 'Returns the description of a song',
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
  'shuffle': {
    description: 'Shuffles the queue',
    format: 'shuffle'
  },
  'loop': {
    description: 'Set the loop to \"off\", \"track\" or \"queue\"',
    format: 'loop [type]'
  },
  'autoplay': {
    description: 'Toggles autoplay mode',
    format: 'autoplay',
    aliases: ['ap']
  },
  'autoplay rng': {
    description: 'Sets the randomness of autoplayed videos',
    format: 'autoplay rng [integer ≥0]'
  },
  'autoplay unique': {
    description: 'Whether autoplay will play unique tracks',
    format: 'autoplay unique'
  },
  'reveal': {
    description: 'Reveals an AMQ song',
    format: 'reveal, reveal [position]'
  },
  'autoreveal': {
    description: 'Toggles whether to automatically reveal an AMQ song when guessmode is off',
    format: 'autoreveal'
  },
  'guess': {
    description: 'Guess the currently playing AMQ track',
    format: 'guess [guess]'
  },
  'guesstime': {
    description: 'Sets the guess time',
    format: 'guesstime [time (seconds)]'
  },
  'guessmode': {
    description: 'Toggle guessing mode',
    format: 'guessmode'
  },
  'amq': {
    description: 'Toggles AMQ mode (Anime Music Quiz)',
    format: 'amq'
  },
  'amq generate [malId]': {
    description: 'Generates an AMQ song, or song from a specified anime',
    format: 'amq generate, amq generate [MyAnimeList Id]'
  },
  'mal add': {
    description: 'Adds a MAL account',
    format: 'mal add [MyAnimeList Username]'
  },
  'mal del': {
    description: 'Removes a MAL account',
    format: 'mal del [MyAnimeList Username]'
  },
  'mal clear': {
    description: 'Removes all MAL accounts',
    format: 'mal clear'
  },
  'mal chance': {
    description: 'Sets the chance that AMQ will use MAL',
    format: 'mal chance [0.0 - 100.0]'
  },
  'mal list': {
    description: 'Lists all the usernames in the MAL list',
    format: 'mal list'
  }
}

