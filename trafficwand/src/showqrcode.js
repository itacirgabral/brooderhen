
const showqrcode = async ({ newskey, id, pub}) => {
  const json = JSON.stringify({
    type: 'showqrcode',
    id
  })

  const published = await pub.publish(newskey, json)

  return published
}

module.exports = showqrcode