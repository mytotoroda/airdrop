'use client'
import { useState, useEffect } from 'react'
import { Wallet, Coins, CircleDollarSign, Tag, LayoutGrid } from 'lucide-react'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { useWallet } from '../../contexts/WalletContext'
import dynamic from 'next/dynamic'

const mplTokenMetadata = dynamic(() => import('@metaplex-foundation/mpl-token-metadata'), {
  ssr: false
})
const createUmi = dynamic(() => import('@metaplex-foundation/umi-bundle-defaults'), {
  ssr: false
})

interface WalletContextType {
  publicKey: string | null;
  wallet: {
    signTransaction: (transaction: web3.Transaction) => Promise<web3.Transaction>;
  } | null;
  network: 'mainnet-beta' | 'devnet';
}

interface NewTokenData {
  name: string;
  symbol: string;
  supply: string;
}

interface InfoCardProps {
  icon: React.ReactNode;
  text: string;
  bgColor: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, text, bgColor }) => (
  <div className={`${bgColor} dark:bg-gray-700 p-4 rounded-lg`}>
    <div className="flex items-center space-x-3">
      {icon}
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {text}
      </span>
    </div>
  </div>
);

const RETRY_DELAY = 2000; // 2초
const MAX_RETRIES = 3;

export default function MemeCoinsPage() {
  const { publicKey, wallet, network } = useWallet() as WalletContextType
  const [connection, setConnection] = useState<web3.Connection | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [newToken, setNewToken] = useState<NewTokenData>({
    name: '',
    symbol: '',
    supply: ''
  })

  useEffect(() => {
    // RPC URL 설정
    const rpcUrl = network === 'mainnet-beta' 
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL
      : "https://api.devnet.solana.com";

    // Connection 설정
    const conn = new web3.Connection(rpcUrl!, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000, // 60초로 증가
      wsEndpoint: network === 'mainnet-beta' 
        ? rpcUrl?.replace('https', 'wss')
        : undefined
    });
    
    setConnection(conn);
}, [network]);

  const waitForTransactionConfirmation = async (
    signature: string,
    maxRetries: number = MAX_RETRIES
  ): Promise<boolean> => {
    if (!connection) return false;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const status = await connection.getSignatureStatus(signature);
        
        if (status.value?.confirmationStatus === 'confirmed' ||
            status.value?.confirmationStatus === 'finalized') {
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } catch (error) {
        console.error(`Confirmation attempt ${attempt + 1} failed:`, error);
        if (attempt === maxRetries - 1) throw error;
      }
    }
    return false;
  };

  const createToken = async (name: string, symbol: string, supply: string): Promise<void> => {
    setIsLoading(true);
    let currentAttempt = 0;
    const maxAttempts = 3;

    while (currentAttempt < maxAttempts) {
      try {
        if (!connection || !wallet || !publicKey) {
          throw new Error('Initialization check failed');
        }

        // 메인넷 경고
        if (network === 'mainnet-beta') {
          const confirm = window.confirm(
            '메인넷에서 토큰을 생성하시겠습니까? 실제 SOL이 사용됩니다.'
          );
          if (!confirm) {
            setIsLoading(false);
            return;
          }
        }

        // 민트 계정 생성
        const mintKeypair = web3.Keypair.generate()
        const decimals = 9

        // 필요한 lamports 계산
        const lamports = await token.getMinimumBalanceForRentExemptMint(connection)

        // 최신 블록해시 가져오기 (각 시도마다 새로운 블록해시)
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

        // 토큰 생성 트랜잭션
        const transaction = new web3.Transaction().add(
          web3.SystemProgram.createAccount({
            fromPubkey: new web3.PublicKey(publicKey),
            newAccountPubkey: mintKeypair.publicKey,
            space: token.MINT_SIZE,
            lamports: lamports,
            programId: token.TOKEN_PROGRAM_ID,
          }),
          token.createInitializeMintInstruction(
            mintKeypair.publicKey,
            decimals,
            new web3.PublicKey(publicKey),
            new web3.PublicKey(publicKey),
            token.TOKEN_PROGRAM_ID
          )
        )

        // 토큰 계정 생성
        const associatedTokenAccount = await token.getAssociatedTokenAddress(
          mintKeypair.publicKey,
          new web3.PublicKey(publicKey)
        )

        transaction.add(
          token.createAssociatedTokenAccountInstruction(
            new web3.PublicKey(publicKey),
            associatedTokenAccount,
            new web3.PublicKey(publicKey),
            mintKeypair.publicKey
          )
        )

        // 토큰 발행
        transaction.add(
          token.createMintToInstruction(
            mintKeypair.publicKey,
            associatedTokenAccount,
            new web3.PublicKey(publicKey),
            Number(supply) * (10 ** decimals),
            [],
            token.TOKEN_PROGRAM_ID
          )
        )

        // 트랜잭션 설정 업데이트
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = new web3.PublicKey(publicKey)

        // 트랜잭션 서명
        const signed = await wallet.signTransaction(transaction)
        signed.partialSign(mintKeypair)
        
        // 트랜잭션 전송
        const signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 5
        });

        // 트랜잭션 확인 대기
        const confirmed = await waitForTransactionConfirmation(signature);
        
        if (confirmed) {
          console.log('Token created successfully!')
          setNewToken({ name: '', symbol: '', supply: '' })
          alert(`토큰이 성공적으로 생성되었습니다!\n토큰 주소: ${mintKeypair.publicKey.toString()}\n\n토큰이 지갑에 표시되는데 시간이 걸릴 수 있습니다.`)
          break; // 성공하면 루프 종료
        } else {
          throw new Error('Transaction confirmation timeout');
        }

      } catch (error) {
        console.error(`Attempt ${currentAttempt + 1} failed:`, error)
        currentAttempt++;
        
        if (currentAttempt === maxAttempts) {
          alert('토큰 생성에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
          break;
        }
        
        // 다음 시도 전 대기
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsLoading(false);
  }
  const infoCards = [
    {
      icon: <CircleDollarSign className="h-6 w-6 text-blue-500" />,
      text: network === 'mainnet-beta' ? "Solana Mainnet" : "Solana Devnet",
      bgColor: network === 'mainnet-beta' ? "bg-green-50" : "bg-blue-50"
    },
    {
      icon: <Tag className="h-6 w-6 text-purple-500" />,
      text: "SPL Token",
      bgColor: "bg-purple-50"
    },
    {
      icon: <LayoutGrid className="h-6 w-6 text-green-500" />,
      text: "Custom Mint",
      bgColor: "bg-green-50"
    }
  ];

  const networkInfo = network === 'mainnet-beta' 
    ? {
        warning: "⚠️ 메인넷에서는 실제 SOL이 사용됩니다!",
        items: [
          "• 토큰 생성에는 실제 SOL이 필요합니다",
          "• 생성된 토큰은 Solana 메인넷에서 사용 가능합니다",
          "• 토큰 이름과 심볼은 변경할 수 없으니 신중히 선택해주세요",
          "• 초기 발행량은 추후 수정할 수 없습니다",
          "• 메인넷 토큰은 실제 거래소에 상장할 수 있습니다"
        ]
      }
    : {
        warning: "이것은 테스트넷입니다",
        items: [
          "• 토큰 생성에는 테스트 SOL이 필요합니다",
          "• 생성된 토큰은 Solana Devnet에서만 사용 가능합니다",
          "• 토큰 이름과 심볼은 변경할 수 없으니 신중히 선택해주세요",
          "• 초기 발행량은 추후 수정할 수 없습니다"
        ]
      };

 return (
   <div className="container mx-auto px-4 py-8 max-w-3xl">
     {!publicKey ? (
       <div className="flex flex-col items-center justify-center min-h-[60vh]">
         <Wallet className="h-16 w-16 text-gray-400 mb-4" />
         <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">
           지갑 연결이 필요합니다
         </h2>
         <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
           메인 페이지에서 지갑을 연결해주세요
         </p>
	 <a  // 여기가 수정된 부분
         
           href="/"
           className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
         >
           메인으로 돌아가기
         </a>
       </div>
     ) : (
       <div className="space-y-8">
         {/* 메인 카드 */}
         <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
           {/* 상단 정보 섹션 */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
             {infoCards.map((card, index) => (
               <InfoCard key={index} {...card} />
             ))}
           </div>

           {/* 토큰 생성 폼 */}
           <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 토큰 이름
               </label>
               <input
                 type="text"
                 value={newToken.name}
                 onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
                 placeholder="예: DOGE SEOUL"
               />
               <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                 토큰의 공식 이름을 입력하세요
               </p>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 토큰 심볼
               </label>
               <input
                 type="text"
                 value={newToken.symbol}
                 onChange={(e) => setNewToken({ ...newToken, symbol: e.target.value })}
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
                 placeholder="예: DOGS"
               />
               <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                 거래소에서 표시될 심볼을 입력하세요 (예: BTC, ETH)
               </p>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                 초기 발행량
               </label>
               <input
                 type="number"
                 value={newToken.supply}
                 onChange={(e) => setNewToken({ ...newToken, supply: e.target.value })}
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all"
                 placeholder="예: 1000000"
               />
               <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                 발행할 토큰의 총 수량을 입력하세요
               </p>
             </div>

             <div className="pt-4">
               <button
                 type="button"
                 onClick={() => createToken(newToken.name, newToken.symbol, newToken.supply)}
                 disabled={isLoading || !newToken.name || !newToken.symbol || !newToken.supply}
                 className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isLoading ? (
                   <>
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     토큰 생성 중...
                   </>
                 ) : (
                   <>
                     <Coins className="h-5 w-5 mr-2" />
                     토큰 생성하기
                   </>
                 )}
               </button>
             </div>
           </form>
         </div>

         {/* 설명 섹션 */}
         <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mt-8">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
             알아두세요
           </h3>
           {network === 'mainnet-beta' && (
             <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
               {networkInfo.warning}
             </div>
           )}
           <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
	   {networkInfo.items.map((item, index) => (
               <li key={index}>{item}</li>
             ))}
           </ul>
         </div>
       </div>
     )}
   </div>
 )
}