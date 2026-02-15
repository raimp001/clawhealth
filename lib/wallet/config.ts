// ── Base Chain Wallet Configuration ────────────────────────
// Tokens, contracts, and chain config for Base L2 interactions

// ── Well-known Token Addresses on Base ─────────────────────
export const BASE_TOKENS = {
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
    decimals: 18,
    address: "0x0000000000000000000000000000000000000000" as const, // native
    coingeckoId: "ethereum",
    logo: "/tokens/eth.svg",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const,
    coingeckoId: "usd-coin",
    logo: "/tokens/usdc.svg",
  },
  USDbC: {
    symbol: "USDbC",
    name: "USD Base Coin",
    decimals: 6,
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" as const,
    coingeckoId: "bridged-usd-coin-base",
    logo: "/tokens/usdbc.svg",
  },
  WETH: {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    address: "0x4200000000000000000000000000000000000006" as const,
    coingeckoId: "weth",
    logo: "/tokens/weth.svg",
  },
  cbETH: {
    symbol: "cbETH",
    name: "Coinbase Wrapped Staked ETH",
    decimals: 18,
    address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22" as const,
    coingeckoId: "coinbase-wrapped-staked-eth",
    logo: "/tokens/cbeth.svg",
  },
  AERO: {
    symbol: "AERO",
    name: "Aerodrome Finance",
    decimals: 18,
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631" as const,
    coingeckoId: "aerodrome-finance",
    logo: "/tokens/aero.svg",
  },
} as const

export type TokenSymbol = keyof typeof BASE_TOKENS

// ── Agent Wallet Configuration ─────────────────────────────
// Each agent that handles financial operations gets a managed wallet

export interface AgentWalletConfig {
  agentId: string
  label: string
  permissions: WalletPermission[]
  spendingLimit: { daily: number; perTx: number } // in USDC
  allowedApps: string[] // app IDs from BASE_APPS
  autoCompound: boolean
}

export type WalletPermission =
  | "send"
  | "receive"
  | "swap"
  | "stake"
  | "lend"
  | "borrow"
  | "bridge"
  | "earn"

export const AGENT_WALLET_CONFIGS: AgentWalletConfig[] = [
  {
    agentId: "billing",
    label: "Vera (Billing)",
    permissions: ["send", "receive"],
    spendingLimit: { daily: 500, perTx: 100 },
    allowedApps: [],
    autoCompound: false,
  },
  {
    agentId: "rx",
    label: "Maya (Rx Manager)",
    permissions: ["send", "receive"],
    spendingLimit: { daily: 200, perTx: 50 },
    allowedApps: [],
    autoCompound: false,
  },
  {
    agentId: "defi",
    label: "Knox (DeFi Agent)",
    permissions: ["send", "receive", "swap", "stake", "lend", "earn"],
    spendingLimit: { daily: 5000, perTx: 1000 },
    allowedApps: ["bankr", "aerodrome", "moonwell", "uniswap-v3", "aave-v3"],
    autoCompound: true,
  },
]

// ── ERC-20 ABI (minimal for balance + approve + transfer) ──
export const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const
