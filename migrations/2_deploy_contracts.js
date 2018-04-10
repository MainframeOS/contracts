/* global artifacts */

const MainframeToken = artifacts.require('MainframeToken')
const MainframeStake = artifacts.require('MainframeStake')
const MainframeTokenDistribution = artifacts.require('MainframeTokenDistribution')
const MainframeEscrow = artifacts.require('MainframeEscrow')

module.exports = (deployer, network) => {

  const deployEscrowAndStake = () => {
    return deployer.deploy(MainframeEscrow, MainframeToken.address).then(() => {
      return deployer.deploy(MainframeStake, MainframeEscrow.address)
    })
  }

  deployer.deploy(MainframeToken).then(() => {
    return Promise.all([
      deployEscrowAndStake(),
      deployer.deploy(MainframeTokenDistribution, MainframeToken.address),
    ])
  })
}
