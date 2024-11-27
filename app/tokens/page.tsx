'use client'
import { useEffect } from 'react'
import { Wallet, Plus } from 'lucide-react'
import { useWallet } from '../../contexts/WalletContext'
import { useTokens } from '../../contexts/TokenContext'
import { useRouter } from 'next/navigation'

interface TokenMetadataLinkProps {
  tokenId: string
}

const TokenMetadataLink: React.FC<TokenMetadataLinkProps> = ({ tokenId }) => {
  const handleClick = (): void => {
    window.open(`https://explorer.solana.com/address/${tokenId}/metadata?cluster=devnet`, '_blank')
  }

  return (
    <p 
      onClick={handleClick} 
      className="text-sm text-gray-500 dark:text-gray-400 break-all cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
    >
      {tokenId}
    </p>
  )
}

const TokenMetadataLink2: React.FC<TokenMetadataLinkProps> = ({ tokenId }) => {
  const handleClick = (): void => {
    window.location.href = `/token-metadata/?token_id=${tokenId}`;
  };

  return (
    <p 
      onClick={handleClick} 
      className="text-sm text-gray-500 dark:text-gray-400 break-all cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
    >
      {tokenId}
    </p>
  );
};

const TokenAuthLink: React.FC<TokenMetadataLinkProps> = ({ tokenId }) => {
  const handleClick = (): void => {
    window.location.href = `/token-auth/?token_id=${tokenId}`;
  };

  return (
    <button 
      onClick={handleClick}
      className="text-sm bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-lg transition-colors"
    >
      권한수정하기
    </button>
  );
};

const MemeCoinsPage: React.FC = () => {
  const router = useRouter()
  const { publicKey } = useWallet()
  const { tokens, loading: isLoading, refreshTokens } = useTokens()

  // 지갑 연결시 토큰 목록 새로고침
  useEffect(() => {
    if (publicKey) {
      refreshTokens()
    }
  }, [publicKey])

  // 토큰 생성 페이지로 이동
  const handleCreateNewToken = () => {
    router.push('/meme-coins')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!publicKey ? (
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
      ) : (
        <div>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              밈코인 관리
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleCreateNewToken}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
                새 토큰 만들기
              </button>
              {isLoading && (
                <p className="text-gray-500">로딩 중...</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {token.name || '이름 없음'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {token.symbol || '심볼 없음'}
                  </p>
                  <TokenMetadataLink2 tokenId={token.id} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">보유량</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {Number(token.balance).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">소수점</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {token.decimals}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">총 공급량</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {Number(token.supply / (10 ** token.decimals)).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">생성일</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {token.created}
                    </span>
                  </div>
                  {token.uri && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">메타데이터 URI</span>
                      <a
                        href={token.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-600 truncate max-w-[200px]"
                      >
                        {token.uri}
                      </a>
                    </div>
                  )}
                  <div className="mt-4 flex justify-between items-center">
                    <TokenAuthLink tokenId={token.id} />
                    <a
                      href={`https://explorer.solana.com/address/${token.id}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 text-sm"
                    >
                      Explorer에서 보기 →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tokens.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                아직 생성된 토큰이 없습니다.
                <br />
                새 토큰 만들기 버튼을 클릭하여 첫 토큰을 생성해보세요!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MemeCoinsPage