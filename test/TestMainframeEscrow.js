var MainframeToken = artifacts.require('./MainframeToken.sol')
var MainframeEscrow = artifacts.require('./MainframeEscrow.sol')
const utils = require('./utils.js')

contract('MainframeEscrow', (accounts) => {
  let tokenContract
  let escrowContract

  beforeEach('setup contracts for each test', async() => {
    tokenContract = await MainframeToken.new()
    escrowContract = await MainframeEscrow.new(tokenContract.address)
    await tokenContract.turnOnTradeable({ from: accounts[0] })
  })

  it('should should deposit successfully', async () => {
    await tokenContract.approve(escrowContract.address, 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[0], 100, {from: accounts[0], value: 0, gas: 3000000})
    const depositorsBalance = await escrowContract.balanceOf(accounts[0])
    const totalDepositBalance = await escrowContract.totalDepositBalance()
    const totalBalance = await tokenContract.balanceOf(escrowContract.address)
    utils.assertEvent(escrowContract, { event: 'Deposit' })
    assert.equal(depositorsBalance, 100)
    assert.equal(totalBalance, 100)
    assert.equal(totalDepositBalance, 100)
  })

  it('should fail to deposit if balance is too low', async () => {
    await tokenContract.transfer(accounts[1], 100, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, 100, {from: accounts[1], value: 0, gas: 3000000})
    const didFail = await utils.expectAsyncThrow(async () => {
      await escrowContract.deposit(accounts[1], 200, {from: accounts[0], value: 0, gas: 3000000})
    })
    assert(didFail)
  })

  it('should withdraw successfully if balance is high enough', async () => {
    await tokenContract.transfer(accounts[1], 100, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, 100, {from: accounts[1], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[1], 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.withdraw(accounts[1], 100, {from: accounts[0], value: 0, gas: 3000000})
    const totalBalance = await tokenContract.balanceOf(escrowContract.address)
    const depositorsBalance = await escrowContract.balanceOf(accounts[0])
    const totalDepositBalance = await escrowContract.totalDepositBalance()
    utils.assertEvent(escrowContract, { event: 'Deposit' })
    utils.assertEvent(escrowContract, { event: 'Withdrawal' })
    assert.equal(depositorsBalance, 0)
    assert.equal(0, totalBalance)
    assert.equal(totalDepositBalance, 0)
  })

  it('should reject withdrawal if balance is too low', async () => {
    const depositorsBalance = await escrowContract.balanceOf(accounts[0])
    assert.equal(depositorsBalance, 0)
    const didFail = await utils.expectAsyncThrow(async () => {
      await escrowContract.withdraw(1000, {from: accounts[0], value: 0, gas: 3000000})
    })
    assert(didFail)
  })

  it('should reject deposit/withdraw if staking address is not the caller', async () => {
    const stakingAddress = await accounts[0]
    await tokenContract.transfer(accounts[1], 10, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, 10, {from: accounts[1], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[1], 10, {from: stakingAddress, value: 0, gas: 3000000})

    const totalBalance = await tokenContract.balanceOf(escrowContract.address)
    const depositorsBalance = await escrowContract.balanceOf(accounts[1])

    const depositDidFail = await utils.expectAsyncThrow(async () => {
      await tokenContract.approve(escrowContract.address, 10, {from: accounts[1], value: 0, gas: 3000000})
      await escrowContract.deposit(accounts[1], 10, {from: accounts[1], value: 0, gas: 3000000})
    })
    assert(depositDidFail)

    const withdrawDidFail = await utils.expectAsyncThrow(async () => {
      await escrowContract.withdraw(accounts[1], 10, {from: accounts[1], value: 0, gas: 3000000})
    })
    assert(withdrawDidFail)

    assert.equal(depositorsBalance, 10)
    assert.equal(10, totalBalance)
  })

  it('should fail refund of balances called by non owner', async () => {
    await tokenContract.transfer(accounts[1], 100, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, 100, {from: accounts[1], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[1], 100, {from: accounts[0], value: 0, gas: 3000000})
    const returnBalanceFail = await utils.expectAsyncThrow(async () => {
      await escrowContract.refundBalances([accounts[1]], {from: accounts[2], value: 0, gas: 3000000})
    })
    assert(returnBalanceFail)
  })

  it('should refund balances if called by owner', async () => {
    const txAmount = 100
    await tokenContract.transfer(accounts[1], txAmount, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.transfer(accounts[2], txAmount, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, txAmount, {from: accounts[1], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[1], txAmount, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, txAmount, {from: accounts[2], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[2], txAmount, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.refundBalances([accounts[1], accounts[2]], {from: accounts[0], value: 0, gas: 3000000})
    const totalBalance = await tokenContract.balanceOf(escrowContract.address)
    const depositor1Balance = await escrowContract.balanceOf(accounts[1])
    const depositor2Balance = await escrowContract.balanceOf(accounts[1])
    const totalDepositBalance = await escrowContract.totalDepositBalance()
    utils.assertEvent(escrowContract, { event: 'RefundedBalance' })
    assert.equal(depositor1Balance, 0)
    assert.equal(depositor2Balance, 0)
    assert.equal(totalBalance, 0)
    assert.equal(totalDepositBalance, 0)
  })

  it('should extract correct balances through event logs', async () => {
    await tokenContract.transfer(accounts[1], 1000, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.transfer(accounts[2], 1000, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.transfer(accounts[3], 1000, {from: accounts[0], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, 1000, {from: accounts[1], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, 1000, {from: accounts[2], value: 0, gas: 3000000})
    await tokenContract.approve(escrowContract.address, 1000, {from: accounts[3], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[1], 1000, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.withdraw(accounts[1], 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[2], 800, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.withdraw(accounts[2], 200, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[3], 500, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.withdraw(accounts[3], 250, {from: accounts[0], value: 0, gas: 3000000})
    var events = escrowContract.Withdrawal({}, {
      fromBlock: 0,
      toBlock: 'latest',
    })
    const passed = await new Promise(async (resolve, reject) => {
      await events.get( (error, logs) => {
        const outstandingBalances = {}
        logs.forEach(l => {
          outstandingBalances[l.args._address] = l.args.balance.toNumber()
        })
        resolve(
          outstandingBalances[accounts[1]] === 900 &&
          outstandingBalances[accounts[2]] === 600 &&
          outstandingBalances[accounts[3]] === 250
        )
      })
    })
    assert(passed, 'Incorrect balances derived from logs')
  })

  it('should successfully destroy itself if balance is unchanged (0)', async () => {
    await escrowContract.destroy()
  })

  it('should successfully destroy itself if balance is 0', async () => {
    await tokenContract.approve(escrowContract.address, 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[0], 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.withdraw(accounts[0], 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.destroy()
  })

  it('should fail to destroy itself if balance is higher than 0', async () => {
    await tokenContract.approve(escrowContract.address, 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[0], 100, {from: accounts[0], value: 0, gas: 3000000})
    const didFail = await utils.expectAsyncThrow(async () => {
      await escrowContract.destroy()
    })
    assert(didFail)
  })

  it('should fail to destroy itself if someone sends tokens to the contract address', async () => {
    await tokenContract.turnOnTradeable({ from: accounts[0] })
    await tokenContract.transfer(escrowContract.address, 100, { from: accounts[0] })
    const didFail = await utils.expectAsyncThrow(async () => {
      await escrowContract.destroy()
    })
    assert(didFail)
  })

  it('should drain only mistakenly sent tokens and not valid deposits', async () => {
    let totalBalance
    let totalDepositBalance
    await tokenContract.turnOnTradeable({ from: accounts[0] })
    await tokenContract.approve(escrowContract.address, 100, {from: accounts[0], value: 0, gas: 3000000})
    await escrowContract.deposit(accounts[0], 100, {from: accounts[0], value: 0, gas: 3000000})
    const depositorsBalance = await escrowContract.balanceOf(accounts[0])
    await tokenContract.transfer(escrowContract.address, 100, { from: accounts[0] })
    totalBalance = await tokenContract.balanceOf(escrowContract.address)
    totalDepositBalance = await escrowContract.totalDepositBalance()
    utils.assertEvent(escrowContract, { event: 'Deposit' })
    assert.equal(depositorsBalance, 100)
    assert.equal(totalBalance, 200)
    assert.equal(totalDepositBalance, 100)

    await escrowContract.emergencyERC20Drain(tokenContract.address, {from: accounts[0], value: 0, gas: 3000000})
    totalBalance = await tokenContract.balanceOf(escrowContract.address)
    totalDepositBalance = await escrowContract.totalDepositBalance()
    assert.equal(totalDepositBalance, 100)
    assert.equal(totalBalance, 100)
  })
})
