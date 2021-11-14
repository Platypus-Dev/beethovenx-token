import { HardhatRuntimeEnvironment } from "hardhat/types"

export default async function ({ ethers, getNamedAccounts, deployments }: HardhatRuntimeEnvironment) {
  const { deploy } = deployments

  const deployer = "0xD0DF68f0149C3e662Df772CF40cB63070591AD36"

  const { address, args, receipt } = await deploy("Timelock", {
    from: deployer,
    log: true,
    deterministicDeployment: false,
    args: [deployer, 21600],
  })

  console.log("timelock constructor args", JSON.stringify(args))
}
