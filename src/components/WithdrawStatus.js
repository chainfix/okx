import React from 'react';
import { Card, CardHeader, CardContent, Alert, Stack } from '@mui/material';

const WithdrawStatus = ({ status }) => {
  return (
    <Card>
      <CardHeader 
        title="提现状态" 
        subheader={`共 ${status.length} 条记录`}
      />
      <CardContent>
        <Stack spacing={2}>
          {status.map((item, index) => (
            <Alert 
              key={index} 
              severity={
                item.status === 'success' ? 'success' : 
                'error'
              }
            >
              {item.address}  {item.status === 'success' ? '提现成功' : '提现失败'}
            </Alert>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default WithdrawStatus; 