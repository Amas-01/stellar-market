import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-dark-border mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-stellar-blue to-stellar-purple rounded-lg" />
              <span className="text-lg font-bold text-dark-heading">
                StellarMarket
              </span>
            </div>
            <p className="text-sm text-dark-text">
              Decentralized freelance marketplace powered by Stellar and Soroban
              smart contracts.
            </p>
          </div>

          <div>
            <h4 className="text-dark-heading font-semibold mb-4">Platform</h4>
            <div className="flex flex-col gap-2">
              <Link href="/jobs" className="text-sm text-dark-text hover:text-dark-heading">
                Browse Jobs
              </Link>
              <Link href="/post-job" className="text-sm text-dark-text hover:text-dark-heading">
                Post a Job
              </Link>
              <Link href="/dashboard" className="text-sm text-dark-text hover:text-dark-heading">
                Dashboard
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-dark-heading font-semibold mb-4">Resources</h4>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-sm text-dark-text hover:text-dark-heading">
                Documentation
              </a>
              <a href="#" className="text-sm text-dark-text hover:text-dark-heading">
                API Reference
              </a>
              <a href="#" className="text-sm text-dark-text hover:text-dark-heading">
                Smart Contracts
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-dark-heading font-semibold mb-4">Community</h4>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-sm text-dark-text hover:text-dark-heading">
                GitHub
              </a>
              <a href="#" className="text-sm text-dark-text hover:text-dark-heading">
                Discord
              </a>
              <a href="#" className="text-sm text-dark-text hover:text-dark-heading">
                Twitter
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-dark-border mt-8 pt-8 text-center text-sm text-dark-text">
          &copy; {new Date().getFullYear()} StellarMarket Labs. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
