import './App.css';
import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import abi from './utils/WavePortal.json';
import dotenv from 'dotenv';
const App = () => {
  const [currentAccount, setCurrentAccount] = useState('');
  const [allWaves, setAllWaves] = useState([]);
  const [message, setMessage] = useState('');
  const [waveTxnStatus, setWaveTxnStatus] = useState('');
  const [lastWavedTime, setLastWavedTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isWaveDisabled, setIsWaveDisabled] = useState(false);
  const [loadedWaves, setLoadedWaves] = useState(10);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const contractAddress = '0x7a29A4749c4Ffb3CDA527B3F6fB44A0ABe2dAa11';
  const contractABI = abi.abi;
  const provider = new ethers.providers.JsonRpcProvider(
    `https://${import.meta.env.VITE_REACT_APP_ALCHEMY_NETWORK}.g.alchemy.com/v2/${import.meta.env.VITE_REACT_APP_ALCHEMY_API_KEY}`
  );
  

  const waveportalContract = new ethers.Contract(
    contractAddress,
    contractABI,
    provider
  );

  const checkIfWalletIsConnected = useCallback(async () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log('Make sure you have MetaMask!');
      return;
    }

    try {
      const accounts = await ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts.length > 0) {
        const account = accounts[0];
        console.log('Found an authorized account:', account);
        setCurrentAccount(account);
      } else {
        console.log('No authorized account found');
      }
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [checkIfWalletIsConnected]);

  const connectWallet = useCallback(async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert('Get MetaMask!');
        return;
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      console.log('Connected:', accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const wave = useCallback(async () => {
    if (timeRemaining > 0 || isWaveDisabled) {
      console.log('Cooldown period active. Please wait before waving again.');
      return;
    }

    const { ethereum } = window;
    if (!ethereum) {
      console.log('Ethereum object does not exist!');
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
      const waveportalContractWithSigner = waveportalContract.connect(signer);

      setIsWaveDisabled(true);
      setWaveTxnStatus('Transaction Pending...');

      const waveTxn = await waveportalContractWithSigner.wave(message, {
        gasLimit: 300000,
      });

      console.log('New Transaction:', waveTxn.hash);
      setWaveTxnStatus('Transaction Pending...');
      setLastWavedTime(Date.now());
      setMessage('');

      // Wait for the transaction to be confirmed
      await waveTxn.wait();

      // Update the wave list with the new wave
      const newWave = {
        address: currentAccount,
        timestamp: new Date(),
        message: message,
      };
      setAllWaves((prevWaves) => [newWave, ...prevWaves]);

      setWaveTxnStatus('Transaction Successful!');
    } catch (error) {
      console.log('Error waving:', error);
      setWaveTxnStatus('Transaction Failed');
    } finally {
      setIsWaveDisabled(false);
    }
  }, [currentAccount, message, timeRemaining, isWaveDisabled, waveportalContract]);

  useEffect(() => {
    const cooldownPeriod = 15 * 60 * 1000;

    if (lastWavedTime === 0) {
      setTimeRemaining(0);
      return;
    }

    const timePassed = Date.now() - lastWavedTime;
    const remaining = cooldownPeriod - timePassed;
    setTimeRemaining(Math.max(remaining, 0));

    const countdownInterval = setInterval(() => {
      const timePassed = Date.now() - lastWavedTime;
      const remaining = cooldownPeriod - timePassed;
      setTimeRemaining(Math.max(remaining, 0));

      if (remaining <= 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [lastWavedTime]);

  const fetchInitialWaves = useCallback(async () => {
    try {
      const waves = await waveportalContract.getAllWaves();
      const wavesCleaned = waves
        .map((wave) => ({
          address: wave.waver,
          timestamp: new Date(wave.timestamp * 1000),
          message: wave.message,
        }))
        .reverse();

      setAllWaves(wavesCleaned);
      setIsInitialLoad(false);
    } catch (error) {
      console.log('Error fetching waves:', error);
    }
  }, [waveportalContract]);

  useEffect(() => {
    if (isInitialLoad) {
      fetchInitialWaves();
    }
  }, [isInitialLoad, fetchInitialWaves]);

  const loadMoreWaves = useCallback(async () => {
    try {
      const waves = await waveportalContract.getAllWaves();
      const wavesCleaned = waves
        .map((wave) => ({
          address: wave.waver,
          timestamp: new Date(wave.timestamp * 1000),
          message: wave.message,
        }))
        .reverse();

      setAllWaves(wavesCleaned);
      setLoadedWaves((prevLoadedWaves) => prevLoadedWaves + 10);
    } catch (error) {
      console.log('Error loading more waves:', error);
    }
  }, [waveportalContract]);

  const visibleWaves = allWaves.slice(0, loadedWaves);

  return (
    <div className="mainContainer">
      <div className="dataContainer">
        <div className="header">☕ GM! Welcome to the Morning Waves!</div>

        <div className="bio">
          Start your day with a hot cup of positivity. Write a GM message below and share the vibes with the community!
        </div>

        {currentAccount ? (
          <>
            <textarea
              className="messageInput"
              placeholder="What's your GM message today?.."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isWaveDisabled}
            />
            <button
              className="waveButton"
              disabled={timeRemaining > 0 || isWaveDisabled}
              onClick={wave}
            >
              {timeRemaining > 0 ? 'Resting... preparing your next GM wave 🌞' : 'Send a GM Wave!'}
            </button>
            <div>Transaction Status: {waveTxnStatus}</div>
            {timeRemaining > 0 ? (
              <div>
                Rest up! Your next GM wave will be ready in {Math.ceil(timeRemaining / (1000 * 60))} minutes.
              </div>
            ) : (
              <div>Your GM Wave is ready to roll! 🏄‍♀️</div>
            )}
          </>
        ) : (
          <button className="waveButton" onClick={connectWallet}>
            Connect Wallet to Join the GM Club
          </button>
        )}

        {visibleWaves.map((wave, index) => (
          <div
            key={index}
            style={{
              backgroundColor: 'OldLace',
              marginTop: '16px',
              padding: '8px',
            }}
          >
            <div>From: {wave.address}</div>
            <div>Time: {wave.timestamp.toString()}</div>
            <div>GM Message: {wave.message}</div>
            <div>☕ GM Wave #{allWaves.length - index}</div>
          </div>
        ))}

        {allWaves.length > loadedWaves && (
          <button className="loadMoreButton" onClick={loadMoreWaves}>
            Load More GM Waves
          </button>
        )}
      </div>
    </div>
  );
};

export default App;