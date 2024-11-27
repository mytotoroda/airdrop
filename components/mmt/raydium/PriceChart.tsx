// components/mmt/raydium/PriceChart.tsx
'use client';

import { useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { 
  Box, 
  ToggleButtonGroup, 
  ToggleButton, 
  Typography 
} from '@mui/material';

// 임시 데이터 생성
const generateDummyData = () => {
  const data = [];
  let value = 1000;
  
  for (let i = 0; i < 30; i++) {
    value = value * (0.95 + Math.random() * 0.1);
    data.push({
      date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      price: value.toFixed(2)
    });
  }
  
  return data;
};

export default function PriceChart() {
  const theme = useTheme();
  const [timeframe, setTimeframe] = useState('1D');
  const data = generateDummyData();

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography variant="h6">
          Price Chart
        </Typography>
        <ToggleButtonGroup
          value={timeframe}
          exclusive
          onChange={(_, newValue) => newValue && setTimeframe(newValue)}
          size="small"
        >
          {['1H', '1D', '1W', '1M'].map((tf) => (
            <ToggleButton key={tf} value={tf}>
              {tf}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop 
                offset="5%" 
                stopColor={theme.palette.primary.main} 
                stopOpacity={0.3}
              />
              <stop 
                offset="95%" 
                stopColor={theme.palette.primary.main} 
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            tick={{ fill: theme.palette.text.secondary }}
            stroke={theme.palette.divider}
          />
          <YAxis 
            tick={{ fill: theme.palette.text.secondary }}
            stroke={theme.palette.divider}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              borderColor: theme.palette.divider,
            }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={theme.palette.primary.main}
            fillOpacity={1}
            fill="url(#colorPrice)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}