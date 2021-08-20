const config = require('../config')

const hosts = new Map()
const domains = new Map()

Object.entries(config.clients).forEach(([ clientId, {domains: hostDomains, secret}]) => {
  hosts.set(clientId, {
    secret,
    clientId,
    requests: new Map()
  })
  hostDomains.forEach(domain => domains.set(domain, clientId))
})

exports.hosts = hosts
exports.domains = domains
