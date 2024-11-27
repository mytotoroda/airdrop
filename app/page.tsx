//ts
'use client'
import { FC } from 'react'
import { useWallet } from '../contexts/WalletContext'

interface CardProps {
  title: string;
  description: string;
  href: string;
  bgColor: string;
  titleColor: string;
  buttonBgColor: string;
  buttonHoverColor: string;
}

const FeatureCard: FC<CardProps> = ({
  title,
  description,
  href,
  bgColor,
  titleColor,
  buttonBgColor,
  buttonHoverColor
}) => (
  <div className={`${bgColor} dark:bg-gray-700 p-6 rounded-lg hover:shadow-md transition-shadow`}>
    <h2 className={`text-xl font-semibold mb-4 ${titleColor}`}>
      {title}
    </h2>
    <p className="text-gray-600 dark:text-gray-300 mb-4">
      {description}
    </p>
    <a 
      href={href}
      className={`inline-block ${buttonBgColor} ${buttonHoverColor} text-white px-4 py-2 rounded-lg transition-colors`}
    >
      시작하기
    </a>
  </div>
);

const Home: FC = () => {
  const { publicKey, connectWallet, disconnectWallet } = useWallet();

  const features: CardProps[] = [
    {
      title: "밈코인 관리",
      description: "나만의 밈코인을 생성하고 관리하세요. 토큰 발행, 전송, 소각 등의 기능을 제공합니다.",
      href: "/meme-coins",
      bgColor: "bg-blue-50",
      titleColor: "text-blue-600 dark:text-blue-400",
      buttonBgColor: "bg-blue-500",
      buttonHoverColor: "hover:bg-blue-600"
    },
    {
      title: "에어드랍 관리",
      description: "토큰 에어드랍을 계획하고 실행하세요. 대상자 관리와 자동 배포 기능을 제공합니다.",
      href: "/airdrops",
      bgColor: "bg-green-50",
      titleColor: "text-green-600 dark:text-green-400",
      buttonBgColor: "bg-green-500",
      buttonHoverColor: "hover:bg-green-600"
    },
    {
      title: "유저 관리",
      description: "커뮤니티 멤버들을 관리하고 토큰 홀더들의 현황을 모니터링하세요.",
      href: "/users",
      bgColor: "bg-purple-50",
      titleColor: "text-purple-600 dark:text-purple-400",
      buttonBgColor: "bg-purple-500",
      buttonHoverColor: "hover:bg-purple-600"
    }
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Solana Meme Coin Manager
        </h1>
        
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>

        {/* 지갑 연결 섹션 */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            시작하기
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Phantom 지갑을 연결하고 Solana 네트워크에서 나만의 밈코인을 만들어보세요.
          </p>
          
          {publicKey ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                연결된 지갑: {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
              </p>
              <button 
                onClick={disconnectWallet}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-semibold transition-all"
              >
                지갑 연결 해제
              </button>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-3 rounded-lg font-semibold transition-all"
            >
              지갑 연결하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;