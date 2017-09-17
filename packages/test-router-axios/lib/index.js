const Axios = require('axios-serve')

const app = require('@daub/server/lib/app')

const { MongoDBServer } = require('mongomem')
const db = require('@daub/db')

function Request (middleware) {
  app.db = db

  app.context.models = db.models
  app.context.config = {}

  app.use(middleware(app))

  const axios = Axios.createServer(app.callback())

  axios.app = app

  return axios
}

module.exports = Request

module.exports.loadDb = async function () {
  await MongoDBServer.start()
  const url = await MongoDBServer.getConnectionString()
  return db.connect(url)
}
