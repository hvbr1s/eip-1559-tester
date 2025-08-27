import { ethers } from "ethers";
import dotenv from "dotenv"

dotenv.config()

const RPC_URL = "https://bsc.blockrazor.xyz";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const TO = process.env.TO!;                        
const AMOUNT_BNB = "0.0001"; 

async function main() {
  if (!PRIVATE_KEY || !TO) throw new Error("Set PRIVATE_KEY and TO env vars.");

  const provider = new ethers.JsonRpcProvider(RPC_URL, { name: "bsc", chainId: 56 });
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  const value = ethers.parseEther(AMOUNT_BNB);
  const gasLimit = await provider.estimateGas({ from: wallet.address, to: TO, value });

  const fd = await provider.getFeeData();
  const fallbackTip = fd.maxPriorityFeePerGas ?? fd.gasPrice ?? ethers.parseUnits("3", "gwei");
  const maxPriorityFeePerGas = fd.maxPriorityFeePerGas ?? fallbackTip;
  const maxFeePerGas = fd.maxFeePerGas ?? fallbackTip;

  // we try EIP-1559 (type-2). If node rejects we fall back to legacy
  try {
    const tx = await wallet.sendTransaction({
        to: TO,
        value,
        gasLimit,
        chainId: 56,
        type: 2,
        maxPriorityFeePerGas,
        maxFeePerGas,
    });
    console.log("Sent type-2 tx:", tx.hash);
    console.log(`Track: https://bscscan.com/tx/${tx.hash}`);
    await tx.wait();
    console.log("Confirmed.");
  } catch (e) {
    console.warn("Type-2 failed on this endpoint, retrying legacy gasPrice…", (e as Error).message);
    // const gasPrice = fd.gasPrice ?? fallbackTip;
    // const tx = await wallet.sendTransaction({ ...base, gasPrice });
    // console.log("Sent legacy tx:", tx.hash);
    // console.log(`Track: https://bscscan.com/tx/${tx.hash}`);
    // await tx.wait();
    // console.log("Confirmed.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});