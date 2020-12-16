const wannaconn = async ({ pub, newskey, slotid, hardid }) => {
  console.log('wannaconn')
  const wannaconn = JSON.stringify({ type: 'wannaconn', slotid, hardid })
  await pub.publish(newskey, wannaconn)
}

module.exports = wannaconn