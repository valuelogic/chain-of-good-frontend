import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';
import React, { Component } from 'react';
import './App.css';
import Campaing from './contracts/Campaign.json';
import IERC20 from './contracts/IERC20.json';
import * as IPFS from 'ipfs';
import { TextDecoder } from 'text-decoding';

class App extends Component {
  state = {
    toGive: 0,
    toReturn: 0,
    donation: 0,
    beneficiaryWallet: '',
    donationPool: 0,
    collectedReward: 0,
    additionalFounds: 0,
    myDonationInPool: 0,
    estimatedReward: 0,
    startTime: 0,
    endTime: 0,
    title: "",
    description: "",
    imageUrl: "",
  };
  campaign;
  token;
  aToken;
  async componentDidMount() {
    let provider = await detectEthereumProvider();

    if (provider) {
      console.log('start');
      await provider.request({ method: 'eth_requestAccounts' });
      provider = new ethers.providers.Web3Provider(provider);

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      this.campaign = new ethers.Contract(
        process.env.REACT_APP_CAMPAIGN_CONTRACT,
        Campaing.abi,
        signer
      );

      this.token = new ethers.Contract(
        process.env.REACT_APP_TOKEN_CONTRACT,
        IERC20.abi,
        signer
      );

      this.aToken = new ethers.Contract(
        process.env.REACT_APP_A_TOKEN_CONTRACT,
        IERC20.abi,
        signer
      );

      console.log(this.campaign.address);
      const info = await this.campaign.info();

      console.log(info.startTime);
      console.log(info.donationPool);

      const myDonation = await this.campaign.donorsToDonation(signerAddress);
      const aTokensInContract = await this.aToken.balanceOf(
        this.campaign.address
      );

      this.setState({
        collectedReward: info.collectedReward,
        startTime: info.startTime,
        endTime: info.endTime,
        beneficiaryWallet: info.beneficiaryWallet,
        donationPool: info.donationPool,
        estimatedReward: aTokensInContract.sub(info.donationPool),
        myDonationInPool: myDonation,
        additionalFounds: info.additionalPassedFounds,
      });

      console.log('Loaded!');
    } else {
      console.log('Error');
    }
  }

  updateInputFieldState = async (e, field) => {
    this.setState({ [field]: e.target.value });
  };

  joinCampaign = async () => {
    const allowance = ethers.BigNumber.from('10000000000000000000000000000');
    const tx = await this.token.approve(this.campaign.address, allowance);
    await tx.wait();

    this.setState({ approved: true });

    console.log('Joined to the campaign');
  };

  donate = async () => {
    const amount = ethers.BigNumber.from(this.state.donation + '000000');

    const tx = await this.campaign.donate(amount);
    await tx.wait();
    console.log('Donated');
  };

  giveMeBackMyFounds = async () => {
    const amount = ethers.BigNumber.from(this.state.toReturn + '000000');

    const tx = await this.campaign.giveMyFoundsBack(amount);
    await tx.wait();
    console.log('Founds returned');
  };

  giveMeBackAllMyFounds = async () => {
    const tx = await this.campaign.giveAllMyFoundsBack();
    await tx.wait();
    console.log('Founds returned');
  };

  end = async () => {
    const tx = await this.campaign.endCampaing();
    await tx.wait();
    console.log('Campaign ended');
  };

  forceEnd = async () => {
    const tx = await this.campaign.forceEnd();
    await tx.wait();
    console.log('Campaign ended');
  };

  splitMyFounds = async () => {
    const toGive = ethers.BigNumber.from(this.state.toGive + '000000');

    const tx = await this.campaign.splitMyFounds(toGive);
    await tx.wait();

    console.log('Founds transfered');
  };

  transferAllToCharity = async () => {
    const tx = await this.campaign.transferAllMyFoundsToCharity();
    await tx.wait();

    console.log('Founds transfered');
  };

  getIpfsData = async () => {
    const node = await IPFS.create();

    const chunks = [];
    for await (const chunk of node.cat(
      'QmZEzNuysnpsdrmJupwQq8HMZvnWmEJDGYqftpDZX9NvH1'
    )) {
      chunks.push(chunk);
    }

    const metadata = JSON.parse(new TextDecoder('utf-8').decode(chunks[0]));

    console.log(metadata);
    const content = [];
    for await (const chunk of node.cat(metadata.imageCID)) {
      content.push(chunk);
    }

    const url = URL.createObjectURL(new Blob(content, { type: 'image/png' }));
    this.setState({
      title: metadata.title,
      description: metadata.description,
      imageUrl: url
    })
    console.log(url);
  };

  render() {
    return (
      <div>
        <div>
          <h2>Info from metadata</h2>
          <div>
            <span>Title: {this.state.title}</span>
          </div>
          <div>
            <span>Description: {this.state.description}</span>
          </div>
          <div>
            <span>Image : <img src={this.state.imageUrl} alt="Image" width="50" height="25"></img></span>
          </div>
        </div>
        <button onClick={() => this.getIpfsData()}>Load metadata</button>
        <div>
          <h2>Information</h2>
          <div>
            <span>
              Start date: {new Date(this.state.startTime * 1000).toString()}
            </span>
          </div>
          <div>
            <span>
              End date: {new Date(this.state.endTime * 1000).toString()}
            </span>
          </div>
          <div>
            <span>Charity wallet: {this.state.beneficiaryWallet}</span>
          </div>
          <div>
            <span>Donation pool: </span>
            {ethers.utils.formatUnits(this.state.donationPool, 6)}
          </div>
          <div>
            <span>
              Reward from Aave:{' '}
              {ethers.utils.formatUnits(this.state.collectedReward, 6)}
            </span>
          </div>
          <div>
            <span>
              Passed Founds:{' '}
              {ethers.utils.formatUnits(
                ethers.BigNumber.from(this.state.additionalFounds).add(
                  ethers.BigNumber.from(this.state.collectedReward)
                ),
                6
              )}
            </span>
          </div>
          <div>
            <span>
              Current estimated reward from Aave:{' '}
              {ethers.utils.formatUnits(this.state.estimatedReward, 6)}
            </span>
          </div>
          <div>
            <span>
              My donation in pool:
              {ethers.utils.formatUnits(this.state.myDonationInPool, 6)}
            </span>
          </div>
        </div>
        <div>
          <h2>Actions</h2>
          <div>
            <span>Join the campaign</span>
            <button onClick={() => this.joinCampaign()}>Join</button>
          </div>
          <div>
            <span>Donate some founds</span>
            <input
              placeholder="Donation"
              onChange={(event) =>
                this.updateInputFieldState(event, 'donation')
              }
            ></input>
            <button onClick={() => this.donate()}>Donate</button>
          </div>
          <div>
            <span>Get your founds back</span>
            <input
              placeholder="How much"
              onChange={(event) =>
                this.updateInputFieldState(event, 'toReturn')
              }
            ></input>
            <button onClick={() => this.giveMeBackMyFounds()}>
              Give me founds
            </button>
          </div>
          <div>
            <span>Get your all founds back</span>
            <button onClick={() => this.giveMeBackAllMyFounds()}>
              Give me all my founds
            </button>
          </div>
          <div>
            <span>End campaing</span>
            <button onClick={() => this.end()}>End</button>
            <button onClick={() => this.forceEnd()}>Force End</button>
          </div>
          <div></div>
          <div>
            <span>Split my founds</span>
            <input
              placeholder="How much"
              onChange={(event) => this.updateInputFieldState(event, 'toGive')}
            ></input>
            <button onClick={() => this.splitMyFounds()}>Split them</button>
          </div>
          <div>
            <span>Give all founds to charity</span>
            <button onClick={() => this.transferAllToCharity()}>
              Give all to charity
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
