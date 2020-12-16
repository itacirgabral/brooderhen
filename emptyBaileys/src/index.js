const Redis = require('ioredis')
const { WAConnection } = require("@adiwajshing/baileys");

const getnewid = require('./getnewid')
const valetParking = require('./valetParking')
const wannaconn = require('./wannaconn')
const successful = require('./successful')

const idKey = 'zap:panoptics:slotid'
const newskey = 'zap:panoptics:slotnews'

const lastQrcodekey = id => `zap:slot-${id}:lasQrcode`
const credsKey = id => `zap:slot-${id}:creds`
const jidKey = id => `zap:slot-${id}:jid`

const NX = 'NX'
const EX = 'EX'
const expirationSeconds = process.env.EXPIRATION_SECONDS
const hardid = process.env.HARDID

console.log(`I'm ${hardid}`)

const redisurl = process.env.REDIS_CONN
const redis = new Redis(redisurl)
const pub = new Redis(redisurl)
const sub = new Redis(redisurl)

;(async () => {
  const id = await getnewid({ redis, idKey })
  console.log(`The slotid is ${id}`)

  sub.subscribe(newskey, async (err, count) => {
    if (!err) {
      let intervalId
      let connecting = false

      sub.on('message', async (_channel, message) => {
        console.log(`message=${message}`)
        const { type, ...obj } = JSON.parse(message)

        if (!connecting && type === 'showqrcode' && id === obj.id) {
          console.log('showqrcode')
          clearInterval(intervalId)
          connecting = true

          const WA = new WAConnection()
          WA.browserDescription = ['BROODERHEN', 'Chrome', '87']

          WA.on('connecting', async () => {
            console.log('connecting')
            await valetParking({ id, pub, newskey, step: 'connecting' })
          })
          WA.on('qr', async qr => {
            console.log('qr')
            await Promise.all([
              redis.set(lastQrcodekey(id), qr, NX, EX, expirationSeconds),
              valetParking({ id, pub, newskey, step: 'qr', qr })
            ])
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
            await Promise.all([
              redis.set(credsKey(id), creds, NX, EX, expirationSeconds),
              valetParking({ id, pub, newskey, step: 'credentials-updated', creds })
            ])
          })
          WA.on('connection-validated', async ({ jid }) => {
            console.log('connection-validated')
            await Promise.all([
              redis.set(jidKey(id), jid, NX, EX, expirationSeconds),
              valetParking({ id, pub, newskey, step: 'connection-validated', jid })
            ])
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
              connecting = false
              process.exit(0)
            }, 1000)
          })

          await WA.connect().catch(console.error)
        }
      })

      // while waiting announces myself
      await wannaconn({ pub, newskey, id, hardid })
      intervalId = setInterval(async () => {
        await wannaconn({ pub, newskey, id, hardid })
      }, 10000)
    }
  })
})().then()
