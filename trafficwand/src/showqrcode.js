
const showqrcode = async ({ newskey, slotid, pub}) => {
  const json = JSON.stringify({
    type: 'showqrcode',
    slotid
  })

  const published = await pub.publish(newskey, json)

  return published
}

module.exports = showqrcode