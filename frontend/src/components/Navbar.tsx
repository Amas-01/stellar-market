"use client";

import Link from "next/link";
import { Wallet, Menu, X } from "lucide-react";
import { useState } from "react";

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
            <button className="btn-primary flex items-center gap-2 text-sm">
              <Wallet size={16} />
              Connect Wallet
            </button>
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
            <button className="btn-primary flex items-center gap-2 text-sm w-fit">
              <Wallet size={16} />
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
