import { HardhatRuntimeEnvironment } from "hardhat/types"
import { OfficialMasterChef, OfficialToken, Timelock } from "../types"

export default async function ({ ethers, getNamedAccounts, deployments }: HardhatRuntimeEnvironment) {
  const { deploy } = deployments
  const deployer = "0xD0DF68f0149C3e662Df772CF40cB63070591AD36"

  const beetsDeployment = await deployments.get("OfficialToken")
  const beets: OfficialToken = (await ethers.getContractAt(
    "contracts/token/OfficialToken.sol:OfficialToken",
    beetsDeployment.address
  )) as OfficialToken


  await deploy("MasterChefLpTokenTimelock", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    args: [beets.address, deployer, 1637022623, "0xF3af4de70e1afb4E998BEa88177CdF31BDab5b69", 1000000],
    contract: "contracts/vesting/MasterChefLpTokenTimelock.sol:MasterChefLpTokenTimelock",
    gasLimit: 4500000
  })
}
