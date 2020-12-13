const valetParking = async ({ id, pub, newskey, step, qr, creds, jid }) => {
  switch (step) {
    case 'connecting':
      await pub.publish(newskey, JSON.stringify({ id, type: 'valet-parking', progress: 1 }))
    break;
    case 'qr':
      await pub.publish(newskey, JSON.stringify({ id, type: 'valet-parking', progress: 2, qr }))
    break;
    case 'credentials-updated':
      await pub.publish(newskey, JSON.stringify({ id, type: 'valet-parking', progress: 3, creds }))
    break;
    case 'connection-validated':
      await pub.publish(newskey, JSON.stringify({ id, type: 'valet-parking', progress: 4, jid }))
    break;
    case 'open':
      await pub.publish(newskey, JSON.stringify({ id, type: 'valet-parking', progress: 5 }))
    break;
  }
}

module.exports = valetParking