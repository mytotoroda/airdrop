'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWallet } from '../../contexts/WalletContext'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { getMint, createSetAuthorityInstruction, AuthorityType, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { Wallet, Shield } from 'lucide-react'

interface WalletContextType {
  publicKey: string | null;
  wallet: {
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
  } | null;
  network: 'mainnet-beta' | 'devnet';
}

const TokenAuthPage = () => {
  const searchParams = useSearchParams()
  const { publicKey, wallet, network } = useWallet() as WalletContextType
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mintInfo, setMintInfo] = useState<any>(null)
  const [connection, setConnection] = useState<Connection | null>(null)

  const tokenId = searchParams.get('token_id')

  useEffect(() => {
    const rpcUrl = network === 'mainnet-beta' 
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL
      : "https://api.devnet.solana.com"

    console.log('Setting up connection with RPC URL:', rpcUrl)
    
    const conn = new Connection(rpcUrl!, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    })
    
    setConnection(conn)
  }, [network])

  useEffect(() => {
    if (connection && tokenId) {
      console.log('Triggering fetchMintInfo')
      fetchMintInfo()
    }
  }, [connection, tokenId])

  const fetchMintInfo = async () => {
    if (!tokenId || !connection) {
      console.log('Missing tokenId or connection:', { tokenId, hasConnection: !!connection })
      return
    }

    try {
      console.log('Fetching mint info for:', tokenId)
      const mintPubkey = new PublicKey(tokenId)
      const info = await getMint(connection, mintPubkey)
      console.log('Fetched mint info:', {
        mintAuthority: info.mintAuthority?.toBase58(),
        freezeAuthority: info.freezeAuthority?.toBase58(),
        supply: info.supply.toString(),
        decimals: info.decimals,
      })
      setMintInfo(info)
    } catch (err) {
      console.error('Error fetching mint info:', err)
      setError('토큰 정보를 불러오는데 실패했습니다.')
    }
  }

  const removeAuthority = async (authorityType: AuthorityType) => {
    if (!tokenId || !publicKey || !wallet || !connection) {
      console.log('Missing requirements:', { tokenId, publicKey, hasWallet: !!wallet })
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const mintPubkey = new PublicKey(tokenId)
      const userPubkey = new PublicKey(publicKey)
      
      const transaction = new Transaction()

      transaction.add(
        createSetAuthorityInstruction(
          mintPubkey,
          userPubkey,
          authorityType,
          null,
          [],
          TOKEN_PROGRAM_ID
        )
      )

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      transaction.feePayer = userPubkey

      try {
        console.log('Requesting signature...')
        const signedTx = await wallet.signTransaction(transaction)
        console.log('Transaction signed')

        console.log('Sending transaction...')
        const signature = await connection.sendRawTransaction(signedTx.serialize())
        console.log('Transaction sent, signature:', signature)

        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        })

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`)
        }

        setSuccess(`${authorityType} 권한이 성공적으로 제거되었습니다.`)
        await fetchMintInfo()
      } catch (error: any) {
        throw new Error(error.message || '트랜잭션 처리 중 오류가 발생했습니다.')
      }
    } catch (err: any) {
      console.error('Remove authority error:', err)
      setError(err.message || `${authorityType} 권한 제거에 실패했습니다.`)
    } finally {
      setLoading(false)
    }
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Wallet className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">
          지갑 연결이 필요합니다
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          메인 페이지에서 지갑을 연결해주세요
        </p>
        <a
          href="/"
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
        >
          메인으로 돌아가기
        </a>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <div className="flex items-center mb-6">
          <Shield className="h-6 w-6 text-purple-500 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            토큰 권한 관리
          </h1>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-lg mb-6">
            {success}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              토큰 주소
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
              {tokenId}
            </p>
          </div>

          {mintInfo ? (
            <>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mint Authority
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-4">
                  {mintInfo.mintAuthority?.toBase58() || 'None'}
                </p>
                {mintInfo.mintAuthority && (
                  <button
                    onClick={() => removeAuthority(AuthorityType.MintTokens)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '처리 중...' : 'Mint Authority 제거'}
                  </button>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Freeze Authority
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-4">
                  {mintInfo.freezeAuthority?.toBase58() || 'None'}
                </p>
                {mintInfo.freezeAuthority && (
                  <button
                    onClick={() => removeAuthority(AuthorityType.FreezeAccount)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '처리 중...' : 'Freeze Authority 제거'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">토큰 정보를 불러오는 중...</p>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            주의사항
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• 권한 제거는 되돌릴 수 없습니다.</li>
            <li>• Mint Authority 제거시 추가 토큰 발행이 불가능합니다.</li>
            <li>• Freeze Authority 제거시 계정 동결이 불가능합니다.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TokenAuthPage