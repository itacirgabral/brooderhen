const getnewid = async ({ redis, idKey }) => {
  const id = await redis.incr(idKey).catch(() => undefined)

  return id
}

module.exports = getnewid