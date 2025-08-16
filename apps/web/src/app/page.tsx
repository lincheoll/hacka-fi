import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-900">
            Hacka-Fi
          </div>
          <div className="flex gap-6">
            <Link href="/hackathons" className="text-gray-600 hover:text-gray-900">
              Hackathons
            </Link>
            <Link href="/profile/me" className="text-gray-600 hover:text-gray-900">
              Profile
            </Link>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Connect Wallet
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Blockchain Hackathons
            <br />
            <span className="text-blue-600">Reimagined</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Participate in decentralized hackathons with transparent voting and automated prize distribution on the Kaia blockchain.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Link 
              href="/hackathons"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
            >
              Explore Hackathons
            </Link>
            <Link 
              href="/hackathons/create"
              className="px-8 py-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-lg"
            >
              Host a Hackathon
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              🏆
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Transparent Voting
            </h3>
            <p className="text-gray-600">
              Fair and transparent judging system with on-chain vote recording
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              💰
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Automated Prizes
            </h3>
            <p className="text-gray-600">
              Smart contract-powered automatic prize distribution to winners
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              ⚡
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Kaia Powered
            </h3>
            <p className="text-gray-600">
              Built on Kaia blockchain for fast, secure, and cost-effective transactions
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
