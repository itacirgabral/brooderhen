const Redis = require('ioredis')
const { WAConnection } = require("@adiwajshing/baileys");

const getnewid = require('./getnewid')
const valetParking = require('./valetParking')
const wannaconn = require('./wannaconn')
const successful = require('./successful')

const slotidKey = 'zap:panoptics:slotid'
const newskey = 'zap:panoptics:slotnews'

const lastQrcodekey = x => `zap:slot-${x}:lasQrcode`
const credsKey = x => `zap:slot-${x}:creds`
const jidKey = x => `zap:slot-${x}:jid`

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
  const slotid = await getnewid({ redis, slotidKey })
  console.log(`The slotid is ${slotid}`)

  sub.subscribe(newskey, async (err, count) => {
    if (!err) {
      let intervalId
      let connecting = false

      sub.on('message', async (_channel, message) => {
        console.log(`message=${message}`)
        const { type, ...obj } = JSON.parse(message)

        if (!connecting && type === 'showqrcode' && slotid === obj.slotid) {
          console.log('showqrcode')
          clearInterval(intervalId)
          connecting = true

          const WA = new WAConnection()
          WA.browserDescription = ['BROODERHEN', 'Chrome', '87']

          WA.on('connecting', async () => {
            console.log('connecting')
            await valetParking({ slotid, pub, newskey, step: 'connecting' })
          })
          WA.on('qr', async qr => {
            console.log('qr')
            await Promise.all([
              redis.set(lastQrcodekey(slotid), qr, NX, EX, expirationSeconds),
              valetParking({ slotid, pub, newskey, step: 'qr', qr })
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
              redis.set(credsKey(slotid), creds, NX, EX, expirationSeconds),
              valetParking({ slotid, pub, newskey, step: 'credentials-updated', creds })
            ])
          })
          WA.on('connection-validated', async ({ jid }) => {
            console.log('connection-validated')
            await Promise.all([
              redis.set(jidKey(slotid), jid, NX, EX, expirationSeconds),
              valetParking({ slotid, pub, newskey, step: 'connection-validated', jid })
            ])
          })
          WA.on('open', async () => {
            console.log('open')
            valetParking({ slotid, pub, newskey, step: 'open' })
            
            const { creds, jid } = await successful({
              slotid,
              pub,
              redis,
              newskey,
              credsKey: credsKey(slotid),
              jidKey: jidKey(slotid)
            })

            console.log('successful')

            setTimeout(() => {
              console.log(`Baileys bye { creds: ${creds}, jid: ${jid} }`)
              WA.close()
              connecting = false
              process.exit(0)
            }, 20000)
          })

          await WA.connect().catch(console.error)
        }
      })

      // while waiting announces myself
      await wannaconn({ pub, newskey, slotid, hardid })
      intervalId = setInterval(async () => {
        await wannaconn({ pub, newskey, slotid, hardid })
      }, 10000)
    }
  })
})().then()
