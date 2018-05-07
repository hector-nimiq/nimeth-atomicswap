const Nimiq = require('@nimiq/core/dist/node')

const NETWORK = 'main'
const TAG = 'Nimiq'
const $ = {}

async function connect() {
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

function getWalletPrivateKey() {
  return '0x' + $.wallet.keyPair.privateKey.toHex()
}

function generateHtlcTransaction(sender, recipient, hash, value, timeout) {
  const hashAlgo = Nimiq.Hash.Algorithm.SHA256
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
  const recipientType = Nimiq.Account.Type.HTLC;
  const flags = Nimiq.Transaction.Flag.CONTRACT_CREATION;
  return new Nimiq.ExtendedTransaction(sender, Nimiq.Account.Type.BASIC, recipient, recipientType,
    value, 0, $.blockchain.height + 1, flags, buffer);
}

function sendTransaction(tx) {
  return new Promise(async function(resolve) {
    const id = $.mempool.on('transaction-mined', tx2 => {
      if (tx.equals(tx2)) {
        $.mempool.off('transaction-mined', id)
        resolve()
      }
    })
    $.consensus.subscribeAccounts([tx.recipient])
    await $.consensus.relayTransaction(tx)
    console.log(`Waiting for Nimiq transaction [${tx.hash().toHex()}] to confirm, please wait...`);
  })
}

function waitForBlock(blockNumber) {
  return new Promise(resolve => {
    if ($.blockchain.height >= blockNumber) {
      return resolve()
    }
    const id = $.blockchain.on('head-changed', head => {
      if (head.height >= blockNumber) {
        $.blockchain.off('head-changed', id)
        resolve()
      }
    })
    console.log(`Waiting for Nimiq block ${blockNumber}, please wait...`);
  })
}

async function deployHTLC(recipient, hash, value) {
  recipient = Nimiq.Address.fromString(recipient)
  const tx = generateHtlcTransaction($.wallet.address, recipient, hash, value, 60)
  tx.proof = Nimiq.SignatureProof.singleSig($.wallet.publicKey, Nimiq.Signature.create($.wallet.keyPair.privateKey, $.wallet.publicKey, tx.serializeContent())).serialize()
  await sendTransaction(tx)
  return tx.recipient.toUserFriendlyAddress()
}

async function verifyHTLC(address) {
  address = Nimiq.Address.fromString(address)
  const account = await $.consensus.getAccount(address)
  if (account.type !== Nimiq.Account.Type.HTLC) {
    throw 'Account is not a HTLC'
  }
  if (account.hashRoot.algorithm !== Nimiq.Hash.Algorithm.SHA256) {
    throw 'HTLC is not SHA256'
  }
  if (account.hashCount !== 1) {
    throw 'Hash depth is not 1'
  }
  console.log(`Balance       | ${account.balance / 1e5} NIM`)
  console.log(`Sender        | ${account.sender.toUserFriendlyAddress()}`)
  console.log(`Recipient     | ${account.recipient.toUserFriendlyAddress()}`)
  console.log(`Locked amount | ${account.totalAmount / 1e5} NIM`)
  console.log(`Timeout       | ${account.timeout} (~ ${Math.max(0, account.timeout - $.blockchain.height)} mins)`)
  console.log(`Hash algo     | ${account.hashRoot.algorithm}`)
  console.log(`Hash depth    | ${account.hashCount}`)
  console.log(`Hash root     | 0x${account.hashRoot.toHex()}`)
  return `0x${account.hashRoot.toHex()}`
}

async function resolveHTLC(address, recipient, hashRoot, preImage) {
  address = Nimiq.Address.fromString(address)
  recipient = Nimiq.Address.fromString(recipient)
  const account = await $.consensus.getAccount(address)
  const tx = new Nimiq.ExtendedTransaction(
    address, Nimiq.Account.Type.HTLC,
    recipient, Nimiq.Account.Type.BASIC,
    account.balance, 0,
    $.blockchain.height + 1,
    Nimiq.Transaction.Flag.NONE, new Uint8Array(0))
  const sig = Nimiq.Signature.create($.wallet.keyPair.privateKey, $.wallet.publicKey, tx.serializeContent())
  const sigProof = new Nimiq.SignatureProof($.wallet.publicKey, new Nimiq.MerklePath([]), sig)
  tx.proof = new Nimiq.SerialBuffer(3 + 2 * Nimiq.Hash.SIZE.get(Nimiq.Hash.Algorithm.SHA256) + sigProof.serializedSize)
  tx.proof.writeUint8(Nimiq.HashedTimeLockedContract.ProofType.REGULAR_TRANSFER)
  tx.proof.writeUint8(Nimiq.Hash.Algorithm.SHA256)
  tx.proof.writeUint8(1)
  Nimiq.Hash.fromHex(hashRoot.slice(2)).serialize(tx.proof)
  Nimiq.Hash.fromHex(preImage.slice(2)).serialize(tx.proof)
  sigProof.serialize(tx.proof)
  await sendTransaction(tx)
}

async function refundHTLC(address, recipient) {
  address = Nimiq.Address.fromString(address)
  recipient = Nimiq.Address.fromString(recipient)
  const account = await $.consensus.getAccount(address)
  const tx = new Nimiq.ExtendedTransaction(
    address, Nimiq.Account.Type.HTLC,
    recipient, Nimiq.Account.Type.BASIC,
    account.balance, 0,
    $.blockchain.height + 1,
    Nimiq.Transaction.Flag.NONE, new Uint8Array(0))
  const sig = Nimiq.Signature.create($.wallet.keyPair.privateKey, $.wallet.publicKey, tx.serializeContent())
  const sigProof = new Nimiq.SignatureProof($.wallet.publicKey, new Nimiq.MerklePath([]), sig)
  tx.proof = new Nimiq.SerialBuffer(1 + sigProof.serializedSize)
  tx.proof.writeUint8(Nimiq.HashedTimeLockedContract.ProofType.TIMEOUT_RESOLVE)
  sigProof.serialize(tx.proof)
  await waitForBlock(account.timeout)
  await sendTransaction(tx)
}

module.exports = {
  connect,
  getWalletPrivateKey,
  deployHTLC,
  verifyHTLC,
  resolveHTLC,
  refundHTLC
}
