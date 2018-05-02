const fs = require('fs')
const Eth = require('web3-eth')
const eth = new Eth('https://ropsten.infura.io')
const Nimiq = require('@nimiq/core/dist/node')
const readline = require('readline')
const {randomBytes} = require('crypto')
const HTLC_abi = require('./HTLC')
const HTLC_bin = fs.readFileSync('./HTLC.bin').toString()

const NETWORK = 'test'
const TAG = 'Nimiq'
const $ = {}

async function nimiqConnect() {
  Nimiq.GenesisConfig.init(Nimiq.GenesisConfig.CONFIGS[NETWORK])
  const networkConfig = new Nimiq.DumbNetworkConfig()
  $.consensus = await Nimiq.Consensus.nano(networkConfig)
  $.blockchain = $.consensus.blockchain
  $.accounts = $.blockchain.accounts
  $.mempool = $.consensus.mempool
  $.network = $.consensus.network

  $.walletStore = await new Nimiq.WalletStore()
  $.wallet = await $.walletStore.getDefault()
  const addresses = await $.walletStore.list()
  Nimiq.Log.i(TAG, `Managing wallets [${addresses.map(address => address.toUserFriendlyAddress())}]`);

  return new Promise(resolve => {
    $.consensus.on('established', () => {
      Nimiq.Log.i(TAG, `Current state: height=${$.blockchain.height}, headHash=${$.blockchain.headHash}`);
      resolve()
    });
    Nimiq.Log.i(TAG, 'Connecting, please wait...')
    $.network.connect()
  })
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve => rl.question(question, answer => {
    rl.close()
    resolve(answer)
  }))
}

function generateHtlcTransaction(sender, recipient, hash, value, timeout) {
  const hashAlgo = Nimiq.Hash.Algorithm['SHA256']
  const hashCount = 1
  value = Nimiq.Policy.coinsToSatoshis(value)
  timeout = $.blockchain.height + timeout
  const bufferSize = sender.serializedSize
    + recipient.serializedSize
    + /* hashAlgo */ 1
    + hash.byteLength
    + /* hashCount */ 1
    + /* timeout */ 4;
  const buffer = new Nimiq.SerialBuffer(bufferSize);
  sender.serialize(buffer);
  recipient.serialize(buffer);
  buffer.writeUint8(hashAlgo);
  buffer.write(hash);
  buffer.writeUint8(hashCount);
  buffer.writeUint32(timeout);

  recipient = Nimiq.Address.CONTRACT_CREATION;
  recipientType = Nimiq.Account.Type.HTLC;
  const flags = Nimiq.Transaction.Flag.CONTRACT_CREATION;
  return new Nimiq.ExtendedTransaction(sender, Nimiq.Account.Type.BASIC, recipient, recipientType,
    value, 0, $.blockchain.height + 1, flags, buffer);
}

function waitForConfirmation(tx) {
  return new Promise(resolve => {
    $.consensus.subscribeAccounts([tx.recipient])
    const id = $.mempool.on('transaction-mined', tx2 => {
      if (tx.equals(tx2)) {
        $.mempool.off('transaction-mined', id)
        resolve()
      }
    })
  })
}

async function deployNimHTLC(recipient, hash, value) {
  const tx = generateHtlcTransaction($.wallet.address, recipient, hash, value, 30)
  tx.proof = Nimiq.SignatureProof.singleSig($.wallet.publicKey, Nimiq.Signature.create($.wallet.keyPair.privateKey, $.wallet.publicKey, tx.serializeContent())).serialize()
  await $.consensus.relayTransaction(tx)
  console.log(`Waiting for Nimiq transaction [${tx.hash().toHex()}] to confirm, please wait...`);
  await waitForConfirmation(tx)
  return tx.recipient.toUserFriendlyAddress()
}

async function deployEthHTLC(sender, recipient, hash) {
  console.log('Deploying ETH HTLC contract...');
  const HTLC = new eth.Contract(HTLC_abi)
  const contract = await HTLC.deploy({
    data: '0x' + HTLC_bin,
    arguments: [recipient, hash, 15]
  }).send({
    from: sender,
    gas: 1e6,
    gasPrice: 4e9
  })
  return contract.options.address
}

async function nimForEth() {
  const ethWallet = eth.accounts.wallet.add('0x' + $.wallet.keyPair.privateKey.toHex())
  console.log('Local ETH wallet address =', ethWallet.address);
  let nimRecipient = await prompt('Enter NIM address of recipient: ')
  nimRecipient = Nimiq.Address.fromString(nimRecipient)
  let value = await prompt('Enter NIM amount to send: ')
  value = parseInt(value)
  const ethRecipient = await prompt('Enter ETH address to receive funds: ')
  const hashRoot = randomBytes(32)
  const hash = Nimiq.Hash.computeSha256(hashRoot)
  const nimContractAddress = await deployNimHTLC(nimRecipient, hash, value)
  const ethContractAddress = await deployEthHTLC(ethWallet.address, ethRecipient, '0x' + Buffer.from(hash).toString('hex'))
  console.log('NIM contract address:', nimContractAddress);
  console.log('ETH contract address:', ethContractAddress);
}

async function main() {
  await nimiqConnect()
  const answer = await prompt('Enter 1 to send NIM for ETH, or 2 to receive NIM for ETH: ')
  switch (answer) {
    case '1':
      await nimForEth()
      break
    case '2':
      await ethForNim()
      break
  }
}

main()
