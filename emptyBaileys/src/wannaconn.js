const wannaconn = async ({ pub, newskey, id, hardid }) => {
  console.log('wannaconn')
  const wannaconn = JSON.stringify({ type: 'wannaconn', id, hardid })
  await pub.publish(newskey, wannaconn)
}

module.exports = wannaconn