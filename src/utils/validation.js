// 地址格式验证
export const validateAddress = (address, coin) => {
  // EVM链地址格式
  const evmPattern = /^0x[a-fA-F0-9]{40}$/;
  // Solana地址格式
  const solanaPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  const patterns = {
    // 比特币系列
    'BTC': /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/,
    'BCH': /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bitcoincash:[qp][a-z0-9]{41}$/,
    'LTC': /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    
    // EVM链系列
    'ETH': evmPattern,
    'USDT': evmPattern,  // ERC20
    'AVAX': evmPattern,  // AVAX C-Chain
    'BNB': evmPattern,   // BSC
    'MATIC': evmPattern, // Polygon
    'ARB': evmPattern,   // Arbitrum
    'OP': evmPattern,    // Optimism
    
    // 其他公链
    'SOL': solanaPattern,
    'TRX': /^T[A-Za-z1-9]{33}$/,     // TRON
    'DOT': /^[1-9A-HJ-NP-Za-km-z]{47,48}$/,  // Polkadot
    'ADA': /^addr1[a-zA-Z0-9]{98}$/,  // Cardano
  };

  // 检查是否是EVM链地址
  if (evmPattern.test(address)) {
    return true;
  }

  // 检查是否是Solana地址
  if (solanaPattern.test(address)) {
    return true;
  }

  // 检查是否匹配特定币种的格式
  if (patterns[coin] && !patterns[coin].test(address)) {
    throw new Error(`无效的${coin}地址格式`);
  }

  // 如果都不匹配，但地址长度在合理范围内，也认为是有效的
  if (address.length >= 30 && address.length <= 100) {
    return true;
  }

  throw new Error(`无效的地址格式`);
};

// 金额验证
export const validateAmount = (amount, balance, coin) => {
  // 默认最小提现金额
  const defaultMinAmount = 0.0001;

  if (isNaN(amount) || amount <= 0) {
    throw new Error('金额必须大于0');
  }

  if (amount > parseFloat(balance)) {
    throw new Error('余额不足');
  }

  const minAmount = defaultMinAmount;
  if (amount < minAmount) {
    throw new Error(`最小提现金额为 ${minAmount} ${coin}`);
  }

  return true;
}; 