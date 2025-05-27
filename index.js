const { Account, RpcProvider, CallData, shortString, uint256, num, Contract } = require("starknet");
const fs = require('fs');
require('dotenv').config(); // Để sử dụng biến môi trường cho private key

// --- Cấu hình ---
// Thay đổi nodeUrl để deploy lên mạng khác (ví dụ: Sepolia)
// Devnet (mặc định):
const NODE_URL = process.env.STARKNET_NODE_URL || 'http://127.0.0.1:5050/rpc';
// Sepolia Testnet (ví dụ, thay bằng RPC của bạn):
// const NODE_URL = 'https://starknet-sepolia.public.blastapi.io/rpc/v0_6';
// const NODE_URL = 'YOUR_SEPOLIA_RPC_ENDPOINT_FROM_INFURA_OR_ALCHEMY';

// Tài khoản để deploy. Đảm bảo có đủ gas/ETH trên mạng tương ứng.
// **QUAN TRỌNG**: Không bao giờ hardcode private key trong code production. Sử dụng biến môi trường.
const PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY_DEVNET || '0x056903ff462bec69be1593b04eb3e7154b685f5cb680c558d0831c35c452a318'; // Ví dụ cho devnet
const ACCOUNT_ADDRESS = process.env.STARKNET_ACCOUNT_ADDRESS_DEVNET || '0x03289de1a2058b98137dd0041aed004a44ab3d6c6379286c1914bf08a2243249'; // Ví dụ cho devnet

// Đường dẫn đến tệp Sierra và CASM của hợp đồng đã biên dịch
const SIERRA_PATH = 'target/dev/test_BTECToken.contract_class.json'; // Thay đổi nếu tên tệp hoặc đường dẫn khác
const CASM_PATH = 'target/dev/test_BTECToken.compiled_contract_class.json'; // Thay đổi nếu tên tệp hoặc đường dẫn khác

// --- Tham số Constructor cho hợp đồng BTECToken ---
// Điều chỉnh các giá trị này cho phù hợp với token của bạn
const TOKEN_NAME = "BTEC";
const TOKEN_SYMBOL = "BTEC";
const TOKEN_DECIMALS = 18; // Số chữ số thập phân của token
const INITIAL_SUPPLY_UNITS = 1000000; // Ví dụ: 1 triệu token (chưa tính decimals)
const RECIPIENT_ADDRESS = ACCOUNT_ADDRESS; // Địa chỉ nhận toàn bộ supply ban đầu

// Tính toán initial supply với decimals
const INITIAL_SUPPLY_WITH_DECIMALS = BigInt(INITIAL_SUPPLY_UNITS) * (BigInt(10) ** BigInt(TOKEN_DECIMALS));

async function main() {
    // 1. Kết nối Provider
    const provider = new RpcProvider({ nodeUrl: NODE_URL });
    console.log(`Connected to StarkNet node: ${NODE_URL}`);

    // 2. Kết nối Account
    if (!PRIVATE_KEY || !ACCOUNT_ADDRESS) {
        console.error("Vui lòng cung cấp STARKNET_PRIVATE_KEY và STARKNET_ACCOUNT_ADDRESS trong file .env hoặc trực tiếp.");
        return;
    }
    const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY, "1"); // "1" là cairo version cho Account
    console.log(`Using account: ${ACCOUNT_ADDRESS}`);

    // (Tùy chọn) Kiểm tra số dư tài khoản
    try {
        const balance = await account.getBalance();
        console.log(`Account balance: ${num.formatEther(balance)} ETH (approx)`);
        if (num.toBigInt(balance) === 0n && NODE_URL.includes('sepolia')) {
            console.warn("Account balance is 0 on Sepolia. Deployment will likely fail. Please fund your account.");
        }
    } catch (e) {
        console.warn("Could not fetch account balance:", e.message);
    }


    // 3. Đọc tệp Sierra và CASM
    let compiledSierra, compiledCasm;
    try {
        compiledSierra = JSON.parse(fs.readFileSync(SIERRA_PATH, 'utf8'));
        compiledCasm = JSON.parse(fs.readFileSync(CASM_PATH, 'utf8'));
        console.log(`Loaded contract artifacts: ${SIERRA_PATH} and ${CASM_PATH}`);
    } catch (error) {
        console.error("Lỗi đọc tệp contract artifacts:", error.message);
        console.error("Hãy đảm bảo bạn đã chạy `scarb build` và đường dẫn tệp là chính xác.");
        return;
    }

    // 4. Chuẩn bị Constructor Calldata
    // Tên các tham số (name, symbol, fixed_supply, recipient) phải khớp với tên trong constructor của hợp đồng Cairo
    const constructorArgs = {
        name: shortString.encodeShortString(TOKEN_NAME), // Sử dụng shortString.encodeShortString cho felt
        // Nếu constructor nhận ByteArray: byteArray.byteArrayFromString(TOKEN_NAME)
        symbol: shortString.encodeShortString(TOKEN_SYMBOL), // Tương tự như name
        // initial_supply: uint256.bnToUint256(INITIAL_SUPPLY_WITH_DECIMALS), // Đổi tên nếu constructor là initial_supply
        fixed_supply: uint256.bnToUint256(INITIAL_SUPPLY_WITH_DECIMALS), // Giả sử tên là fixed_supply
        recipient: RECIPIENT_ADDRESS,
        // Thêm các tham số khác nếu constructor của bạn yêu cầu
        // ví dụ: decimals: TOKEN_DECIMALS, (nếu constructor nhận decimals)
    };

    // Sử dụng CallData để compile constructor arguments dựa trên ABI
    // Điều này đảm bảo thứ tự và kiểu dữ liệu chính xác
    const contractCallData = new CallData(compiledSierra.abi);
    let constructorCalldata;
    try {
        // Tên hàm constructor trong Cairo (thường là "constructor" hoặc "initializer")
        // Kiểm tra ABI của bạn nếu không chắc chắn.
        const constructorFunctionAbi = compiledSierra.abi.find(
            (item) => item.type === "constructor" || (item.type === "function" && item.name === "initializer") // Hoặc tên constructor cụ thể
        );

        if (!constructorFunctionAbi) {
            console.error("Không tìm thấy ABI cho constructor (hoặc initializer) trong tệp Sierra.");
            return;
        }
        const constructorName = constructorFunctionAbi.name; // Sẽ là "constructor" hoặc tên bạn đặt

        constructorCalldata = contractCallData.compile(constructorName, constructorArgs);
        console.log(`Constructor calldata compiled for function '${constructorName}':`, constructorCalldata);
    } catch (error) {
        console.error("Lỗi khi compile constructor calldata:", error.message);
        console.log("Kiểm tra lại tên và kiểu dữ liệu của các tham số constructor trong hợp đồng Cairo và trong `constructorArgs`.");
        console.log("ABI của constructor mong đợi:", compiledSierra.abi.find(item => item.type === "constructor"));
        console.log("Tham số đã cung cấp:", constructorArgs);
        return;
    }


    // 5. Declare và Deploy hợp đồng
    console.log("🚀 Declaring and Deploying contract...");
    try {
        const declareAndDeployResponse = await account.declareAndDeploy({
            contract: compiledSierra,
            casm: compiledCasm,
            constructorCalldata: constructorCalldata,
            // salt: stark.randomAddress(), // Tùy chọn: để có địa chỉ hợp đồng xác định hơn hoặc tránh xung đột
            // unique: true, // Mặc định là true, đảm bảo class hash là duy nhất
        });

        const classHash = declareAndDeployResponse.declare.class_hash;
        const contractAddress = declareAndDeployResponse.deploy.contract_address;
        const deployTxHash = declareAndDeployResponse.deploy.transaction_hash;

        console.log(`Contract class declared. Class Hash: ${classHash}`);
        console.log(`Contract deployment transaction sent. Transaction Hash: ${deployTxHash}`);
        console.log(`Waiting for deployment transaction to be accepted on StarkNet...`);

        await provider.waitForTransaction(deployTxHash);

        console.log(`Contract deployed successfully!`);
        console.log(`Class Hash: ${classHash}`);
        console.log(`Contract Address: ${contractAddress}`);

        // (Tùy chọn) Tương tác với hợp đồng sau khi deploy
        // const deployedContract = new Contract(compiledSierra.abi, contractAddress, account);
        // const tokenNameFromContract = await deployedContract.name(); // Giả sử có hàm name()
        // console.log("🔍 Token Name (from contract):", shortString.decodeShortString(num.toHex(tokenNameFromContract)));

    } catch (error) {
        console.error(" Deployment failed:", error);
        if (error.message) {
            console.error("Error message:", error.message);
        }
        // Starknet.js có thể trả về lỗi với thông tin chi tiết hơn trong error.response.data
        if (error.response && error.response.data) {
            console.error("Error data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

main().catch(e => {
    console.error("Unhandled error in main execution:", e);
    process.exit(1);
});