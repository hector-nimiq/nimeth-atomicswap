const {randomBytes} = require('crypto')
const Nimiq = require('@nimiq/core/dist/node')
const nim = require('./nim')
const eth = require('./eth')
const prompt = require('./prompt')

async function nimForEth() {
  const ethWallet = eth.addWallet(nim.getWalletPrivateKey())
  console.log('Local ETH wallet address =', ethWallet);
  let nimRecipient = await prompt('Enter NIM address of recipient: ')
  let value = await prompt('Enter NIM amount to send: ')
  value = parseFloat(value)
  const ethRecipient = await prompt('Enter ETH address to receive funds: ')
  const secret = randomBytes(32)
  console.log('Secret:', '0x' + Buffer.from(secret).toString('hex'));
  let hash = Nimiq.Hash.computeSha256(secret)
  const nimHtlcAddress = await nim.deployHTLC(nimRecipient, hash, value)
  hash = '0x' + Buffer.from(hash).toString('hex')
  const ethHtlcAddress = await eth.deployHTLC(ethWallet, ethRecipient, hash)
  console.log('NIM HTLC address:', nimHtlcAddress);
  console.log('ETH HTLC address:', ethHtlcAddress);
  console.log(`Enter 1 if agreed amount of ETH has been sent to ${ethHtlcAddress}`);
  let answer = await prompt('Or enter 2 to recover your NIM after the timeout (wait 1 hour): ')
  switch (answer) {
    case '1':
      await eth.resolveHTLC(ethWallet, ethHtlcAddress, '0x' + secret.toString('hex'))
      break
    case '2':
      nimRecipient = await prompt('Enter NIM address to receive funds: ')
      await nim.refundHTLC(nimHtlcAddress, nimRecipient)
      break
  }
}

module.exports = nimForEth
