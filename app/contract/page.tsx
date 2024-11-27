'use client'
import { useState } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import * as web3 from '@solana/web3.js'
import { Upload as UploadIcon } from 'lucide-react'


const ProgramDeployPage = () => {
  const { publicKey, wallet } = useWallet()
  const [programData, setProgramData] = useState<File | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployResult, setDeployResult] = useState<{
    success: boolean;
    message: string;
    programId?: string;
  } | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProgramData(event.target.files[0])
    }
  }

  const deployProgram = async () => {
    if (!publicKey || !wallet || !programData) {
      setDeployResult({
        success: false,
        message: "지갑 연결과 프로그램 파일이 필요합니다."
      })
      return
    }

    setIsDeploying(true)
    setDeployResult(null)

    try {
      // 연결 설정
      const connection = new web3.Connection(web3.clusterApiUrl('devnet'))

      // 파일 읽기
      const buffer = await programData.arrayBuffer()
      const program = new Uint8Array(buffer)

      // 프로그램을 위한 새로운 키페어 생성
      const programId = web3.Keypair.generate()

      // BPF Loader 프로그램 ID
      const bpfLoaderProgramId = new web3.PublicKey(
        'BPFLoaderUpgradeab1e11111111111111111111111'
      )

      // 프로그램 크기에 따른 필요한 비용 계산
      const programDataSpace = program.length
      const rentExemptionFee = await connection.getMinimumBalanceForRentExemption(
        programDataSpace
      )

      // 프로그램 배포를 위한 트랜잭션 생성
      const transaction = new web3.Transaction().add(
        web3.SystemProgram.createAccount({
          fromPubkey: new web3.PublicKey(publicKey),
          newAccountPubkey: programId.publicKey,
          lamports: rentExemptionFee,
          space: programDataSpace,
          programId: bpfLoaderProgramId,
        }),
        new web3.TransactionInstruction({
          keys: [
            { pubkey: programId.publicKey, isSigner: true, isWritable: true },
          ],
          programId: bpfLoaderProgramId,
          data: program,
        })
      )

      // wallet.adapter를 통해 트랜잭션 전송
      const signature = await wallet.adapter.sendTransaction(transaction, connection, {
        signers: [programId],
      })

      // 트랜잭션 확인
      await connection.confirmTransaction(signature)

      setDeployResult({
        success: true,
        message: "프로그램이 성공적으로 배포되었습니다!",
        programId: programId.publicKey.toString()
      })

    } catch (error) {
      console.error('Program deployment failed:', error)
      setDeployResult({
        success: false,
        message: `배포 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      })
    } finally {
      setIsDeploying(false)
    }
  }

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          지갑 연결이 필요합니다
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
          프로그램을 배포하기 위해서는 지갑 연결이 필요합니다.
        </p>
        <a
          href="/"
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-colors"
        >
          메인으로 돌아가기
        </a>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          프로그램 배포
        </h1>
        
        <div className="space-y-6">
          <div>
            <input
              type="file"
              accept=".so"
              onChange={handleFileChange}
              className="hidden"
              id="program-file"
            />
            <label htmlFor="program-file">
              <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                <UploadIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-300">
                  프로그램 파일 선택 (.so)
                </span>
              </div>
            </label>
            {programData && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                선택된 파일: {programData.name}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Rust로 컴파일된 Solana 프로그램 파일을 선택하세요
            </p>
          </div>

          <button
            onClick={deployProgram}
            disabled={!programData || isDeploying}
            className={`w-full px-4 py-3 rounded-lg transition-colors ${
              !programData || isDeploying
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
            }`}
          >
            {isDeploying ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                배포 중...
              </div>
            ) : (
              '프로그램 배포하기'
            )}
          </button>

          {deployResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              deployResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              <h3 className="font-semibold mb-2">
                {deployResult.success ? '배포 성공!' : '배포 실패'}
              </h3>
              <p className="text-sm">
                {deployResult.message}
              </p>
              {deployResult.programId && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-1">프로그램 ID:</p>
                  <p className="text-sm font-mono break-all">
                    {deployResult.programId}
                  </p>
                  <a
                    href={`https://explorer.solana.com/address/${deployResult.programId}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    Explorer에서 보기 →
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              참고 사항:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <li>• 프로그램 배포는 Devnet에서 이루어집니다.</li>
              <li>• 배포에는 충분한 SOL이 필요합니다.</li>
              <li>• 배포된 프로그램은 업그레이드가 가능합니다.</li>
              <li>• 프로그램 크기에 따라 비용이 달라질 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgramDeployPage