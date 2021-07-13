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
    format: 'nowplaying'
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
    description: 'Sets playback volume (1.0 is 100%, 0.5 is 50%, etc.)',
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
  'amq': {
    description: 'Toggles AMQ mode, or reveal an AMQ song',
    format: 'amq, amq reveal, amq reveal [position]'
  }
}

