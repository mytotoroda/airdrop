// components/Footer.js
export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* 저작권 정보 */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            © 2024 Solana Meme Coin Manager. All rights reserved.
          </div>
          
          {/* 소셜 링크 */}
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" 
               className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200">
              Twitter
            </a>
            
            <a href="#" 
               className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200">
              Discord
            </a>
            
            <a href="#" 
               className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}