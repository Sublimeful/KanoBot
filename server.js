const app = require('express')();

app.get('/', (_, res) => res.send('Server is up.'));

module.exports = () => {
  app.listen(3000);
}
