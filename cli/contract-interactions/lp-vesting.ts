import { BigNumber } from "ethers"
import { ethers, network } from "hardhat"
import { scriptConfig } from "../cli-config"
import { OfficialMasterChef, ERC20, IERC20, MasterChefLpTokenTimelock } from "../../types"
import inquirer from "inquirer"
import { stdout } from "../utils/stdout"

const config = scriptConfig[network.config.chainId!]

export async function printPercentageAmount(percentage: number) {
  const [dev, admni, lbpFunds] = await ethers.getSigners()
  const lp = (await ethers.getContractAt("ERC20", config.contractAddresses.CialLp)) as ERC20
  const totalAmount = await lp.balanceOf(lbpFunds.address)
  const amount = percentageOf(totalAmount, percentage)
  stdout.printInfo(`total: ${totalAmount} \n ${percentage / 10}%: ${amount}`)
}

export async function vestLps(vestingContract: string, amount: BigNumber, beneficiary: string) {
  const [_, _a, lbpFunds] = await ethers.getSigners()
  const vesting = (await ethers.getContractAt("MasterChefLpTokenTimelock", vestingContract)) as MasterChefLpTokenTimelock
  const actualBeneficiary = await vesting.beneficiary()
  if (actualBeneficiary !== beneficiary) {
    throw new Error(`Beneficiary does not match! expected: ${actualBeneficiary}, provided: ${beneficiary}`)
  }
  const lp = (await ethers.getContractAt("ERC20", config.contractAddresses.CialLp)) as IERC20

  const answers = await inquirer.prompt([
    {
      name: "confirm",
      type: "confirm",
      message: `Deposit ${amount} for ${beneficiary}?`,
    },
  ])
  if (answers.confirm) {
    await lp.connect(lbpFunds).approve(vesting.address, amount)
    await new Promise((resolve) => {
      setTimeout(resolve, 3000)
    })
    const tx = await vesting.connect(lbpFunds).depositAllToMasterChef(amount)
    const receipt = await tx.wait()
    return receipt.transactionHash
  }
}

export async function listVestedAmount(vestingContract: string) {
  const chef = (await ethers.getContractAt("OfficialMasterChef", config.contractAddresses.MasterChef)) as OfficialMasterChef
  const userInfo = await chef.userInfo(0, vestingContract)
  stdout.printInfo(`Deposited amount for ${vestingContract}: ${userInfo.amount}`)
}

function percentageOf(value: BigNumber, percentage: number) {
  return value.mul(percentage).div(1000)
}
