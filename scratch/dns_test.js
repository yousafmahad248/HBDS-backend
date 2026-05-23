const dns = require('dns').promises;
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8']);

const hostname = '_mongodb._tcp.cluster0.uijdfe6.mongodb.net';

async function testDNS() {
  try {
    const addresses = await resolver.resolveSrv(hostname);
    console.log('DNS Srv resolution success with Google DNS:', addresses);
  } catch (err) {
    console.error('DNS Srv resolution error with Google DNS:', err);
  }
}

testDNS();
