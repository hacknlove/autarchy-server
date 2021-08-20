const { createServer } = require('net')
const { getSocket } = require('./channel')
const ReadableStreamClone = require("readable-stream-clone")
const { PassThrough } = require('stream')
const readNBytes = require('./readNBytes')

const rawHttp = createServer()

function start () {
  
  rawHttp.listen(process.env.PORT || 80)

  rawHttp.on('close', start)

  rawHttp.on('connection', proxy)
}

start()

function sendMissingHost (incoming) {
  incoming.write("HTTP/1.1 404 Missing host\r\nServer: autarchy\r\n")
  incoming.end()
}
function send404 (incoming) {
  incoming.write("HTTP/1.1 404 Not Found\r\nServer: autarchy\r\n\r\nNot found")
  incoming.end()
}

const hostRegExp = /^Host: (.*)(\r\n|\n)/im

async function getHost (incoming) {
  const readHeader = new PassThrough()
  incoming.pipe(readHeader)
  const data = (await readNBytes({ socket: readHeader, n: undefined })).toString()
  
  const host = data.match(hostRegExp)

  return host[1]
}

async function proxy(socket) {
  const incomming = new ReadableStreamClone(socket)
  const host = await getHost(new ReadableStreamClone(socket))

  if (!host) {
    return sendMissingHost(socket)
  }

  getSocket(host, (channel, encrypt, decrypt) => {
    if (!channel) {
      console.log('404')
      return send404(socket)
    }

    incomming.pipe(encrypt).pipe(channel)
    channel.pipe(decrypt).pipe(socket)
  })
}
