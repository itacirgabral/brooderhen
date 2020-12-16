const getnewid = async ({ redis, slotidKey }) => {
  const slotid = await redis.incr(slotidKey).catch(() => undefined)

  return slotid
}

module.exports = getnewid