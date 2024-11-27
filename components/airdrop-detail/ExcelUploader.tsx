import { useState } from 'react';
import { Button, Alert, Box, CircularProgress, Typography } from '@mui/material';
import { UploadFile as UploadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface ExcelUploaderProps {
  campaignId: string;
  onUploadSuccess: () => void;
}

interface RecipientData {
  wallet_address: string;
  amount: number;
  user_id: number;
}

export default function ExcelUploader({ campaignId, onUploadSuccess }: ExcelUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateRecipientData = (data: any[]): { isValid: boolean; error?: string } => {
    if (!Array.isArray(data) || data.length === 0) {
      return { isValid: false, error: '유효한 데이터가 없습니다.' };
    }

    // 필수 컬럼 확인
    const requiredColumns = ['wallet_address', 'amount', 'user_id'];
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !Object.keys(firstRow).includes(col));

    if (missingColumns.length > 0) {
      return { 
        isValid: false, 
        error: `필수 컬럼이 없습니다: ${missingColumns.join(', ')}` 
      };
    }

    // 데이터 유효성 검사
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // 지갑 주소 형식 검사
      if (!row.wallet_address || row.wallet_address.length < 30) {
        return { 
          isValid: false, 
          error: `${i + 1}번째 행의 지갑 주소가 유효하지 않습니다.` 
        };
      }

      // amount가 숫자인지 확인
      const amount = Number(row.amount);
      if (isNaN(amount) || amount <= 0) {
        return { 
          isValid: false, 
          error: `${i + 1}번째 행의 수량이 유효하지 않습니다.` 
        };
      }

      // user_id가 숫자인지 확인
      const userId = Number(row.user_id);
      if (isNaN(userId) || userId <= 0) {
        return { 
          isValid: false, 
          error: `${i + 1}번째 행의 사용자 ID가 유효하지 않습니다.` 
        };
      }
    }

    return { isValid: true };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 엑셀 파일 읽기
      const data = await readExcelFile(file);
      
      // 데이터 유효성 검사
      const validation = validateRecipientData(data);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 서버로 데이터 전송
      const response = await fetch('/api/airdrop/recipients/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          recipients: data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '업로드에 실패했습니다.');
      }

      onUploadSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      // input 초기화
      event.target.value = '';
    }
  };

  const readExcelFile = (file: File): Promise<RecipientData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData as RecipientData[]);
        } catch (err) {
          reject(new Error('엑셀 파일을 읽는 중 오류가 발생했습니다.'));
        }
      };

      reader.onerror = () => {
        reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
      };

      reader.readAsBinaryString(file);
    });
  };

  return (
    <Box className="mb-6">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        id="excel-upload-input"
        disabled={uploading}
      />
      <Box className="flex items-center gap-4">
        <Button
          variant="contained"
          component="label"
          htmlFor="excel-upload-input"
          startIcon={uploading ? (
            <CircularProgress 
              size={20} 
              className="text-white"
            />
          ) : (
            <UploadIcon />
          )}
          disabled={uploading}
          className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 
            disabled:bg-gray-400 dark:disabled:bg-gray-600
            text-white dark:text-gray-100
            normal-case"
        >
          {uploading ? '업로드 중...' : '엑셀 파일 업로드'}
        </Button>
        <Typography 
          variant="body2" 
          className="text-gray-600 dark:text-gray-400"
        >
          .xlsx 또는 .xls 파일만 가능
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          className="mt-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
        >
          {error}
        </Alert>
      )}

      <Alert 
        severity="info" 
        className="mt-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200"
      >
        <div className="space-y-1">
          <Typography 
            variant="body2"
            className="text-blue-800 dark:text-blue-200"
          >
            엑셀 파일 형식:
          </Typography>
          <ul className="list-disc pl-5 space-y-1">
            <li className="text-blue-800 dark:text-blue-200">
              필수 컬럼: wallet_address, amount, user_id
            </li>
            <li className="text-blue-800 dark:text-blue-200">
              wallet_address: 지갑 주소
            </li>
            <li className="text-blue-800 dark:text-blue-200">
              amount: 전송할 토큰 수량
            </li>
            <li className="text-blue-800 dark:text-blue-200">
              user_id: 사용자 ID
            </li>
          </ul>
        </div>
      </Alert>
    </Box>
  );
}