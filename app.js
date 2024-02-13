import express from "express";
import fs from "fs";
import solc from "solc";
import { ethers } from "ethers";
const app = express();

// Read the Solidity source code from a file
const originalContractPath = "Pegasus404.sol";
const contractSource = fs.readFileSync(originalContractPath, "utf8");

const provider = new ethers.providers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/f1bce26246144cd8a71865e3341cb792",
);

app.get("/deployContract", async (req, res) => {
  try {
    // Extract parameters from the query string
    const {
      privateKey,
      initialSupply,
      decimal,
      buyLimit,
      sellLimit,
      txLimit,
      name,
      symbol,
      tokenURI,
    } = req.query;

    const wallet = new ethers.Wallet(privateKey, provider);
    const owner = wallet.address;

    // Create a copy of Sugar.sol and name it according to contractName
    const contractName = name; // Replace with your actual contract name
    const newContractPath = `${contractName}.sol`;

    fs.writeFileSync(newContractPath, contractSource);

    // Compile the Solidity source code
    const input = {
      language: "Solidity",
      sources: {
        [newContractPath]: {
          content: contractSource,
        },
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode.object"],
          },
        },
      },
    };

    const compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));

    console.log(compiledContract);
    const contractOutput =
      compiledContract.contracts[newContractPath]["Pegasus404"];

    const abi = contractOutput.abi;
    const bytecode = contractOutput.evm.bytecode.object;

    // Contract deployment
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy(
      owner,
      initialSupply,
      decimal,
      buyLimit,
      sellLimit,
      txLimit,
      name,
      symbol,
      tokenURI,
    );
    await contract.deployed();

    console.log("Contract deployed to address:", contract.address);

    res.status(200).json({
      message: "Contract deployed successfully",
      contractAddress: contract.address,
    });
  } catch (error) {
    console.error("Error deploying contract:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

// Route to generate a new Ethereum wallet
app.get("/generateWallet", (req, res) => {
  try {
    // Generate a new Ethereum wallet
    const wallet = ethers.Wallet.createRandom();

    // Display the wallet information
    console.log("Address:", wallet.address);
    console.log("Private Key:", wallet.privateKey);

    res.status(200).json({
      message: "true",
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
  } catch (error) {
    console.error("Error generating wallet:", error.message);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

app.get("/checkBalance/:address", async (req, res) => {
  try {
    // Extract wallet address from route parameters
    const walletAddress = req.params.address;

    // Get the balance of the wallet
    const balance = await provider.getBalance(walletAddress);

    // Display the balance
    console.log(
      "Balance of wallet",
      walletAddress,
      ":",
      ethers.utils.formatEther(balance),
      "ETH",
    );

    // Respond with JSON
    res.status(200).json({
      message: "true",
      walletAddress: walletAddress,
      balance: ethers.utils.formatEther(balance),
    });
  } catch (error) {
    console.error("false", error.message);

    // Respond with JSON in case of an error
    res.status(500).json({
      error: "Error checking balance",
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
