import { ethers, network } from "hardhat"
import { scriptConfig } from "../cli-config"
import { manageTimelockTransaction } from "./time-lock-transactions"
import { OfficialMasterChef } from "../../types"
import { BigNumber } from "ethers"
import { stdout } from "../utils/stdout"

const config = scriptConfig[network.config.chainId!]

export async function addMasterChefPool(allocationPoints: number, lpTokenAddress: string, rewarderAddress: string) {
  const chef = (await ethers.getContractAt("OfficialMasterChef", config.contractAddresses.MasterChef)) as OfficialMasterChef
  const tx = await chef.add(allocationPoints, lpTokenAddress, rewarderAddress)
  const receipt = await tx.wait()
  return receipt.transactionHash
}

export async function timelocked_addMasterChefPool(allocationPoints: number, lpAddress: string, rewarderAddress: string, eta: number) {
  const [deployer, admin] = await ethers.getSigners()
  return manageTimelockTransaction(
    admin,
    {
      targetContract: {
        name: "OfficialMasterChef",
        address: config.contractAddresses.MasterChef,
      },
      value: 0,
      targetFunction: {
        identifier: "add",
        args: [allocationPoints, lpAddress, rewarderAddress],
      },
      eta: eta,
    },
    "queue"
  )
}

export async function setMasterChefPool(pid: number, allocationPoints: number, rewarderAddress: string, overwriteRewarder: boolean) {
  const chef = (await ethers.getContractAt("OfficialMasterChef", config.contractAddresses.MasterChef)) as OfficialMasterChef
  const tx = await chef.set(pid, allocationPoints, rewarderAddress, overwriteRewarder)
  const receipt = await tx.wait()
  return receipt.transactionHash
}

export async function timelocked_setMasterChefPool(
  pid: number,
  allocationPoints: number,
  rewarderAddress: string,
  overwriteRewarder: boolean,
  eta: number
) {
  const [deployer, admin] = await ethers.getSigners()
  return manageTimelockTransaction(
    admin,
    {
      targetContract: {
        name: "OfficialMasterChef",
        address: config.contractAddresses.MasterChef,
      },
      value: 0,
      targetFunction: {
        identifier: "set",
        args: [pid, allocationPoints, rewarderAddress, overwriteRewarder],
      },
      eta: eta,
    },
    "queue"
  )
}

export async function updateEmissionRate(beetsPerBlock: BigNumber) {
  const chef = (await ethers.getContractAt("OfficialMasterChef", config.contractAddresses.MasterChef)) as OfficialMasterChef
  const tx = await chef.updateEmissionRate(beetsPerBlock)
  const receipt = await tx.wait()
  return receipt.transactionHash
}

export async function timelocked_updateEmissionRate(beetsPerBlock: BigNumber, eta: number) {
  const [deployer, admin] = await ethers.getSigners()
  return manageTimelockTransaction(
    admin,
    {
      targetContract: {
        name: "OfficialMasterChef",
        address: config.contractAddresses.MasterChef,
      },
      value: 0,
      targetFunction: {
        identifier: "updateEmissionRate",
        args: [beetsPerBlock],
      },
      eta: eta,
    },
    "queue"
  )
}

export async function setTreasuryAddress(address: string) {
  const chef = (await ethers.getContractAt("OfficialMasterChef", config.contractAddresses.MasterChef)) as OfficialMasterChef
  const tx = await chef.treasury(address)
  const receipt = await tx.wait()
  return receipt.transactionHash
}

export async function timelocked_setTreasuryAddress(address: string, eta: number) {
  const [deployer, admin] = await ethers.getSigners()
  return manageTimelockTransaction(
    admin,
    {
      targetContract: {
        name: "OfficialMasterChef",
        address: config.contractAddresses.MasterChef,
      },
      value: 0,
      targetFunction: {
        identifier: "treasury",
        args: [address],
      },
      eta: eta,
    },
    "queue"
  )
}

export async function listPools() {
  const chef = (await ethers.getContractAt("OfficialMasterChef", config.contractAddresses.MasterChef)) as OfficialMasterChef
  const poolsLength = await chef.poolLength()
  for (let pid = 0; pid < poolsLength.toNumber(); pid++) {
    const { allocPoint, accBeetsPerShare, lastRewardBlock } = await chef.poolInfo(pid)
    const lpTokenAddess = await chef.lpTokens(pid)
    stdout.printInfo(`PID: ${pid}`)
    stdout.printInfo(`lpAddress: ${lpTokenAddess}`)
    stdout.printInfo(`allocationPoints: ${allocPoint.toString()}`)
    stdout.printInfo(`accBeetsPerShare: ${accBeetsPerShare.toString()}`)
    stdout.printInfo(`lastRewardBlock: ${lastRewardBlock.toString()}`)
    stdout.printInfo(`--------------------------------------------------`)
  }
}
