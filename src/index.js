const nim = require('./nim')
const nimForEth = require('./nimForEth')
const ethForNim = require('./ethForNim')
const prompt = require('./prompt')

async function main() {
  await nim.connect()
  const answer = await prompt('Enter 1 to send NIM for ETH, or 2 to receive NIM for ETH: ')
  switch (answer) {
    case '1':
      await nimForEth()
      break
    case '2':
      await ethForNim()
      break
  }
  process.exit()
}

main().catch(err => {
  console.log(err);
  process.exit(1)
})
