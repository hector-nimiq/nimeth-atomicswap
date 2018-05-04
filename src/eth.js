const fs = require('fs')
const Eth = require('web3-eth')
const eth = new Eth('https://mainnet.infura.io')
const HTLC_abi = require('../build/contracts/HTLC')
const HTLC_bin = fs.readFileSync(__dirname + '/../build/contracts/HTLC.bin').toString()

function addWallet(privKey) {
  return eth.accounts.wallet.add(privKey).address
}

async function deployHTLC(sender, recipient, hash) {
  console.log('Deploying ETH HTLC contract...');
  const HTLC = new eth.Contract(HTLC_abi)
  const contract = await HTLC.deploy({
    data: '0x' + HTLC_bin,
    arguments: [recipient, hash, 30]
  }).send({
    from: sender,
    gas: 1e6
  })
  return contract.options.address
}

async function verifyHTLC(address) {
  const contract = new eth.Contract(HTLC_abi, address)
  const hashSecret = await contract.methods.hashSecret().call()
  let unlockTime = await contract.methods.unlockTime().call()
  unlockTime = new Date(unlockTime * 1000)
  console.log(`Hash root     | ${hashSecret}`)
  console.log(`Unlock time   | ${unlockTime} (~ ${Math.max(0, Math.floor((unlockTime-Date.now())/6e4))} mins)`)
  return hashSecret
}

async function resolveHTLC(sender, address, secret) {
  const contract = new eth.Contract(HTLC_abi, address)
  await contract.methods.resolve(secret).send({
    from: sender,
    gas: 1e5
  })
}

async function waitForHTLC(address) {
  const contract = new eth.Contract(HTLC_abi, address)
  const unlockTime = await contract.methods.unlockTime().call()
  return new Promise((resolve, reject) => {
    const poll = setInterval(async function() {
      const secret = await contract.methods.secret().call()
      const block = await eth.getBlock('latest')
      if (secret !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        clearInterval(poll)
        resolve(secret)
      } else if (block.timestamp > unlockTime) {
        clearInterval(poll)
        reject('ETH HTLC timed out')
      }
    }, 5e3)
  })
}

async function refundHTLC(sender, address) {
  const contract = new eth.Contract(HTLC_abi, address)
  await contract.methods.refund().send({
    from: sender,
    gas: 1e5
  })
}

module.exports = {
  addWallet,
  deployHTLC,
  verifyHTLC,
  resolveHTLC,
  waitForHTLC,
  refundHTLC
}
