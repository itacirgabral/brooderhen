const wannaconn = ({ pub, newskey, id }) => {
  const wannaconn = JSON.stringify({ type: 'wannaconn', id })
  pub.publish(newskey, wannaconn)
}

module.exports = wannaconn