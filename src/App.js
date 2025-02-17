import React, { useState } from 'react';
import { Container, CssBaseline } from '@mui/material';
import ApiConfig from './components/ApiConfig';
import WithdrawForm from './components/WithdrawForm';
import WithdrawStatus from './components/WithdrawStatus';

function App() {
  const [apiInfo, setApiInfo] = useState(null);
  const [balances, setBalances] = useState([]);
  const [withdrawStatus, setWithdrawStatus] = useState([]);

  return (
    <>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <h2 className="text-center mb-4">批量提现系统</h2>
        <ApiConfig 
          onApiConfigured={setApiInfo} 
          onBalancesUpdated={setBalances} 
        />
        <WithdrawForm 
          apiInfo={apiInfo}
          balances={balances}
          onWithdrawStatusUpdate={setWithdrawStatus}
        />
        <WithdrawStatus 
          status={withdrawStatus}
        />
      </Container>
    </>
  );
}

export default App; 