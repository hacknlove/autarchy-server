const crypto = require('crypto')
const { createServer } = require('net')

const channel = createServer()

const requestsFIFO = []

let socket

function start () {
  
  channel.on('connection', c => {
    if (socket) {
      return attachRequest(c)
    }
    socket = c
    console.log('connected')

    c.on('close', () => {
      console.log('disconneted')
      socket = null
      requestsFIFO.length = 0     
    })
  })

  channel.on('close', () => {
    console.log('down')
    socket = null
    requestsFIFO.length = 0
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
  if (!socket) {
    return callback()
  }
  const { value: iv } = ivGenerator.next()

  requestsFIFO.push([callback, iv])

  socket.write(iv)
}

function attachRequest (c) {
  console.log(c.remoteAddress, socket.remoteAddress)
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