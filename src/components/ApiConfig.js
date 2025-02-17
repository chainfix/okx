import React, { useState } from 'react';
import { Card, CardHeader, CardContent, TextField, Button, Box } from '@mui/material';
import { getBalances } from '../services/api';

const ApiConfig = ({ onApiConfigured, onBalancesUpdated }) => {
  const [apiInfo, setApiInfo] = useState({
    apiKey: '',
    secretKey: '',
    passphrase: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApiInfo(prev => ({
      ...prev,
      [name]: value
    }));
    // 当API信息更新时，通知父组件
    onApiConfigured({ ...apiInfo, [name]: value });
  };

  const handleGetBalance = async () => {
    if (!apiInfo.apiKey || !apiInfo.secretKey || !apiInfo.passphrase) {
      alert('请填写完整的API信息');
      return;
    }

    setLoading(true);
    try {
      const balances = await getBalances(apiInfo);
      console.log('获取到的余额:', balances);
      onBalancesUpdated(balances);
    } catch (error) {
      alert('获取余额失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="API配置" />
      <CardContent>
        <Box component="form" sx={{ '& .MuiTextField-root': { mb: 2 } }}>
          <TextField
            fullWidth
            label="API Key"
            name="apiKey"
            value={apiInfo.apiKey}
            onChange={handleInputChange}
          />
          <TextField
            fullWidth
            label="Secret Key"
            name="secretKey"
            type="password"
            value={apiInfo.secretKey}
            onChange={handleInputChange}
          />
          <TextField
            fullWidth
            label="Passphrase"
            name="passphrase"
            type="password"
            value={apiInfo.passphrase}
            onChange={handleInputChange}
          />
          <Button
            fullWidth
            variant="contained"
            onClick={handleGetBalance}
            disabled={loading}
          >
            {loading ? '读取中...' : '读取余额'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ApiConfig; 