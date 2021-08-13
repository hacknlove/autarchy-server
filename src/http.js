const crypto = require('crypto');
const { createServer } = require('net');
const getSocket = require('./channel')

const algorithm = 'aes-256-ctr';
const key = process.env.PASSWORD;
const secret = process.env.SECRET;

const http = createServer()

function start () {
  
  http.listen(process.env.PORT || 80)

  http.on('close', start)

  http.on('connection', proxy)
}

start()

async function proxy(incoming) {
  getSocket((channel, iv) => {
    const ivDown = crypto.createHash('sha256').update(secret).update(iv).digest();
    const ivUp = crypto.createHash('sha256').update(iv).update(secret).digest();

    const encrypt = crypto.createCipheriv(algorithm, key, ivDown) 
    const decrypt = crypto.createDecipheriv(algorithm, key, ivUp)

    incoming.pipe(encrypt).pipe(channel)
    channel.pipe(decrypt).pipe(incoming)
  })
}
