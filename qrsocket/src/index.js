const WebSocket = require('ws')
const Redis = require('ioredis')

const wss = new WebSocket.Server({ port: 8081 })
const sub = new Redis(process.env.REDIS_CONN)

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message)
    setTimeout(() => {
      ws.send(JSON.stringify({ message }))
    }, 1000)
  })

  ws.send('something')
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