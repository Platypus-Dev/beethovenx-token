import { bn } from "../test/utilities"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { OfficialMasterChef, OfficialToken, Timelock } from "../types"

export default async function ({ ethers, deployments, getNamedAccounts, network }: HardhatRuntimeEnvironment) {
  const { deploy } = deployments
  const { dev, treasury } = await getNamedAccounts()
  const deployer = "0xb3d1dd192868171199786b144ed4970c678adfc938bad625d02b600aae2c5959"
  const beetsDeployment = await deployments.get("OfficialToken")
  const beets: OfficialToken = (await ethers.getContractAt(
    "contracts/token/OfficialToken.sol:OfficialToken",
    beetsDeployment.address
  )) as OfficialToken

  const beetsPerBlock = bn(505, 16)

  const startBlock = process.env.DEPLOYMENT_MC_START_BLOCK

  const { address, args } = await deploy("OfficialMasterChef", {
    from: deployer,
    args: [beets.address, process.env.TREASURY_ADDRESS, beetsPerBlock, startBlock],
    log: true,
    deterministicDeployment: false,
    contract: "contracts/token/OfficialMasterChef.sol:OfficialMasterChef",
  })

  console.log("masterchef constructor args", JSON.stringify(args))

  if ((await beets.owner()) !== address) {
    // Transfer BEETS Ownership to Chef
    console.log("Transfer Official Ownership to Chef")
    await (await beets.transferOwnership(address)).wait()
  }
}
