const crypto = require('crypto');
const { createServer } = require('net');
const { PassThrough } = require('stream');
const { getSocket } = require('./channel')

const algorithm = 'aes-256-ctr';
const password = process.env.PASSWORD;
const secret = process.env.SECRET;

const http = createServer()

function start () {
  
  http.listen(process.env.PORT || 80)

  http.on('close', start)

  http.on('connection', proxy)
}

start()

function sendMissingHost (incoming) {
  incoming.write("HTTP/1.1 404 Missing host\r\nServer: autarchy\r\n")
  incoming.end()
  return;
}
function send404 (incoming) {
  incoming.write("HTTP/1.1 404 Not Found\r\nServer: autarchy\r\n")
  incoming.end()
  return;
}

const hostRegExp = /^Host: (.*)(\r\n|\n)/

function getHost (incoming) {
  const readHeader = new PassThrough()
  incoming.pipe(readHeader)

  return new Promise(resolve => {
    let data = ''
    function end() {
      console.log('missing host')
      resolve(false)
    }

    function addChunk (chunk) {
      data += chunk.toString()
      const host = data.match(hostRegExp)
      if (host) {
        readHeader.off('data', addChunk)
        readHeader.off('end', end)
        resolve(host[1])
      }
    }
  
    readHeader.on('data', addChunk)
    readHeader.on('end', end)
  })
}

async function proxy(incoming) {
  const host = await getHost(incoming)

  if (!host) {
    return sendMissingHost(incoming)
  }

  getSocket(host, (channel, iv) => {
    if (!channel) {
      return send404(incoming)
    }
    const hash = crypto.createHash('sha512').update(secret).update(iv).update(password).digest() 
    const key = hash.slice(0, 32);
    const ivDown = hash.slice(32, 48);
    const ivUp = hash.slice(48, 64);

    const encrypt = crypto.createCipheriv(algorithm, key, ivDown) 
    const decrypt = crypto.createDecipheriv(algorithm, key, ivUp)

    incoming.pipe(encrypt).pipe(channel)
    channel.pipe(decrypt).pipe(incoming)
  })
}
