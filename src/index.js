const nim = require('./nim')
const nimForEth = require('./nimForEth')
const ethForNim = require('./ethForNim')
const prompt = require('./prompt')

async function main() {
  await nim.connect()
  console.log('Enter 1 to send NIM for ETH');
  console.log('      2 to receive NIM for ETH');
  console.log('   or 3 to recover locked NIM');
  const answer = await prompt('> ')
  switch (answer) {
    case '1':
      await nimForEth()
      break
    case '2':
      await ethForNim()
      break
    case '3':
      const nimHtlcAddress = await prompt('Enter the NIM HTLC address: ')
      await nim.verifyHTLC(nimHtlcAddress)
      const nimRecipient = await prompt('Enter NIM address to receive funds: ')
      await nim.refundHTLC(nimHtlcAddress, nimRecipient)
      break
  }
  process.exit()
}

main().catch(err => {
  console.log(err);
  process.exit(1)
})
