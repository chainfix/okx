import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  TextField, 
  Button, 
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Box
} from '@mui/material';
import { validateAddress, validateAmount } from '../utils/validation';
import { withdraw, getCurrencyInfo, getWithdrawalFee } from '../services/api';

// 链网络选项
const NETWORK_OPTIONS = {
  'USDT': [
    { value: 'ERC20', label: 'ERC20 (ETH)' },
    { value: 'TRC20', label: 'TRC20 (TRON)' },
    { value: 'BSC', label: 'BSC (BNB Chain)' },
    { value: 'Polygon', label: 'Polygon (MATIC)' },
    { value: 'AVAX-C', label: 'Avalanche C-Chain' },
    { value: 'Arbitrum One', label: 'Arbitrum' },
    { value: 'Optimism', label: 'Optimism' },
    { value: 'Solana', label: 'Solana' }
  ],
  'USDC': [
    { value: 'ERC20', label: 'ERC20 (ETH)' },
    { value: 'TRC20', label: 'TRC20 (TRON)' },
    { value: 'BSC', label: 'BSC (BNB Chain)' },
    { value: 'Polygon', label: 'Polygon (MATIC)' }
  ],
  'POL': [
    { value: 'Polygon', label: 'Polygon' }  // POL 只支持 Polygon 网络
  ]
};

const WithdrawForm = ({ apiInfo, balances, onWithdrawStatusUpdate }) => {
  const [formData, setFormData] = useState({
    coin: '',
    network: '',
    minAmount: '0',
    maxAmount: '0',
    decimals: '2',
    minDelay: '1',
    maxDelay: '5',
    addresses: ''
  });

  const [loading, setLoading] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);
  const [networks, setNetworks] = useState([]);
  const withdrawPromiseRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 获取币种支持的网络和手续费信息
  useEffect(() => {
    const fetchCurrencyInfo = async () => {
      if (!apiInfo || !formData.coin) return;
      
      try {
        setLoading(true);
        const currencyInfo = await getCurrencyInfo(apiInfo);
        const coinNetworks = currencyInfo.filter(info => info.ccy === formData.coin);
        setNetworks(coinNetworks);
      } catch (error) {
        console.error('获取币种信息失败:', error);
        alert(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrencyInfo();
  }, [apiInfo, formData.coin]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'coin') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        network: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const generateRandomAmount = () => {
    const { minAmount, maxAmount, decimals, addresses } = formData;
    if (!addresses.trim()) {
      alert('请先输入提现地址');
      return;
    }

    const min = parseFloat(minAmount);
    const max = parseFloat(maxAmount);
    const dec = parseInt(decimals);

    if (isNaN(min) || isNaN(max) || min >= max) {
      alert('请输入有效的金额范围');
      return;
    }

    const updatedAddresses = addresses.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [address] = line.split(',');
        if (!address.trim()) return null;
        const amount = (Math.random() * (max - min) + min).toFixed(dec);
        return `${address.trim()},${amount}`;
      })
      .filter(Boolean)
      .join('\n');

    setFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  const getCurrentBalance = () => {
    const selectedCoin = balances.find(b => b.ccy === formData.coin);
    return selectedCoin ? selectedCoin.availBal : '0';
  };

  const handleSubmit = async () => {
    if (!apiInfo) {
      alert('请先配置API信息');
      return;
    }

    if (!formData.coin) {
      alert('请选择币种');
      return;
    }

    if (!formData.network) {
      alert('请选择网络');
      return;
    }

    if (!formData.addresses.trim()) {
      alert('请输入提现地址');
      return;
    }

    setLoading(true);
    setIsWithdrawing(true);
    setShouldStop(false);
    onWithdrawStatusUpdate([]);
    
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      const addressList = formData.addresses.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [address, amount] = line.split(',');
          return { 
            address: address.trim(), 
            amount: parseFloat(amount),
            original: line.trim()
          };
        });

      const totalAmount = addressList.reduce((sum, { amount }) => sum + amount, 0);
      const availableBalance = parseFloat(getCurrentBalance());
      if (totalAmount > availableBalance) {
        throw new Error(`总提现金额 ${totalAmount} ${formData.coin} 超过可用余额 ${availableBalance} ${formData.coin}`);
      }

      // 创建一个可以被中断的提现流程
      withdrawPromiseRef.current = (async () => {
        for (const { address, amount, original } of addressList) {
          // 检查是否已经停止
          if (abortControllerRef.current?.signal.aborted) {
            console.log('提现已停止');
            break;
          }

          try {
            validateAddress(address, formData.coin);
            validateAmount(amount, getCurrentBalance(), formData.coin);

            const delay = Math.floor(
              Math.random() * 
              (parseInt(formData.maxDelay) - parseInt(formData.minDelay) + 1) + 
              parseInt(formData.minDelay)
            ) * 1000;

            // 使用可中断的延迟
            try {
              await new Promise((resolve, reject) => {
                const timeoutId = setTimeout(resolve, delay);
                abortControllerRef.current.signal.addEventListener('abort', () => {
                  clearTimeout(timeoutId);
                  reject(new Error('提现已停止'));
                });
              });
            } catch (error) {
              if (error.message === '提现已停止') {
                throw error;
              }
            }

            // 如果已经停止，不再继续发送请求
            if (abortControllerRef.current?.signal.aborted) {
              throw new Error('提现已停止');
            }

            try {
              let chain;
              if (formData.coin === 'POL') {
                chain = 'POL-Polygon';
              } else {
                chain = formData.network ? `${formData.coin}-${formData.network}` : formData.coin;
              }
              const result = await withdraw(apiInfo, chain, address, amount);
              onWithdrawStatusUpdate(prev => [
                ...prev,
                {
                  address,
                  amount,
                  status: 'success',
                  message: `提现成功，交易ID: ${result.wdId}`
                }
              ]);
            } catch (error) {
              // 如果是主动停止导致的错误，直接中断循环
              if (abortControllerRef.current?.signal.aborted) {
                throw new Error('提现已停止');
              }
              
              onWithdrawStatusUpdate(prev => [
                ...prev,
                {
                  address,
                  amount,
                  status: 'error',
                  message: error.message
                }
              ]);
              if (error.message.includes('余额不足')) {
                throw new Error('余额不足，终止后续提现');
              }
            }
          } catch (error) {
            // 如果是主动停止，直接中断
            if (error.message === '提现已停止') {
              throw error;
            }
            
            onWithdrawStatusUpdate(prev => [
              ...prev,
              {
                address,
                amount,
                status: 'error',
                message: `验证失败: ${error.message}`,
                original
              }
            ]);
          }
        }
      })();

      await withdrawPromiseRef.current;
    } catch (error) {
      // 如果不是主动停止导致的错误，才显示错误信息
      if (error.message !== '提现已停止') {
        alert(error.message);
      }
    } finally {
      setLoading(false);
      setIsWithdrawing(false);
      withdrawPromiseRef.current = null;
      abortControllerRef.current = null;
    }
  };

  const handleStopWithdraw = () => {
    // 立即中止所有操作
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setShouldStop(true);
    setIsWithdrawing(false);
    setLoading(false);
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="批量提现" />
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>选择币种</InputLabel>
              <Select
                name="coin"
                value={formData.coin}
                onChange={handleInputChange}
                disabled={loading || isWithdrawing}
              >
                {balances.map(balance => (
                  <MenuItem key={balance.ccy} value={balance.ccy}>
                    {balance.ccy} (可用: {balance.availBal})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>选择网络</InputLabel>
              <Select
                name="network"
                value={formData.network}
                onChange={handleInputChange}
                disabled={!formData.coin || loading || isWithdrawing}
              >
                {networks.map(network => (
                  <MenuItem 
                    key={network.chain} 
                    value={network.chain.split('-')[1]}
                  >
                    {network.chain.split('-')[1]} (手续费: {network.minFee} {network.ccy})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="最小金额"
                type="number"
                name="minAmount"
                value={formData.minAmount}
                onChange={handleInputChange}
                inputProps={{ step: "0.000001" }}
              />
              <TextField
                label="最大金额"
                type="number"
                name="maxAmount"
                value={formData.maxAmount}
                onChange={handleInputChange}
                inputProps={{ step: "0.000001" }}
              />
              <TextField
                label="小数位数"
                type="number"
                name="decimals"
                value={formData.decimals}
                onChange={handleInputChange}
                inputProps={{ min: "0", max: "8" }}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="最小延迟(秒)"
                type="number"
                name="minDelay"
                value={formData.minDelay}
                onChange={handleInputChange}
              />
              <TextField
                label="最大延迟(秒)"
                type="number"
                name="maxDelay"
                value={formData.maxDelay}
                onChange={handleInputChange}
              />
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Button
              variant="contained"
              color="secondary"
              onClick={generateRandomAmount}
              sx={{ mb: 2 }}
            >
              生成随机金额
            </Button>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="提现地址列表"
              name="addresses"
              value={formData.addresses}
              onChange={handleInputChange}
              placeholder="每行一个地址，格式：地址,数量"
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading && !isWithdrawing}
              onClick={isWithdrawing ? handleStopWithdraw : handleSubmit}
            >
              {isWithdrawing ? '停止提现' : loading ? '提现中...' : '提交提现'}
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default WithdrawForm; 
