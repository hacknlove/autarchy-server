/* eslint-disable no-constant-condition */
const crypto = require('crypto')
const { createServer } = require('net')

const channel = createServer({ pauseOnConnect: true, allowHalfOpen : true })

const hosts = new Map()
const domains = new Map()

async function handleConnection (socket) {
  const id = socket.read(16)
  if (id === null) {
    await new Promise(resolve => setTimeout(resolve))
    return handleConnection(socket)
  }
  
  const oldHost = hosts.get(id)
  if (hosts.get(id)) {
    attachRequest(socket, oldHost.requests)
    return
  }

  console.log('connected', id.toString('hex'))

  const host = {
    socket,
    requests: new Map()
  }

  hosts.set(id, host)

  let data

  function addDomains (chunk) {
    data += chunk
    const domain = data.match(/^(.+)\n(.*)$/)
    if (!domain) {
      return
    }
    if (domain[1]) {
      domains.set(domain, id)
      data = domain[2]
      return
    }
    socket.off('data', addDomains);
  }

  socket.on('data', addDomains)

  socket.on('close', () => {
    console.log('disconneted', id)
    hosts[id].requestsFIFO.forEach(([callback]) => callback())
    delete hosts[id]
  })
}

function main () {
  channel.on('connection', handleConnection)

  channel.on('close', () => {
    console.log('down')

    Object.entries(hosts).forEach(([id, { requestsFIFO }]) => {
      delete hosts[id]
      requestsFIFO.forEach(([callback]) => callback)
    })

    listen()
  })
}

function listen () {
  channel.listen(process.env.CHANNEL)
  console.log('listening at', process.env.CHANNEL)
}


exports.getSocket = function getSocket(domain, callback) {
  const id = domains.get(domain)
  const host = hosts.get(id)

  if (!host) {
    return callback()
  }
  do {
    const requestId = crypto.randomBytes(4)
    if (host.requests.has(requestId)) {
      continue
    }
    host.requests.set(requestId, callback)
    host.socket.write(requestId)
  } while(false)
}

async function attachRequest (socket, requests) {
  let iv = socket.read(32)
  if (iv === null) {
    await new Promise(resolve => setTimeout(resolve))
    return handleConnection(socket)
  }

  const requestId = iv.subarray(0, 4)

  const callback = requests.get(requestId)

  if (!callback) {
    return socket.end()
  }

  socket.resume()
  callback(socket, iv)
}

main()
listen()
