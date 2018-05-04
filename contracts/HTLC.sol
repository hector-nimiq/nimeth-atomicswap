pragma solidity ^0.4.23;

contract HTLC {
  address owner;
  address funder;
  address beneficiary;
  bytes32 public secret;
  bytes32 public hashSecret;
  uint public unlockTime;

  constructor(address beneficiary_, bytes32 hashSecret_, uint lockTime) public {
    owner = msg.sender;
    beneficiary = beneficiary_;
    hashSecret = hashSecret_;
    unlockTime = now + lockTime * 1 minutes;
  }

  function() public payable {
    if (funder == 0) {
      funder = msg.sender;
    }
    if (msg.sender != funder) {
      revert();
    }
  }

  function resolve(bytes32 secret_) public {
    if (msg.sender != owner) {
      revert();
    }
    if (sha256(secret_) != hashSecret) {
      revert();
    }
    secret = secret_;
    beneficiary.transfer(address(this).balance);
  }

  function refund() public {
    if (msg.sender != funder) {
      revert();
    }
    if (now < unlockTime) {
      revert();
    }
    msg.sender.transfer(address(this).balance);
  }
}
