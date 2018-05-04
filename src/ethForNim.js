const nim = require('./nim')
const eth = require('./eth')
const prompt = require('./prompt')

async function ethForNim() {
  const nimHtlcAddress = await prompt('Enter the NIM HTLC address: ')
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
  const secret = await eth.waitForHTLC(ethHtlcAddress)
    .catch(() => eth.refundHTLC(ethHtlcAddress))
  const nimRecipient = await prompt('Enter the NIM address to send the funds to: ')
  nim.resolveHTLC(nimHtlcAddress, nimRecipient, nimHashSecret, secret)
}

module.exports = ethForNim
