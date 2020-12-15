const WebSocket = require('ws')
const Redis = require('ioredis')
const jsonwebtoken = require('jsonwebtoken')

const wss = new WebSocket.Server({ port: 8081 })
const sub = new Redis(process.env.REDIS_CONN)

const jwtSecret = process.env.JWT_SECRET
const userAdm = process.env.USER_ADM

wss.on('connection', function connection(ws, req) {
  const jwt = req.url.slice(1)
  console.log(jwt)
  try {
    jsonwebtoken.verify(jwt, jwtSecret)
    ws.on('message', function incoming(message) {
      console.log('received: %s', message)
      setTimeout(() => {
        ws.send(JSON.stringify({ message }))
      }, 1000)
    })
    ws.send('something')
  } catch {
    ws.close()
  }
})

const newskey = 'zap:slot:news'
sub.subscribe(newskey, (err, count) => {
  if (!err) {
    sub.on('message', async (_channel, message) => {
      const { id, type, progress, qr } = JSON.parse(message)
      if (type === 'valet-parking' && progress === 2){
        wss.clients.forEach(function each(client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ id, type, progress, qr }));
          }
        });
      }
    })
  }
})