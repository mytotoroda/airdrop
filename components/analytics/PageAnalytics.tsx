import React, { useState, useEffect } from 'react';
import { 
  Card,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Paper,
  useTheme,
  Grid,
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useTheme as useNextTheme } from 'next-themes';
import { Users, MousePointerClick, Activity } from 'lucide-react';

// 타입 정의
interface PageStats {
  page_path: string;
  total_visits: number;
  unique_visitors: number;
  visit_date: string;
}

interface Summary {
  total_pages: number;
  total_visits: number;
  total_unique_visitors: number;
  last_visit_date: string;
}

const COLORS = ['#2AABEE', '#229ED9', '#1A73E8', '#4285F4'];

export default function PageAnalytics() {
  const [stats, setStats] = useState<PageStats[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/analytics/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const chartData = stats.map(stat => ({
    name: stat.page_path.replace(/^\//, '').replace(/\/$/, '') || 'Home',
    '총 방문': stat.total_visits,
    '순 방문자': stat.unique_visitors,
  }));

  // 일별 추세 데이터
  const trendData = [...stats]
    .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime())
    .map(stat => ({
      date: new Date(stat.visit_date).toLocaleDateString(),
      '방문자': stat.total_visits,
      '순방문자': stat.unique_visitors,
    }));

  // 파이 차트 데이터
  const pieData = stats
    .slice(0, 5)
    .map(stat => ({
      name: stat.page_path.replace(/^\//, '').replace(/\/$/, '') || 'Home',
      value: stat.total_visits,
    }));

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 4, color: isDark ? 'white' : 'gray.900' }}>
        페이지 방문 통계
      </Typography>

      {/* 요약 카드 */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, bgcolor: isDark ? 'rgb(31, 41, 55)' : 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MousePointerClick size={24} color={isDark ? '#A8B4C1' : '#232E3C'} />
                <Typography variant="h6" sx={{ ml: 1, color: isDark ? 'white' : 'gray.900' }}>
                  총 방문
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#2AABEE' }}>
                {summary.total_visits.toLocaleString()}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, bgcolor: isDark ? 'rgb(31, 41, 55)' : 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Users size={24} color={isDark ? '#A8B4C1' : '#232E3C'} />
                <Typography variant="h6" sx={{ ml: 1, color: isDark ? 'white' : 'gray.900' }}>
                  순 방문자
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#229ED9' }}>
                {summary.total_unique_visitors.toLocaleString()}
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, bgcolor: isDark ? 'rgb(31, 41, 55)' : 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Activity size={24} color={isDark ? '#A8B4C1' : '#232E3C'} />
                <Typography variant="h6" sx={{ ml: 1, color: isDark ? 'white' : 'gray.900' }}>
                  활성 페이지
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ color: '#1A73E8' }}>
                {summary.total_pages.toLocaleString()}
              </Typography>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 차트 그리드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 트렌드 차트 */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3, bgcolor: isDark ? 'rgb(31, 41, 55)' : 'white' }}>
            <Typography variant="h6" sx={{ mb: 2, color: isDark ? 'white' : 'gray.900' }}>
              일별 방문자 추세
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2AABEE" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2AABEE" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#229ED9" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#229ED9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: isDark ? '#A8B4C1' : '#232E3C' }}
                  />
                  <YAxis 
                    tick={{ fill: isDark ? '#A8B4C1' : '#232E3C' }}
                  />
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'white',
                      color: isDark ? 'white' : 'black',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="방문자" 
                    stroke="#2AABEE" 
                    fillOpacity={1} 
                    fill="url(#colorVisits)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="순방문자" 
                    stroke="#229ED9" 
                    fillOpacity={1} 
                    fill="url(#colorUnique)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* 파이 차트 */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, bgcolor: isDark ? 'rgb(31, 41, 55)' : 'white', height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2, color: isDark ? 'white' : 'gray.900' }}>
              상위 페이지 분포
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: isDark ? 'rgb(31, 41, 55)' : 'white',
                      color: isDark ? 'white' : 'black',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 테이블 */}
      <TableContainer component={Paper} sx={{ 
        bgcolor: isDark ? 'rgb(31, 41, 55)' : 'white',
        '& th, & td': {
          color: isDark ? '#A8B4C1' : '#232E3C',
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>페이지</TableCell>
              <TableCell align="right">총 방문</TableCell>
              <TableCell align="right">순 방문자</TableCell>
              <TableCell>날짜</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.map((row, index) => (
              <TableRow key={index} sx={{
                '&:last-child td, &:last-child th': { border: 0 }
              }}>
                <TableCell component="th" scope="row">
                  {row.page_path}
                </TableCell>
                <TableCell align="right">{row.total_visits.toLocaleString()}</TableCell>
                <TableCell align="right">{row.unique_visitors.toLocaleString()}</TableCell>
                <TableCell>{new Date(row.visit_date).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}