# NIM/ETH cross-chain atomic swap tool

This tool requires NodeJS.
Install dependencies with Yarn.
Run using `node src/index`.

## If you are sending NIM for ETH

After starting the program, you should see the following lines:

```
[I 16:49:30] Nimiq: Managing wallets [NQ53 JTJB HH60 0BPF Y7MD 48QR TL53 VYT0 29YX]
[I 16:49:30] Nimiq: Connecting, please wait...
[I 16:49:50] BaseConsensus: Synced with all connected peers (5), consensus established.
[I 16:49:50] Nimiq: Current state: height=29175, headHash=why8hGOge8i//ofbtKzLMVX8QJFootRl7eWqjdkbLb8=
Enter 1 to send NIM for ETH, or 2 to receive NIM for ETH: 1
```

`NQ53 JTJB HH60 0BPF Y7MD 48QR TL53 VYT0 29YX` is a random but persisted Nimiq wallet that will be used in operations. You will need to fund it with the amount of NIM you intend to swap.

At the prompt type `1` and press `Enter`.

```
Local ETH wallet address = 0x5062dE01483b56948e2349a69d760f20941906DF
Enter NIM address of recipient: NQ03 6XDJ ESDT 0JDD ATF9 TB32 R2JY CBT9 19N9
Enter NIM amount to send: 0.00001
Enter ETH address to receive funds: 0x5062dE01483b56948e2349a69d760f20941906DF
```

`0x5062dE01483b56948e2349a69d760f20941906DF` is the ETH wallet managed by the tool. You will need to fund it with a small amount of ETH to cover gas costs.

Next, enter the NIM address your counterparty gives you. Then the amount of NIM you are trading. Finally the ETH address which you want to receive funds into.

```
Secret: 0x91c5daa9d3b43e0ac9a15856b8d76f9988037207fd6421ca510be274aab519c3
Waiting for Nimiq transaction [e3558192da499e912a5ea757be98787aeac4ff701d9e850634bf2c5e9ff4327e] to confirm, please wait...
Deploying ETH HTLC contract...
NIM HTLC address: NQ72 M4V3 A9YA UEHL UL5Q LBCX 74XC 7V1N JGQE
ETH HTLC address: 0x192E7fb33de67CDC5E17B78bD2650e9BCf2a566e
```

The secret (or hash preimage) will be displayed in case manual recovery of the HTLCs are required.

Please wait for the Nimiq and ETH HTLCs (Hash Time Locked Contracts) to be deployed.

Then the addresses of the HTLCs will be displayed. You need to send these addresses to your counterparty.

```
Enter 1 if agreed amount of ETH has been sent to 0x192E7fb33de67CDC5E17B78bD2650e9BCf2a566e
Or enter 2 to recover your NIM after the timeout (wait 1 hour): 1
Resolving ETH HTLC...
```

Now, use Etherscan to see if your counterparty sends the agreed amount of ETH to the ETH HTLC address. If the ETH shows up, enter 1 to transfer that ETH to the address that was entered earlier.

Otherwise, if 1 hour elapses, you may recover the NIM from its contract by entering 2:

```
Or enter 2 to recover your NIM after the timeout (wait 1 hour): 2
Enter NIM address to receive funds: NQ22 X270 UE4R 631D AYEY 8K1V 846B 2JP3 72N6
Waiting for Nimiq transaction [6d3feccc86a07691f475b9141f9956b548b26ec0954369af602663f8946b318e] to confirm, please wait...
```

## If you are sending ETH for NIM

After starting the program, you should see the following lines:

```
[I 16:49:35] Nimiq: Managing wallets [NQ03 6XDJ ESDT 0JDD ATF9 TB32 R2JY CBT9 19N9]
[I 16:49:35] Nimiq: Connecting, please wait...
[I 16:49:53] BaseConsensus: Synced with all connected peers (3), consensus established.
[I 16:49:53] Nimiq: Current state: height=29175, headHash=why8hGOge8i//ofbtKzLMVX8QJFootRl7eWqjdkbLb8=
Enter 1 to send NIM for ETH, or 2 to receive NIM for ETH: 2
```

`NQ03 6XDJ ESDT 0JDD ATF9 TB32 R2JY CBT9 19N9` is the Nimiq wallet managed by this tool. You need to give this address to your counterparty.

At the prompt type `2` and press `Enter`.

```
Local ETH wallet address = 0x6366dD79fB969D69608fD38D0Eb581916b1c514E
Enter the NIM HTLC address: NQ72 M4V3 A9YA UEHL UL5Q LBCX 74XC 7V1N JGQE
Enter the ETH HTLC address: 0x192E7fb33de67CDC5E17B78bD2650e9BCf2a566e
```

`0x6366dD79fB969D69608fD38D0Eb581916b1c514E` is the ETH wallet managed by the tool. You will need to fund it with a small amount of ETH to cover gas costs.

Next, enter the NIM HTLC and ETH HTLC addresses that your counterparty gives you.

```
NIM HTLC:
Balance       | 0.00001 NIM
Sender        | NQ53 JTJB HH60 0BPF Y7MD 48QR TL53 VYT0 29YX
Recipient     | NQ03 6XDJ ESDT 0JDD ATF9 TB32 R2JY CBT9 19N9
Locked amount | 0.00001 NIM
Timeout       | 29236 (~ 58 mins)
Hash algo     | 3
Hash depth    | 1
Hash root     | 0x618011edea50bde4ffbfdeeba136f997931c871d5a193b8e7e1edc1b9075b01c

ETH HTLC:
Hash root     | 0x618011edea50bde4ffbfdeeba136f997931c871d5a193b8e7e1edc1b9075b01c
Unlock time   | Fri May 04 2018 17:21:27 GMT+0100 (BST) (~ 29 mins)

If details are correct then send the agreed amount of ETH to 0x192E7fb33de67CDC5E17B78bD2650e9BCf2a566e
```

If successful the details of the two contracts will be displayed. Check that the NIM amount is correct, the recipient matches the address you gave your counterparty, and that there is sufficient time remaining on the ETH HTLC which will always be smaller than the NIM HTLC. The tool automatically checks that the two hash roots match and that the hash algorithm is SHA-256.

You can view the source of the ETH contract manually on Etherscan.

To proceed with the swap, send the agreed amount of ETH to the displayed address.

```
Waiting for ETH contract to be resolved...
```

The tool will wait until your counterparty resolves the ETH contract. This will provide the means to unlock the NIM contract.

```
Enter the NIM address to send the funds to: NQ93 GG96 2JNQ 24V5 SM65 VURT 0XK7 77CR NF8K
Waiting for Nimiq transaction [1699532f09bada152377141b99d254e1c2f0c39ce3c2aa312dbb29172e8a94d8] to confirm, please wait...
```

Finally, enter the NIM address you want the funds to be sent to.

If the ETH contract is not resolved in time, the tool will automatically try to reclaim the ETH back to your wallet:

```
Waiting for ETH contract to be resolved...
ETH HTLC timed out
Refunding ETH...
```
