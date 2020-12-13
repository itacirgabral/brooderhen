const Redis = require("ioredis")

const newskey = 'zap:slot:news'
const persistCreds = process.env.PERSIST_CREDS  === 'true' ? true : false
const overwriteCreds = process.env.PERSIST_CREDS  === 'true' ? true : false

const redisurl = process.env.REDIS_CONN
const redis = new Redis(redisurl)
const pub = new Redis(redisurl)
const sub = new Redis(redisurl)

const credsKey = id => `zap:${id}:creds`
const NX = 'NX'

const showqrcode = require('./showqrcode')

const clientsWaitingForConnection = [
  {
    jid: process.env.JID,
    hasApplicant: false
  }
]

sub.subscribe(newskey, (err, _count) => {
  if (!err) {
    sub.on("message", async (_channel, message) => {
      const { type, id, creds, jid } = JSON.parse(message)

      console.log(message)
      if (type === 'wannaconn') {
        console.log(`id=${id} wants a conn!`)

        const client = clientsWaitingForConnection.find(el => !el.hasApplicant)

        if (client) {
          console.log(`id=${id} get the job \o/`)
          client.hasApplicant = true

          await showqrcode({ newskey, id, pub })
        }
      } else if (type === 'successful') {
        console.log('new conn sloted ')
        
        if (persistCreds && jid === process.env.JID) {
          const key = jid.split('@s.whatsapp.net')[0]
          await redis.set(credsKey(key), JSON.stringify(creds), overwriteCreds ? undefined : NX)
          console.log(`zap:${key}:creds`)

          const clientIndex = clientsWaitingForConnection.findIndex(el => el.jid === jid)
          clientsWaitingForConnection.splice(clientIndex, 1)
        } else {
          console.log('not the same jid')
        }
      }
    })
  } else {
    console.error(err)
  }
})