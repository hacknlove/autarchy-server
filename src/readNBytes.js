module.exports = async function readNBytes ({ socket, n }) {
  const buffer = socket.read(n)
  if (buffer) {
    return buffer
  }
  await new Promise(resolve => setTimeout(resolve))
  return readNBytes({ socket, n })
}