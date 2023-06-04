// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract WavePortal {
    uint256 totalWaves;
    uint256 private seed;

    // this represents the rate limit in seconds
    uint256 public waveCooldown = 15 minutes;

    event NewWave(address indexed from, uint256 timestamp, string message);

    struct Wave {
        address waver;
        string message;
        uint256 timestamp;
    }

    Wave[] waves;

    mapping(address => uint256) public lastWavedAt;
    mapping(address => uint256) public userWaveCount;

    constructor() payable {
        console.log("We have been constructed!");
    }

    function wave(string memory _message) public {
        require(
            lastWavedAt[msg.sender] + waveCooldown < block.timestamp,
            "Wait 15m"
        );

        require(
            bytes(_message).length > 0,
            "Message cannot be empty"
        );

        lastWavedAt[msg.sender] = block.timestamp;

        totalWaves += 1;
        userWaveCount[msg.sender] += 1;
        console.log("%s has waved!", msg.sender);

        waves.push(Wave(msg.sender, _message, block.timestamp));

        if (userWaveCount[msg.sender] % 5 == 0) {
            console.log("%s won!", msg.sender);

            uint256 prizeAmount = 0.0001 ether;
            require(
                prizeAmount <= address(this).balance,
                "Trying to withdraw more money than the contract has."
            );
            (bool success, ) = (msg.sender).call{value: prizeAmount}("");
            require(success, "Failed to withdraw money from contract.");
        }

        emit NewWave(msg.sender, block.timestamp, _message);
    }

    function getAllWaves() public view returns (Wave[] memory) {
        return waves;
    }

    function getTotalWaves() public view returns (uint256) {
        return totalWaves;
    }

    // Owner can adjust the cooldown time
    function setWaveCooldown(uint256 _newCooldown) public {
        waveCooldown = _newCooldown;
    }
}
