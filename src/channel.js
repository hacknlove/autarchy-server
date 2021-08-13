const crypto = require('crypto')
const { createServer } = require('net')

const channel = createServer()

const requestsFIFO = []

let socket

function start () {
  
  channel.on('connection', c => {
    if (socket) {
      attachRequest(c)
    }
    socket = c
    console.log('connected')
  })

  channel.on('close', () => {
    console.log('down')
    socket = null
    start();
  })


  channel.listen(process.env.CHANNEL)
  
  console.log('listening at', process.env.CHANNEL)
}

const ivGenerator = (function* getIv () {
  let iv
  let clearIv
  while (true) {
    iv = iv || crypto.randomBytes(64)
    clearTimeout(clearIv)
    clearIv = setTimeout(() => iv = null, 100)
    yield iv
  }
})()

exports.getSocket = function getSocket(callback) {
  const { value: iv } = ivGenerator.next()

  requestsFIFO.push([callback, iv])

  socket.write(iv)
}

function attachRequest (c) {
  if (c.remoteAddress !== socket.remoteAddress) {
    return c.end()
  }

  const request = requestsFIFO.shift()

  if (!request) {
    return c.end()
  }

  const [callback, iv] = request

  callback(c, iv)
}

start()