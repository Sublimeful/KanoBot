const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors")
const app = express();
const db = require("./database/songs");
const { port } = require("../config");

app.get('/', (_, res) => res.send(`Server is up on port ${port}`));

module.exports = () => {
  app.listen(port);
}

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("database/editor"))

app.get("/dbeditor", async (req, res) => {
  res.sendFile("database/editor/index.html", { root: __dirname });
})

app.get("/database", async (req, res) => {
  const songs = await db.getAllSongs();
  res.status(200).json({ songs });
})

app.get("/database/:malId", async (req, res) => {
  const songs = await db.getAllSongsFromAnime(req.params.malId);
  res.status(200).json({ songs });
})

app.get("/roulette", async (req, res) => {
  const song = await db.getRandomSong();
  res.status(202).json({ song });
})

app.get("/animelist", async (req, res) => {
  const animeList = await db.getAnimeList();
  res.status(203).json({ animeList });
})


app.post("/database_add", async (req, res) => {
  // Prevent duplicate songs from being added to the database
  if(await db.hasBeenAddedToDatabase(req.body)) {
    return res.send("Song is already in database!");
  }

  const results = await db.addSong(req.body);
  res.redirect("/dbeditor");
})

app.post("/database_del", async(req, res) => {
  const results = await db.delSong(req.body.id);
  res.redirect("/dbeditor");
})
