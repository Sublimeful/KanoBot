const knex = require('knex');

const connectedKnex = knex({
  client: "sqlite3",
  connection: {
    filename: "src/database/db.sqlite3"
  },
  useNullAsDefault: true
})

module.exports = connectedKnex;
