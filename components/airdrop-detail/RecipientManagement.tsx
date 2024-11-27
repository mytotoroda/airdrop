'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Tooltip,
  Link,
  TablePagination
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import ExcelUploader from './ExcelUploader';
import { AirdropRecipient } from '@/components/airdrops/types';

interface RecipientManagementProps {
  campaignId: string;
}

export default function RecipientManagement({ campaignId }: RecipientManagementProps) {
  const [recipients, setRecipients] = useState<AirdropRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<AirdropRecipient | null>(null);
  // 페이지네이션
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchRecipients();
  }, [campaignId]);

  const fetchRecipients = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/airdrop/${campaignId}/recipients`);
      if (!response.ok) {
        throw new Error('Failed to fetch recipients');
      }
      const data = await response.json();
      setRecipients(data);
    } catch (err) {
      console.error('Error fetching recipients:', err);
      setError('대상자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (recipient: AirdropRecipient) => {
    setSelectedRecipient(recipient);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async (recipientId: number) => {
    if (!window.confirm('이 대상자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/airdrop/recipients/${recipientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '삭제에 실패했습니다.');
      }

      // 성공적으로 삭제되면 목록 새로고침
      fetchRecipients();
    } catch (err) {
      console.error('Error deleting recipient:', err);
      setError(err instanceof Error ? err.message : '대상자 삭제에 실패했습니다.');
    }
  };

  const handleEditSave = async () => {
    if (!selectedRecipient) return;

    try {
      const response = await fetch(`/api/airdrop/recipients/${selectedRecipient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: selectedRecipient.wallet_address,
          amount: selectedRecipient.amount,
          user_id: selectedRecipient.user_id,
          status: selectedRecipient.status
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '수정에 실패했습니다.');
      }

      setEditDialogOpen(false);
      fetchRecipients();
    } catch (err) {
      console.error('Error updating recipient:', err);
      setError(err instanceof Error ? err.message : '대상자 정보 수정에 실패했습니다.');
    }
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '완료';
      case 'FAILED':
        return '실패';
      case 'PENDING':
        return '대기중';
      default:
        return status;
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

   return (
    <Box>
      <Box className="mb-6">
        <ExcelUploader 
          campaignId={campaignId} 
          onUploadSuccess={fetchRecipients}
        />
      </Box>

      {error && (
        <Alert 
          severity="error" 
          className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
        >
          {error}
        </Alert>
      )}

      <TableContainer 
        component={Paper}
        className="bg-white dark:bg-gray-800 shadow-md"
      >
        <Table>
          <TableHead>
            <TableRow className="bg-gray-50 dark:bg-gray-700">
              <TableCell className="font-semibold text-gray-900 dark:text-gray-100">지갑 주소</TableCell>
              <TableCell className="font-semibold text-gray-900 dark:text-gray-100">유저 ID</TableCell>
              <TableCell align="right" className="font-semibold text-gray-900 dark:text-gray-100">수량</TableCell>
              <TableCell className="font-semibold text-gray-900 dark:text-gray-100">상태</TableCell>
              <TableCell className="font-semibold text-gray-900 dark:text-gray-100">트랜잭션</TableCell>
              <TableCell className="font-semibold text-gray-900 dark:text-gray-100">에러 메시지</TableCell>
              <TableCell align="right" className="font-semibold text-gray-900 dark:text-gray-100">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell 
                  colSpan={7} 
                  align="center"
                  className="text-gray-600 dark:text-gray-400"
                >
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : recipients.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={7} 
                  align="center"
                  className="text-gray-600 dark:text-gray-400"
                >
                  등록된 대상자가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              recipients
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((recipient) => (
                  <TableRow 
                    key={recipient.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {recipient.wallet_address}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100">
                      {recipient.user_id}
                    </TableCell>
                    <TableCell align="right" className="text-gray-900 dark:text-gray-100">
                      {recipient.amount}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(recipient.status)}
                        color={getStatusChipColor(recipient.status) as any}
                        size="small"
                        className="dark:border-opacity-50"
                      />
                    </TableCell>
                    <TableCell>
                      {recipient.tx_signature ? (
                        <Link
                          href={`https://solscan.io/tx/${recipient.tx_signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {recipient.tx_signature.substring(0, 8)}...
                        </Link>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {recipient.error_message ? (
                        <Tooltip title={recipient.error_message}>
                          <span className="text-red-600 dark:text-red-400 cursor-help">
                            {recipient.error_message.substring(0, 20)}...
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(recipient)}
                        disabled={recipient.status === 'COMPLETED'}
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
                          disabled:text-gray-400 dark:disabled:text-gray-600"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(recipient.id)}
                        disabled={recipient.status === 'COMPLETED'}
                        className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400
                          disabled:text-gray-400 dark:disabled:text-gray-600"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={recipients.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          className="text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700"
        />
      </TableContainer>

      {/* 수정 다이얼로그 */}
      <Dialog 
  open={editDialogOpen} 
  onClose={() => setEditDialogOpen(false)}
  PaperProps={{
    className: "bg-white dark:bg-gray-800"
  }}
>
  <DialogTitle className="text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 px-6 py-6">
    대상자 정보 수정
  </DialogTitle>
   <DialogContent className="p-6 pt-8">
   <div className="p-6"></div>
    <Box className="space-y-6"> {/* spacing 추가 */}
      <TextField
        fullWidth
        label="지갑 주소"
        value={selectedRecipient?.wallet_address || ''}
        onChange={(e) => setSelectedRecipient(prev => 
          prev ? { ...prev, wallet_address: e.target.value } : null
        )}
        className="bg-white dark:bg-gray-900"
        InputLabelProps={{
          className: "text-gray-600 dark:text-gray-300"
        }}
        InputProps={{
          className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        }}
      />
      <TextField
        fullWidth
        label="유저 ID"
        type="number"
        value={selectedRecipient?.user_id || ''}
        onChange={(e) => setSelectedRecipient(prev => 
          prev ? { ...prev, user_id: parseInt(e.target.value) } : null
        )}
        className="bg-white dark:bg-gray-900"
        InputLabelProps={{
          className: "text-gray-600 dark:text-gray-300"
        }}
        InputProps={{
          className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        }}
      />
      <TextField
        fullWidth
        label="수량"
        type="number"
        value={selectedRecipient?.amount || ''}
        onChange={(e) => setSelectedRecipient(prev => 
          prev ? { ...prev, amount: e.target.value } : null
        )}
        className="bg-white dark:bg-gray-900"
        InputLabelProps={{
          className: "text-gray-600 dark:text-gray-300"
        }}
        InputProps={{
          className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        }}
      />
      <FormControl fullWidth>
        <InputLabel className="text-gray-600 dark:text-gray-300">상태</InputLabel>
        <Select
          value={selectedRecipient?.status || ''}
          label="상태"
          onChange={(e) => setSelectedRecipient(prev => 
            prev ? { ...prev, status: e.target.value as AirdropRecipient['status'] } : null
          )}
          className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        >
          <MenuItem value="PENDING" className="text-gray-900 dark:text-gray-100">대기중</MenuItem>
          <MenuItem value="COMPLETED" className="text-gray-900 dark:text-gray-100">완료</MenuItem>
          <MenuItem value="FAILED" className="text-gray-900 dark:text-gray-100">실패</MenuItem>
        </Select>
      </FormControl>
    </Box>
  </DialogContent>
  <DialogActions className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
    <Button 
      onClick={() => setEditDialogOpen(false)}
      className="text-gray-600 dark:text-gray-400"
    >
      취소
    </Button>
    <Button 
      onClick={handleEditSave} 
      variant="contained"
      className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
    >
      저장
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}