import { ethers } from 'ethers';

// Minimal ABI untuk fungsi transfer ERC20 (Stablecoin kamu)
const minABI = [
    "function transfer(address to, uint amount) returns (bool)"
];

export const POST = async ({ request }) => {
    try {
        const data = await request.json();
        const { address } = data;

        // Validasi input
        if (!address) {
            return new Response(JSON.stringify({ error: 'Address is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Pastikan format address valid
        if (!ethers.isAddress(address)) {
            return new Response(JSON.stringify({ error: 'Invalid Ethereum address format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Ambil variabel dari environment (.env)
        // Di Astro SSR, import.meta.env digunakan untuk mengakses variabel environment
        const PRIVATE_KEY = import.meta.env.PRIVATE_KEY;
        const RPC_URL = import.meta.env.RPC_URL;
        const CONTRACT_ADDRESS = import.meta.env.CONTRACT_ADDRESS;
        const FAUCET_AMOUNT = import.meta.env.FAUCET_AMOUNT || "10"; // Default 10 jika tidak diatur

        // Validasi setup .env
        if (!PRIVATE_KEY || !RPC_URL || !CONTRACT_ADDRESS) {
            console.error("Missing Environment Variables:", {
                pk: !!PRIVATE_KEY,
                rpc: !!RPC_URL,
                contract: !!CONTRACT_ADDRESS
            });
            return new Response(JSON.stringify({ error: 'Server configuration error. Missing environment variables.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Setup Provider (koneksi ke blockchain)
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // 2. Setup Wallet (akun yang akan ngirim token)
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

        // 3. Setup Contract (interaksi dengan stablecoin kamu)
        const contract = new ethers.Contract(CONTRACT_ADDRESS, minABI, wallet);

        // 4. Konversi jumlah pengiriman ke satuan terkecil (Wei) - asumsi 18 desimal
        // Sesuaikan parseUnits jika stablecoin kamu punya desimal yang berbeda (misal USDC biasanya 6 desimal)
        const amountToSend = ethers.parseUnits(FAUCET_AMOUNT, 18);

        console.log(`Sending ${FAUCET_AMOUNT} tokens to ${address}...`);

        // 5. Eksekusi fungsi transfer di smart contract
        const tx = await contract.transfer(address, amountToSend);

        console.log(`Transaction sent! Hash: ${tx.hash}`);

        // (Opsional) Tunggu sampai transaksi selesai dikonfirmasi di blockchain
        // const receipt = await tx.wait();
        // console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

        // Kembalikan response sukses
        return new Response(JSON.stringify({
            success: true,
            message: `Berhasil mengirim ${FAUCET_AMOUNT} tokens!`,
            txHash: tx.hash
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Faucet Error:', error);

        // Ambil pesan error spesifik dari smart contract (jika ada)
        const reason = error.reason || error.shortMessage || error.message;

        return new Response(JSON.stringify({
            error: 'Terjadi kesalahan saat memproses permintaan',
            details: reason
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
