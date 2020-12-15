const client = url => {
  const ws = new WebSocket(url)
  return ws
}

export {
  client
}
