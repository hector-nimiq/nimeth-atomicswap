const Nimiq = require('@nimiq/core/dist/node')
const nim = require('./nim')
const eth = require('./eth')
const prompt = require('./prompt')

async function ethForNim() {
  let nimHtlcAddress = await prompt('Enter the NIM HTLC address: ')
  nimHtlcAddress = Nimiq.Address.fromString(nimHtlcAddress)
  const ethHtlcAddress = await prompt('Enter the ETH HTLC address: ')
  console.log('\nNIM HTLC:');
  const nimHashSecret = await nim.verifyHTLC(nimHtlcAddress)
  console.log('\nETH HTLC:');
  const ethHashSecret = await eth.verifyHTLC(ethHtlcAddress)
  if (nimHashSecret !== ethHashSecret) {
    throw "Hashes don't match"
  }
  console.log(`\nIf details are correct then send the agreed amount of ETH to ${ethHtlcAddress}`);
  console.log('Waiting for ETH contract to be resolved...');
  await eth.waitForHTLC(ethHtlcAddress)
    .then(secret => nim.resolveHTLC(nimHtlcAddress, secret))
    .catch(() => eth.refundHTLC(ethHtlcAddress))
}

module.exports = ethForNim
