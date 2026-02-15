// ── Base Ecosystem App Integrations ────────────────────────
// Configuration for DeFi apps on Base that agents can interact
// with to earn yield, swap tokens, and manage positions.

export interface BaseApp {
  id: string
  name: string
  description: string
  url: string
  category: "earn" | "swap" | "lend" | "stake" | "social-fi"
  contractAddresses: Record<string, `0x${string}`>
  supportedActions: string[]
  riskLevel: "low" | "medium" | "high"
  audited: boolean
  agentCompatible: boolean
}

export interface YieldOpportunity {
  id: string
  appId: string
  name: string
  type: "lending" | "liquidity" | "staking" | "vault" | "rewards"
  tokenIn: string[]
  tokenReward: string[]
  apy: number // current estimated APY %
  tvl: string // total value locked display string
  riskLevel: "low" | "medium" | "high"
  minDeposit: number // in USD
  lockPeriod: string | null // null = no lock
  autoCompound: boolean
}

// ── Supported Base Apps ────────────────────────────────────

export const BASE_APPS: BaseApp[] = [
  {
    id: "bankr",
    name: "Bankr",
    description: "AI-powered DeFi agent on Base. Automates yield farming, portfolio rebalancing, and earning strategies with natural language commands.",
    url: "https://bankr.fi",
    category: "earn",
    contractAddresses: {
      router: "0xBa5E23D18C5e241bE4931BEd4030FDB573992F83",
      vault: "0x4B1a99467A284CC690e3237bc69105956816f762",
    },
    supportedActions: ["deposit", "withdraw", "auto-earn", "rebalance", "portfolio-check"],
    riskLevel: "medium",
    audited: true,
    agentCompatible: true,
  },
  {
    id: "aerodrome",
    name: "Aerodrome",
    description: "The central trading and liquidity marketplace on Base. Provides concentrated liquidity pools, vote-locked tokenomics, and high yield LP positions.",
    url: "https://aerodrome.finance",
    category: "swap",
    contractAddresses: {
      router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
      voter: "0x16613524e02ad97eDfeF371bC883F2F5d6C480A5",
      factory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
    },
    supportedActions: ["swap", "add-liquidity", "remove-liquidity", "stake-lp", "claim-rewards"],
    riskLevel: "medium",
    audited: true,
    agentCompatible: true,
  },
  {
    id: "moonwell",
    name: "Moonwell",
    description: "Open lending and borrowing protocol on Base. Deposit assets to earn interest or borrow against your collateral at competitive rates.",
    url: "https://moonwell.fi",
    category: "lend",
    contractAddresses: {
      comptroller: "0xfBb21d0380beE3312B33c4353c8936a0F13EF26C",
      mUSDC: "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
      mETH: "0x628ff693426583D9a7FB391E54366292F509D457",
      mCbETH: "0x3bf93770f2d4a0D62751aB98d2564253C7Ea6738",
    },
    supportedActions: ["supply", "withdraw", "borrow", "repay", "claim-rewards"],
    riskLevel: "low",
    audited: true,
    agentCompatible: true,
  },
  {
    id: "uniswap-v3",
    name: "Uniswap V3",
    description: "The largest DEX deployed on Base. Concentrated liquidity positions, token swaps, and permissionless pool creation.",
    url: "https://app.uniswap.org",
    category: "swap",
    contractAddresses: {
      swapRouter: "0x2626664c2603336E57B271c5C0b26F421741e481",
      factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      positionManager: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1",
    },
    supportedActions: ["swap", "add-liquidity", "remove-liquidity", "collect-fees"],
    riskLevel: "low",
    audited: true,
    agentCompatible: true,
  },
  {
    id: "aave-v3",
    name: "Aave V3",
    description: "Battle-tested lending protocol on Base. Supply assets to earn interest, borrow with variable or stable rates, and flash loans.",
    url: "https://app.aave.com",
    category: "lend",
    contractAddresses: {
      pool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
      poolDataProvider: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
    },
    supportedActions: ["supply", "withdraw", "borrow", "repay", "flash-loan"],
    riskLevel: "low",
    audited: true,
    agentCompatible: true,
  },
  {
    id: "extra-finance",
    name: "Extra Finance",
    description: "Leveraged yield farming on Base. Amplify LP positions with borrowed capital for higher returns.",
    url: "https://app.extrafi.io",
    category: "earn",
    contractAddresses: {
      lendingPool: "0xBB505c54D71E9e599cB8435b4F0cEEc05fC71cbD",
    },
    supportedActions: ["leverage-farm", "supply", "withdraw", "repay"],
    riskLevel: "high",
    audited: true,
    agentCompatible: true,
  },
]

// ── Demo Yield Opportunities ───────────────────────────────
// These represent current opportunities agents can evaluate

export const YIELD_OPPORTUNITIES: YieldOpportunity[] = [
  {
    id: "bankr-auto-earn",
    appId: "bankr",
    name: "Bankr Auto-Earn USDC",
    type: "vault",
    tokenIn: ["USDC"],
    tokenReward: ["USDC"],
    apy: 8.4,
    tvl: "$12.3M",
    riskLevel: "medium",
    minDeposit: 10,
    lockPeriod: null,
    autoCompound: true,
  },
  {
    id: "bankr-eth-vault",
    appId: "bankr",
    name: "Bankr ETH Growth Vault",
    type: "vault",
    tokenIn: ["ETH"],
    tokenReward: ["ETH", "AERO"],
    apy: 5.2,
    tvl: "$8.7M",
    riskLevel: "medium",
    minDeposit: 0.01,
    lockPeriod: null,
    autoCompound: true,
  },
  {
    id: "moonwell-usdc-supply",
    appId: "moonwell",
    name: "Moonwell USDC Supply",
    type: "lending",
    tokenIn: ["USDC"],
    tokenReward: ["USDC", "WELL"],
    apy: 4.8,
    tvl: "$145M",
    riskLevel: "low",
    minDeposit: 1,
    lockPeriod: null,
    autoCompound: false,
  },
  {
    id: "moonwell-eth-supply",
    appId: "moonwell",
    name: "Moonwell ETH Supply",
    type: "lending",
    tokenIn: ["ETH"],
    tokenReward: ["ETH", "WELL"],
    apy: 2.1,
    tvl: "$89M",
    riskLevel: "low",
    minDeposit: 0.005,
    lockPeriod: null,
    autoCompound: false,
  },
  {
    id: "aerodrome-usdc-eth",
    appId: "aerodrome",
    name: "Aerodrome USDC/ETH LP",
    type: "liquidity",
    tokenIn: ["USDC", "ETH"],
    tokenReward: ["AERO"],
    apy: 18.7,
    tvl: "$52M",
    riskLevel: "medium",
    minDeposit: 50,
    lockPeriod: null,
    autoCompound: false,
  },
  {
    id: "aerodrome-usdc-usdbc",
    appId: "aerodrome",
    name: "Aerodrome USDC/USDbC Stable LP",
    type: "liquidity",
    tokenIn: ["USDC", "USDbC"],
    tokenReward: ["AERO"],
    apy: 6.3,
    tvl: "$34M",
    riskLevel: "low",
    minDeposit: 20,
    lockPeriod: null,
    autoCompound: false,
  },
  {
    id: "aave-usdc-supply",
    appId: "aave-v3",
    name: "Aave V3 USDC Supply",
    type: "lending",
    tokenIn: ["USDC"],
    tokenReward: ["USDC"],
    apy: 3.9,
    tvl: "$210M",
    riskLevel: "low",
    minDeposit: 1,
    lockPeriod: null,
    autoCompound: false,
  },
  {
    id: "aave-eth-supply",
    appId: "aave-v3",
    name: "Aave V3 ETH Supply",
    type: "lending",
    tokenIn: ["ETH"],
    tokenReward: ["ETH"],
    apy: 1.8,
    tvl: "$178M",
    riskLevel: "low",
    minDeposit: 0.005,
    lockPeriod: null,
    autoCompound: false,
  },
  {
    id: "extra-eth-usdc-leverage",
    appId: "extra-finance",
    name: "Extra Finance ETH/USDC 3x",
    type: "vault",
    tokenIn: ["ETH", "USDC"],
    tokenReward: ["ETH", "USDC"],
    apy: 42.1,
    tvl: "$4.2M",
    riskLevel: "high",
    minDeposit: 100,
    lockPeriod: null,
    autoCompound: true,
  },
]

// ── Helper Functions ───────────────────────────────────────

export function getAppById(id: string): BaseApp | undefined {
  return BASE_APPS.find((a) => a.id === id)
}

export function getOpportunitiesByApp(appId: string): YieldOpportunity[] {
  return YIELD_OPPORTUNITIES.filter((o) => o.appId === appId)
}

export function getOpportunitiesByRisk(risk: "low" | "medium" | "high"): YieldOpportunity[] {
  return YIELD_OPPORTUNITIES.filter((o) => o.riskLevel === risk)
}

export function getOpportunitiesByToken(token: string): YieldOpportunity[] {
  return YIELD_OPPORTUNITIES.filter((o) => o.tokenIn.includes(token))
}
