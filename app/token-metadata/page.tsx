'use client'
import { useState, useEffect, FormEvent } from 'react'
import * as web3 from '@solana/web3.js'
import { useWallet } from '../../contexts/WalletContext'
import { useTokens } from '../../contexts/TokenContext'
import { useSearchParams } from 'next/navigation'
import {
  createMetadataAccountV3,
  updateMetadataAccountV2,
  findMetadataPda,
  Creator,
  Collection,
  Uses,
} from '@metaplex-foundation/mpl-token-metadata'
import { 
  PublicKey, 
  createUmi,
  none, 
  some,
  publicKey as umiPublicKey 
} from '@metaplex-foundation/umi'
import { createSignerFromKeypair, walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { WalletContextState } from '@solana/wallet-adapter-react'


const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

interface WalletContextType {
  publicKey: string | null;
  wallet: {
    signTransaction: (transaction: web3.Transaction) => Promise<web3.Transaction>;
  } | null;
  network: 'mainnet-beta' | 'devnet';  // network 타입 추가
}

interface TokenData {
  address: string
  name: string
  symbol: string
  uri: string
  isInitialize: boolean
}

export default function TokenMetadataPage() {
  // useWallet 호출 부분을 수정
  const { publicKey: walletPublicKey, wallet, network } = useWallet()  // network를 추가
  const { tokens, refreshTokens } = useTokens()
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [tokenData, setTokenData] = useState<TokenData>({
    address: '',
    name: '',
    symbol: '',
    uri: '',
    isInitialize: true
  })

  const { mplTokenMetadata } = require('@metaplex-foundation/mpl-token-metadata')
  const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults')
  const searchParams = useSearchParams()

  // URL 파라미터로 토큰 ID가 전달된 경우
  useEffect(() => {
    const token_id = searchParams.get('token_id')
    if (token_id) {
      const existingToken = tokens.find(token => token.id === token_id)
      
      if (existingToken) {
        // TokenContext에서 찾은 데이터로 설정
        setTokenData({
          address: token_id,
          name: existingToken.name,
          symbol: existingToken.symbol,
          uri: existingToken.uri,
          isInitialize: false // 기존 메타데이터가 존재하므로 false
        })
      } else {
        // 토큰을 찾지 못한 경우 새로운 메타데이터 생성 모드로 설정
        setTokenData({
          address: token_id,
          name: '',
          symbol: '',
          uri: '',
          isInitialize: true
        })
      }
    }
  }, [searchParams, tokens])

  // 토큰 주소 입력 시 TokenContext에서 데이터 찾기
  useEffect(() => {
    if (tokenData.address && tokenData.address.length > 30) {
      const existingToken = tokens.find(token => token.id === tokenData.address)
      if (existingToken) {
        setTokenData(prev => ({
          ...prev,
          name: existingToken.name,
          symbol: existingToken.symbol,
          uri: existingToken.uri,
          isInitialize: false
        }))
      } else {
        setTokenData(prev => ({
          ...prev,
          name: '',
          symbol: '',
          uri: '',
          isInitialize: true
        }))
      }
    }
  }, [tokenData.address, tokens])

  const updateMetadata = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!walletPublicKey || !wallet) {
        throw new Error('지갑이 연결되어 있지 않습니다.')
      }
      const rpcUrl = network === 'mainnet-beta' 
  ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL
  : "https://api.devnet.solana.com";

      const umi = createUmi(rpcUrl).use(mplTokenMetadata())
      umi.use(walletAdapterIdentity(wallet as WalletContextState))

      const mintPublicKey = fromWeb3JsPublicKey(new web3.PublicKey(tokenData.address))

      const onChainData = {
        name: tokenData.name,
        symbol: tokenData.symbol,
        uri: tokenData.uri,
        sellerFeeBasisPoints: 0,
        creators: none<Creator[]>(),
        collection: none<Collection>(),
        uses: none<Uses>(),
      }

      let txid: string

      if (tokenData.isInitialize) {
        const accounts = {
          mint: mintPublicKey,
          mintAuthority: umi.identity,
        }
        
        const data = {
          isMutable: true,
          collectionDetails: null,
          data: onChainData,
        }

        txid = await createMetadataAccountV3(umi, { ...accounts, ...data }).sendAndConfirm(umi)
      } else {
        const data = {
          data: some(onChainData),
          discriminator: 0,
          isMutable: some(true),
          newUpdateAuthority: none<PublicKey>(),
          primarySaleHappened: none<boolean>(),
        }

        const accounts = {
          metadata: findMetadataPda(umi, { mint: mintPublicKey }),
          updateAuthority: umi.identity,
        }

        txid = await updateMetadataAccountV2(umi, { ...accounts, ...data }).sendAndConfirm(umi)
      }

      console.log('Transaction successful:', txid)
      alert(`메타데이터가 성공적으로 ${tokenData.isInitialize ? '생성' : '업데이트'}되었습니다!`)
      
      // 성공 후 TokenContext 새로고침
      await refreshTokens()

    } catch (error: unknown) {
      console.error('Metadata update failed:', error)
      let errorMessage = '메타데이터 업데이트에 실패했습니다.'
      
      if (error instanceof Error) {
        if (error.message.includes('invalid public key')) {
          errorMessage = '올바르지 않은 토큰 주소입니다.'
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'SOL 잔액이 부족합니다.'
        } else if (error.message.includes('0x1')) {
          errorMessage = '해당 토큰의 권한이 없습니다.'
        } else {
          errorMessage = `메타데이터 ${tokenData.isInitialize ? '생성' : '업데이트'}에 실패했습니다: ${error.message}`
        }
      }
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {!walletPublicKey ? (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">
            지갑 연결이 필요합니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            메타데이터를 업데이트하기 위해서는 지갑 연결이 필요합니다.
          </p>
          
          <a href="/"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            메인으로 돌아가기
          </a>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            토큰 메타데이터 {tokenData.isInitialize ? '생성' : '업데이트'}
          </h1>
          
          <form onSubmit={updateMetadata} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                토큰 주소
              </label>
              <input
                type="text"
                value={tokenData.address}
                onChange={(e) => setTokenData({ ...tokenData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="토큰의 민트 주소를 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                토큰 이름
              </label>
              <input
                type="text"
                value={tokenData.name}
                onChange={(e) => setTokenData({ ...tokenData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="표시될 토큰 이름"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                토큰 심볼
              </label>
              <input
                type="text"
                value={tokenData.symbol}
                onChange={(e) => setTokenData({ ...tokenData, symbol: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="표시될 토큰 심볼 (예: BTC)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                메타데이터 URI (선택사항)
              </label>
              <input
                type="text"
                value={tokenData.uri}
                onChange={(e) => setTokenData({ ...tokenData, uri: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="토큰 이미지나 추가 메타데이터를 위한 JSON URI"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={tokenData.isInitialize}
                  onChange={(e) => setTokenData({ ...tokenData, isInitialize: e.target.checked })}
                  className="form-checkbox h-4 w-4 text-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  새로운 메타데이터 생성
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '처리 중...' : `메타데이터 ${tokenData.isInitialize ? '생성' : '업데이트'}`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}