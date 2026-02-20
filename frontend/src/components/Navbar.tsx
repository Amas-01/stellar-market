"use client";

import Link from "next/link";
import { Wallet, Menu, X, LogOut, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWallet, truncateAddress } from "@/context/WalletContext";

function WalletButton({ className }: { className?: string }) {
  const { address, isConnecting, error, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isConnecting) {
    return (
      <button
        disabled
        className={`btn-primary flex items-center gap-2 text-sm opacity-70 cursor-not-allowed ${className ?? ""}`}
      >
        <Loader2 size={16} className="animate-spin" />
        Connecting...
      </button>
    );
  }

  if (address) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={`btn-primary flex items-center gap-2 text-sm ${className ?? ""}`}
        >
          <Wallet size={16} />
          {truncateAddress(address)}
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-dark-border rounded-lg shadow-lg py-1 z-50">
            <div className="px-4 py-2 text-xs text-dark-muted border-b border-dark-border break-all">
              {address}
            </div>
            <button
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
              className="w-full px-4 py-2 text-sm text-left text-dark-text hover:bg-dark-border/50 flex items-center gap-2 transition-colors"
            >
              <LogOut size={14} />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={connect}
        className={`btn-primary flex items-center gap-2 text-sm ${className ?? ""}`}
      >
        <Wallet size={16} />
        Connect Wallet
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-1 max-w-[220px]">{error}</p>
      )}
    </div>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-stellar-blue to-stellar-purple rounded-lg" />
            <span className="text-xl font-bold text-dark-heading">
              StellarMarket
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/jobs"
              className="text-dark-text hover:text-dark-heading transition-colors"
            >
              Jobs
            </Link>
            <Link
              href="/dashboard"
              className="text-dark-text hover:text-dark-heading transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/post-job"
              className="text-dark-text hover:text-dark-heading transition-colors"
            >
              Post a Job
            </Link>
            <WalletButton />
          </div>

          <button
            className="md:hidden text-dark-text"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-4">
            <Link href="/jobs" className="text-dark-text hover:text-dark-heading">
              Jobs
            </Link>
            <Link href="/dashboard" className="text-dark-text hover:text-dark-heading">
              Dashboard
            </Link>
            <Link href="/post-job" className="text-dark-text hover:text-dark-heading">
              Post a Job
            </Link>
            <WalletButton className="w-fit" />
          </div>
        )}
      </div>
    </nav>
  );
}
