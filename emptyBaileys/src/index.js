const Redis = require('ioredis')
const { WAConnection } = require("@adiwajshing/baileys");

const getnewid = require('./getnewid')
const valetParking = require('./valetParking')
const wannaconn = require('./wannaconn')
const successful = require('./successful')

const idKey = 'zap:slot:id'
const newskey = 'zap:slot:news'

const lastQrcodekey = id => `zap:slot-${id}:lasQrcode`
const credsKey = id => `zap:slot-${id}:creds`
const jidKey = id => `zap:slot-${id}:jid`

const NX = 'NX'
const EX = 'EX'
const expirationSeconds = process.env.EXPIRATION_SECONDS

const redisurl = process.env.REDIS_CONN
const redis = new Redis(redisurl)
const pub = new Redis(redisurl)
const sub = new Redis(redisurl)

let id
let intervalId
let connecting = false

;(async () => {
  // get an ephemeral id
  while (!id) {
    id = await getnewid({ redis, idKey })
  }
  console.log(`id=${id}`)

  sub.subscribe(newskey, (err, count) => {
    if (!err) {

      // wait for the command
      sub.on('message', async (_channel, message) => {
        console.log(message)
        const { type, ...obj } = JSON.parse(message)

        if (type === 'showqrcode' && id === obj.id && !connecting) {
          console.log('showqrcode')
          clearInterval(intervalId)
          connecting = true

          const WA = new WAConnection()
          WA.browserDescription = ['BROODERHEN', 'Chrome', '87']

          WA.on('connecting', () => {
            console.log('connecting')
            valetParking({ id, pub, newskey, step: 'connecting' })
          })
          WA.on('qr', async qr => {
            console.log('qr')
            await redis.set(lastQrcodekey(id), qr, NX, EX, expirationSeconds)
            valetParking({ id, pub, newskey, step: 'qr', qr })
          })
          WA.on('credentials-updated', async auth => {
            console.log('credentials-updated')
            const creds = JSON.stringify({
              clientID: auth.clientID,
              serverToken: auth.serverToken,
              clientToken: auth.clientToken,
              encKey: auth.encKey.toString('base64'),
              macKey: auth.macKey.toString('base64')
            })
            await redis.set(credsKey(id), creds, NX, EX, expirationSeconds)
            valetParking({ id, pub, newskey, step: 'credentials-updated', creds })
          })
          WA.on('connection-validated', async ({ jid }) => {
            console.log('connection-validated')
            await redis.set(jidKey(id), jid, NX, EX, expirationSeconds)
            valetParking({ id, pub, newskey, step: 'connection-validated', jid })
          })
          WA.on('open', async () => {
            console.log('open')
            valetParking({ id, pub, newskey, step: 'open' })
            
            const { creds, jid } = await successful({
              id,
              pub,
              redis,
              newskey,
              credsKey: credsKey(id),
              jidKey: jidKey(id)
            })

            console.log('successful')

            setTimeout(() => {
              console.log(`Baileys bye { creds: ${creds}, jid: ${jid} }`)
              WA.close()
              process.exit(0)
            }, 1000)
          })

          await WA.connect().catch(console.error)
        }
      })

      // while waiting announces myself
      wannaconn({ pub, newskey, id })
      intervalId = setInterval(() => {
        wannaconn({ pub, newskey, id })
      }, 10000)
    }
  })
})().then()
