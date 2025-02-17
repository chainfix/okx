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
import { withdraw } from '../services/api';

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
    network: '',  // 添加网络选择
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
  const withdrawPromiseRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'coin') {
      // 当币种改变时，重置网络选择
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
          if (shouldStop) {
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
            await new Promise(resolve => setTimeout(resolve, delay));

            try {
              // 使用选择的网络构造完整的币种标识
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

      // 等待提现流程完成
      await withdrawPromiseRef.current;
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
      setIsWithdrawing(false);
      withdrawPromiseRef.current = null;
    }
  };

  const handleStopWithdraw = () => {
    setShouldStop(true);
    setIsWithdrawing(false);
    setLoading(false);
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (withdrawPromiseRef.current) {
        setShouldStop(true);
      }
    };
  }, []);

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="批量提现地址" />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>选择币种</InputLabel>
              <Select
                name="coin"
                value={formData.coin}
                onChange={handleInputChange}
                label="选择币种"
              >
                {balances.length === 0 ? (
                  <MenuItem disabled value="">请先读取余额</MenuItem>
                ) : (
                  balances.map(balance => (
                    <MenuItem 
                      key={balance.ccy} 
                      value={balance.ccy}
                    >
                      {balance.ccy} (可用: {balance.availBal})
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>

          {/* 网络选择 - 始终显示 */}
          {formData.coin && (
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>选择网络</InputLabel>
                <Select
                  name="network"
                  value={formData.network}
                  onChange={handleInputChange}
                  label="选择网络"
                >
                  {(NETWORK_OPTIONS[formData.coin] || [
                    { value: formData.coin, label: `${formData.coin} 原生网络` }
                  ]).map(option => (
                    <MenuItem 
                      key={option.value} 
                      value={option.value}
                    >
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

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