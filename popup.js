// Import thư viện (cách import có thể khác nhau tùy vào module system của bạn)
import { connect, disconnect } from 'starknetkit'; // starknetkit là một thư viện tiện ích tốt
// Hoặc nếu dùng trực tiếp starknet.js và các ví inject vào window:
// import { StarknetWindowObject, connect as connectWallet } from 'get-starknet';

// Biến để lưu trữ thông tin kết nối
let connection = null; 
let userAccount = null;
let userAddress = null;

// Hàm để xử lý việc kết nối ví
async function handleConnectWallet() {
    try {
        // Sử dụng starknetkit (khuyến nghị vì nó xử lý nhiều ví)
        console.log("Đang thử kết nối ví...");
        connection = await connect({ modalMode: "alwaysAsk" }); // "alwaysAsk" sẽ luôn hiện modal chọn ví
                                                              // "neverAsk" sẽ cố kết nối ví đã chọn trước đó
                                                              // Bỏ qua modalMode nếu chỉ muốn dùng ví mặc định

        if (connection && connection.isConnected) {
            userAccount = connection.account; // Đối tượng account để tương tác
            userAddress = connection.selectedAddress; // Địa chỉ ví của người dùng

            console.log("Đã kết nối thành công!");
            console.log("Địa chỉ ví:", userAddress);
            console.log("Provider:", connection.provider);
            
            // TODO: Cập nhật UI của game để hiển thị trạng thái đã kết nối, địa chỉ ví, v.v.
            // Ví dụ:
            document.getElementById('connectButton').style.display = 'none';
            document.getElementById('disconnectButton').style.display = 'block';
            document.getElementById('walletAddress').innerText = `Ví đã kết nối: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            
            // Bạn có thể lưu thông tin kết nối vào localStorage để tự động kết nối lại lần sau
            // localStorage.setItem('starknet_connected_wallet_id', connection.id);

        } else {
            console.log("Người dùng đã hủy kết nối hoặc có lỗi.");
            // TODO: Xử lý trường hợp người dùng đóng popup ví hoặc không chọn ví
        }

    } catch (error) {
        console.error("Lỗi khi kết nối ví:", error);
        // TODO: Hiển thị thông báo lỗi cho người dùng trên UI game
        alert(`Lỗi kết nối ví: ${error.message}`);
    }
}

// Hàm để ngắt kết nối ví
async function handleDisconnectWallet() {
    try {
        if (connection) {
            await disconnect({ clearLastUsedWallet: true }); // Xóa thông tin ví đã kết nối trước đó
            connection = null;
            userAccount = null;
            userAddress = null;
            console.log("Đã ngắt kết nối ví.");

            // TODO: Cập nhật UI của game về trạng thái chưa kết nối
            document.getElementById('connectButton').style.display = 'block';
            document.getElementById('disconnectButton').style.display = 'none';
            document.getElementById('walletAddress').innerText = 'Chưa kết nối ví';
        }
    } catch (error) {
        console.error("Lỗi khi ngắt kết nối ví:", error);
    }
}


// --- HTML mẫu để kích hoạt ---
// <button id="connectButton">Liên kết Ví StarkNet</button>
// <button id="disconnectButton" style="display:none;">Ngắt Kết Nối</button>
// <p id="walletAddress">Chưa kết nối ví</p>

// --- Gán sự kiện cho button ---
// Đảm bảo DOM đã được tải trước khi gán sự kiện
document.addEventListener('DOMContentLoaded', (event) => {
    const connectBtn = document.getElementById('connectButton');
    if (connectBtn) {
        connectBtn.addEventListener('click', handleConnectWallet);
    }

    const disconnectBtn = document.getElementById('disconnectButton');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', handleDisconnectWallet);
    }

    // (Tùy chọn) Thử tự động kết nối nếu người dùng đã kết nối trước đó
    // (cần kiểm tra localStorage hoặc cách starknetkit lưu trữ)
    // connect({ modalMode: "neverAsk" }).then(conn => {
    //    if (conn && conn.isConnected) {
    //        connection = conn;
    //        userAccount = conn.account;
    //        userAddress = conn.selectedAddress;
    //        // Cập nhật UI
    //    }
    // }).catch(e => console.log("Không tự động kết nối được:", e));
});