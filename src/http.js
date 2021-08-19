const crypto = require('crypto');
const { createServer } = require('net');
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

function send404 (incoming) {
  incoming.write("HTTP/2 404 Not Found\r\nServer: autarchy\r\nHTTP/2 404 Not Found\r\n\r\nNot Found\r\n\r\n")
  incoming.end()
  return;
}

async function proxy(incoming) {
  getSocket((channel, iv) => {
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
