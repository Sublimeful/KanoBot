const knex = require("./knex")
const hash = require('object-hash');


function hashSong(song) {
  return hash.MD5({
    "MalId": song.MalId,
    "AnimeTitle": song.AnimeTitle,
    "SongUrl": song.SongUrl,
    "SongType": song.SongType
  })
}

function getAllSongs() {
  return knex("AnimeSongs").select("*");
}

function addSong(song) {
  song.Id = hashSong(song);
  return knex("AnimeSongs").insert(song);
}

function delSong(id) {
  return knex("AnimeSongs").where("Id", id).del();
}

function updateSong(id, song) {
  return knex("AnimeSongs").where("Id", id).update(song);
}

module.exports = {
  getAllSongs,
  addSong,
  delSong,
  updateSong,
  hashSong
}
