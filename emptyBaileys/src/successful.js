const successful = async ({ id, pub, redis, newskey, credsKey, jidKey }) => {
  const [creds, jid] =  await Promise.all([
    redis.get(credsKey),
    redis.get(jidKey)
  ])
  await pub.publish(newskey, JSON.stringify({ id, type: 'successful', creds, jid }))
  return { creds, jid }
}

module.exports = successful