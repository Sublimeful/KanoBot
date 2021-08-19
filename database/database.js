const knex = require("./knex")
const hash = require('object-hash');

function getAllSongs() {
  return knex("AnimeSongs").select("*");
}

function addSong(song) {
  return knex("AnimeSongs").insert(song);
}

function delSong(id) {
  
}

function updateSong(id, song) {
  
}


module.exports = {
  getAllSongs,
  addSong,
  delSong,
  updateSong
}
