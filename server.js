const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const db = require("./database/songs");

app.get('/', (_, res) => res.send('Server is up.'));

module.exports = () => {
  app.listen(3000);
}

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

app.post("/database_add", async (req, res) => {
  const results = await db.addSong(req.body);
  res.redirect("/dbeditor");
})


app.post("/database_del", async(req, res) => {
  const results = await db.delSong(req.body.id);
  res.redirect("/dbeditor");
})
