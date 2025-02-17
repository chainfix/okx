import axios from 'axios';
import CryptoJS from 'crypto-js';

const BASE_URL = 'https://www.okx.com';  // 直接使用 OKX API

// 添加请求拦截器，统一处理错误
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('请求失败:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// 生成签名
const generateSignature = (timestamp, method, requestPath, body, secretKey) => {
  const bodyStr = body ? (typeof body === 'object' ? JSON.stringify(body) : body) : '';
  const message = timestamp + method + requestPath + bodyStr;
  return CryptoJS.HmacSHA256(message, secretKey).toString(CryptoJS.enc.Base64);
};

// 创建请求头
const createHeaders = (method, path, body, apiInfo) => {
  const timestamp = new Date().toISOString();
  const signature = generateSignature(
    timestamp,
    method,
    path,
    body,
    apiInfo.secretKey
  );

  return {
    'OK-ACCESS-KEY': apiInfo.apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': apiInfo.passphrase,
    'Content-Type': 'application/json'
  };
};

// 币种到链名称的映射表
const CHAIN_MAPPINGS = {
  // Layer 1 主网
  'ETH': 'ERC20',
  'BTC': 'Bitcoin',
  'BSC': 'BSC',
  'TRX': 'TRC20',
  'SOL': 'Solana',
  'AVAX': 'AVAX-C',
  'MATIC': 'Polygon',
  'POL': 'Polygon',
  'ARBITRUM': 'Arbitrum One',
  'OP': 'Optimism',
  'FTM': 'Fantom',
  'KLAY': 'Klaytn',
  'ONE': 'Harmony',
  'CELO': 'Celo',
  'AURORA': 'Aurora',
  'ALGO': 'Algorand',
  'NEAR': 'NEAR',
  'ADA': 'Cardano',
  'XRP': 'Ripple',
  'DOT': 'Polkadot',
  'ATOM': 'Cosmos',
  
  // 稳定币在不同链上的映射
  'USDT-ERC20': 'ERC20',
  'USDT-TRC20': 'TRC20',
  'USDT-BSC': 'BSC',
  'USDT-Polygon': 'Polygon',
  'USDT-AVAX': 'AVAX-C',
  'USDT-Arbitrum': 'Arbitrum One',
  'USDT-Optimism': 'Optimism',
  'USDT-Solana': 'Solana',
  'USDT': 'ERC20',  // 默认 ERC20
  
  'USDC-ERC20': 'ERC20',
  'USDC-TRC20': 'TRC20',
  'USDC-BSC': 'BSC',
  'USDC-Polygon': 'Polygon',
  'USDC': 'ERC20',  // 默认 ERC20
  
  // 其他常见代币
  'UNI': 'ERC20',
  'LINK': 'ERC20',
  'AAVE': 'ERC20',
  'CAKE': 'BSC',
  'QUICK': 'Polygon',
  'JOE': 'AVAX-C',
  'GMX': 'Arbitrum One'
};

// 获取链名称
const getChainName = (coin) => {
  // 1. 检查完整币种名称（包括网络后缀）
  if (CHAIN_MAPPINGS[coin]) {
    return CHAIN_MAPPINGS[coin];
  }

  // 2. 如果币种包含连字符，可能是自定义网络格式
  const parts = coin.split('-');
  if (parts.length > 1) {
    const network = parts[parts.length - 1];
    // 检查是否是已知网络
    if (['ERC20', 'TRC20', 'BSC', 'Polygon', 'AVAX-C', 'Arbitrum One', 'Optimism', 'Solana'].includes(network)) {
      return network;
    }
  }

  // 3. 检查基础币种
  const baseCoin = parts[0];
  if (CHAIN_MAPPINGS[baseCoin]) {
    return CHAIN_MAPPINGS[baseCoin];
  }

  // 4. 默认返回币种名称本身
  return coin;
};

// 获取币种信息
export const getCurrencyInfo = async (apiInfo, ccy) => {
  try {
    const path = '/api/v5/asset/currencies';
    const response = await axios({
      method: 'GET',
      url: `${BASE_URL}${path}?ccy=${ccy}`,
      headers: createHeaders('GET', path, '', apiInfo)
    });

    console.log('币种信息:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('获取币种信息错误:', error.response?.data);
    throw new Error(error.response?.data?.msg || error.message);
  }
};

// 获取余额
export const getBalances = async (apiInfo) => {
  try {
    const path = '/api/v5/asset/balances';
    
    const response = await axios({
      method: 'GET',
      url: `${BASE_URL}${path}`,
      headers: createHeaders('GET', path, '', apiInfo)
    });

    if (response.data.code === '0') {
      return response.data.data;
    } else {
      console.error('API 错误:', {
        code: response.data.code,
        msg: response.data.msg,
        path,
        timestamp: new Date().toISOString()
      });
      throw new Error(response.data.msg || '请求失败');
    }
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('API 密钥无效或未授权，请检查 API 密钥配置');
    }
    throw new Error(error.response?.data?.msg || error.message);
  }
};

// 提现请求
export const withdraw = async (apiInfo, coin, address, amount) => {
  try {
    const path = '/api/v5/asset/withdrawal';
    const baseCoin = coin.split('-')[0];  // 基础币种名称
    const chainName = coin.includes('-') ? coin : baseCoin;  // 如果有指定网络就用完整名称，否则用基础币种
    
    console.log('提现请求参数:', {
      coin,
      baseCoin,
      chainName,
      amount,
      address
    });

    const body = {
      ccy: baseCoin,
      amt: amount.toString(),
      dest: '4',
      toAddr: address,
      chain: chainName
    };

    const requestBody = JSON.stringify(body);
    console.log('发送请求:', {
      url: `${BASE_URL}${path}`,
      method: 'POST',
      body: requestBody,
      headers: {
        'OK-ACCESS-KEY': apiInfo.apiKey,
        'OK-ACCESS-TIMESTAMP': new Date().toISOString()
      }
    });

    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}${path}`,
      headers: createHeaders('POST', path, requestBody, apiInfo),
      data: body
    });

    if (response.data.code === '0') {
      const result = response.data.data[0];
      console.log('提现成功:', result);
      return {
        wdId: result.wdId,
        clientId: result.clientId,
        chain: result.chain,
        amt: result.amt,
        fee: result.fee
      };
    } else {
      console.error('提现失败:', {
        code: response.data.code,
        msg: response.data.msg,
        data: response.data,
        requestBody: body
      });
      throw new Error(response.data.msg || '提现请求失败');
    }
  } catch (error) {
    // 处理不同类型的错误
    if (error.response?.status === 400) {
      console.error('提现参数错误:', {
        data: error.response.data,
        coin,
        chain: chainName,
        requestBody: body
      });
      throw new Error(`提现参数错误: ${error.response.data.msg || '请检查币种和链的配置'}`);
    } else if (error.response?.status === 401) {
      throw new Error('API 密钥无效或未授权，请检查 API 密钥配置');
    } else {
      console.error('提现错误:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        requestBody: body
      });
    }
    throw new Error(error.response?.data?.msg || error.message);
  }
};

// 获取对应的链网络
const getChainNetwork = (coin) => {
  // 直接使用币种名作为网络名
  // 如果币种包含连字符，取最后一部分作为网络名
  const parts = coin.split('-');
  return parts[parts.length - 1] || coin;
}; 