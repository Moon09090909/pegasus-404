import express from "express";
import fs from "fs";
import solc from "solc";
import { ethers } from "ethers";
import axios from "axios";
var solc_version = "v0.8.24+commit.e11b9ed9";

const app = express();

// Read the Solidity source code from a file
const originalContractPath = "Pegasus404.sol";
const originalContractName = "Pegasus404";
const contractSource = fs.readFileSync(originalContractPath, "utf8");

const provider = new ethers.providers.JsonRpcProvider(
  "https://sepolia.infura.io/v3/a1600d7aad9641dfac6833a8ff4e2bc8"
);

app.get("/deployContract", async (req, res) => {
  var compiledContract;
  var input;
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
    input = {
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

    solc.loadRemoteVersion(solc_version, function (err, solc_specific) {
      if (!err) {
        compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));
        // Move the deployContract function outside the callback
        //deployContract();
      }
    });

    compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));

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
      tokenURI
    );
    await contract.deployed();

    console.log("Contract deployed to address:", contract.address);

    console.log("Waiting for 50 seconds before verification...");
    await new Promise((resolve) => setTimeout(resolve, 50000));

    const constructorArgs = [
      wallet.address,
      initialSupply,
      decimal,
      buyLimit,
      sellLimit,
      txLimit,
      name,
      symbol,
      tokenURI,
    ];

    // Define the types of the constructor parameters in the correct order
    const types = [
      "address",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "string",
      "string",
      "string",
    ];

    // ABI-encode constructor arguments
    const abiEncodedArgs = ethers.utils.defaultAbiCoder.encode(
      types,
      constructorArgs
    );

    const constructorArguments = abiEncodedArgs.slice(2);

    axios
      .post(
        "https://api-sepolia.etherscan.io/api",
        new URLSearchParams({
          apikey: "5389T49K56FSXCEVAG57NIWWN79QMAXQCC",
          module: "contract",
          action: "verifysourcecode",
          contractaddress: contract.address,
          sourceCode: contractSource,
          codeformat: "solidity-single-file",
          contractname: originalContract,
          compilerversion: solc_version,
          optimizationUsed: 0,
          runs: 200,
          constructorArguements: constructorArguments,
          evmversion: "",
          licenceType: 3,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      .then((res) => {
        console.log(res.data);
      })
      .catch((error) => {
        console.error(error.response.data);
      });

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
      "ETH"
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
