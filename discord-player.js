const ytdl = require("ytdl-core");
const fetch = require("node-fetch")

class Player {
  constructor(client) {
    this.servers = {};
    this.client = client;
  }

  /* Establish a connection to the user's call, and add the server to the server list */
  async join(message) {
    // return FALSE if the user is not in a VC or if there is no permissions
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      message.channel.send("You need to be in a voice channel to play music!");
      return false;
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      message.channel.send("I need the permissions to join and speak in your voice channel!");
      return false;
    }

    // Create the contract for the server
    if(!this.servers[message.guild.id]) {
      this.servers[message.guild.id] = {
        queue: {},
        connection: null,
        volume: 1.0
      }
    }

    // Attempt to join the VC and establish a connection
    const server = this.servers[message.guild.id];
    try {
      const connection = await voiceChannel.join();
      server.connection = connection;

      // When the connection has been cut(or disconnected), set the connection to null
      server.connection.on("disconnect", () => {
        server.connection = null;
      })

      return true;
    } catch(err) {
      console.log(err);
      return false;
    }
  }

  async play(message, query) {
    // Don't play anything if is not in VC
    const isConnected = await this.join(message);
    if(!isConnected) return;

    const server = this.servers[message.guild.id];


    // Is Youtube link
    if(ytdl.validateURL(query)) {
      
    } else {
      // Tests if query is a media link; else it is just a normal query
      var isMedia = false;

      try {
        const res = await fetch(query);
        const contentType = res.headers.get("Content-Type");
        if(contentType) {
          isMedia = true;
        }
      } catch(err) {}

      if(isMedia) {
        server.connection.play(query);

        
      } else {
        
      }
    }
      

      
    




  }
}

module.exports = Player;
