const express = require("express");
const app = express();

app.get('/', (_, res) => res.send('Server is up.'));

module.exports = () => {
  app.listen(3000);
}

app.use(express.static("database"));

app.use(express.urlencoded({
  extended: true
}))

app.post("/database", (req, res) => {
  console.log(req.body);
  

  res.redirect("/database.html");
})
