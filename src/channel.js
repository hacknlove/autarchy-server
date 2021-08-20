/* eslint-disable no-constant-condition */
const crypto = require('crypto')
const { createServer } = require('net')
const { hosts, domains } = require('./config')
const readNBytes = require('./readNBytes')

const algorithm = 'aes-256-ctr';
const channel = createServer({ pauseOnConnect: true })

async function handleConnection (socket) {
  const clientId = (await readNBytes({ socket, n: 8 })).toString()
  
  const host = hosts.get(clientId)

  if (!host) {
    socket.write('Bad clientId')
    socket.end()
    console.log('Bad clientId', clientId)
    return
  }

  if (host.socket) {
    return attachRequest(host, socket)
  }
  
  newClient(host, socket)
}

async function attachRequest (host, socket) {
  const requestId = (await readNBytes({ socket, n: 4 })).toString('hex')
  const iv = await readNBytes({ socket, n: 32 })
  const callback = host.requests.get(requestId)

  if (!callback) {
    console.log('no callback for', host.clientId, requestId)
    return socket.end()
  }

  const hash = crypto.createHash('sha512')
    .update(host.secret)
    .update(requestId)
    .update(iv)
    .digest()
  const key = hash.slice(0, 32);
  const ivDown = hash.slice(32, 48);
  const ivUp = hash.slice(48, 64);

  const encrypt = crypto.createCipheriv(algorithm, key, ivDown) 
  const decrypt = crypto.createDecipheriv(algorithm, key, ivUp)

  socket.resume()
  callback(socket, encrypt, decrypt)
}

function newClient (host, socket) {
  console.log('connected', host.clientId)

  host.socket = socket


  socket.on('close', () => {
    console.log('disconneted', socket.clientId)
    host.requests.forEach((callback) => callback())
    host.requests.clear()
    host.socket = null
  })
  socket.resume()
}

function main () {
  channel.on('connection', handleConnection)

  channel.on('close', () => {
    console.log('down')

    hosts.forEach((host) => {
      host.socket.end()
      host.socket = null
      host.requests.forEach(callback => callback())
      host.requests.clear()
    })

    listen()
  })
}

function listen () {
  channel.listen(process.env.CHANNEL)
  console.log('listening at', process.env.CHANNEL)
}

exports.getSocket = function getSocket(domain, callback) {
  const clientId = domains.get(domain)
  const host = hosts.get(clientId)

  if (!host || !host.socket) {
    return callback()
  }
  do {
    const requestId = crypto.randomBytes(4)
    if (host.requests.has(requestId)) {
      continue
    }
    host.requests.set(requestId.toString('hex'), callback)
    host.socket.write(requestId)
  } while(false)
}



main()
listen()
