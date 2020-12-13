const wannaconn = async ({ pub, newskey, id }) => {
  const wannaconn = JSON.stringify({ type: 'wannaconn', id })
  await pub.publish(newskey, wannaconn)
}

module.exports = wannaconn