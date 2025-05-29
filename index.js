const { Account, RpcProvider, CallData, byteArray, uint256, json } = require("starknet");
const fs = require('fs');

async function myTestFunction() {
    const provider = new RpcProvider({ NodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/Vav5r6Qa2sF1ZvmMQBCHCm6GkynSvW3C' }); //rpc provider for Sepolia testnet ở web alchemy

    // connect your account. To adapt to your own account:
    const privateKey0 = "0x056903ff462bec69be1593b04eb3e7154b685f5cb680c558d0831c35c452a318"; //lấy private key từ ví của bạn
    const account0Address = '0x03289de1a2058b98137dd0041aed004a44ab3d6c6379286c1914bf08a2243249';// địa chỉ ví của bạn
    const account0 = new Account(provider, account0Address, privateKey0);

    // Declare & deploy Test contract in devnet
    const compiledTestSierra = json.parse(
        fs.readFileSync('./target/dev/test_BTECToken.contract_class.json').toString('ascii')
    );
    const compiledTestCasm = json.parse(
        fs.readFileSync('./target/dev/test_BTECToken.compiled_contract_class.json').toString('ascii')
    );

    const myArray1 = ['0x0a', 24, 36n];
    const contractCallData = new CallData(compiledTestSierra.abi);
    const contractConstructor = contractCallData.compile('constructor', {
        name: "BTECToken",
        symbol: "BTEC",
        fixed_supply: uint256.bnToUint256("1000000"),
        recipient: "0x03289de1a2058b98137dd0041aed004a44ab3d6c6379286c1914bf08a2243249",// địa chỉ ví của bạn
    });

    const deployResponse = await account0.declareAndDeploy({
        contract: compiledTestSierra,
        casm: compiledTestCasm,
        constructorCalldata: contractConstructor,
    });
}

myTestFunction()