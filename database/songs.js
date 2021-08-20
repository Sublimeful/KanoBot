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
  // Set the hash of the song
  song.Id = hashSong(song);

  return knex("AnimeSongs").insert(song);
}

function getAnimeList() {
  return knex("AnimeSongs").select("MalId");
}

function getAllSongsFromAnime(malId) {
  return knex("AnimeSongs").where("MalId", malId);
}

function hasBeenAddedToDatabase(song) {
  return new Promise(async (resolve, _) => {
    resolve((await knex("AnimeSongs").where("Id", hashSong(song))).length !== 0);
  })
}

function delSong(id) {
  return knex("AnimeSongs").where("Id", id).del();
}

function updateSong(id, song) {
  return knex("AnimeSongs").where("Id", id).update(song);
}

function getRandomSong() {
  return new Promise(async(resolve, _) => {
    const songs = await knex("AnimeSongs").select("*");
    resolve(songs[Math.floor(songs.length * Math.random())]);
  })
}

module.exports = {
  getAnimeList,
  getAllSongs,
  getAllSongsFromAnime,
  hasBeenAddedToDatabase,
  getRandomSong,
  addSong,
  delSong,
  updateSong,
  hashSong
}
