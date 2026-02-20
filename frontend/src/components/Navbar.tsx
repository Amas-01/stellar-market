"use client";

import Link from "next/link";
import {
  Wallet,
  Menu,
  X,
  MessageSquare,
  Briefcase,
  LayoutDashboard,
  PenLine,
} from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/messages/unread-count`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setUnreadCount(response.data.count);
      } catch (err) {
        // Silent error for navbar badge
        console.log(err);
      }
    };

    fetchUnreadCount();
    // Refresh every 30 seconds for non-websocket version
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-stellar-blue to-stellar-purple rounded-lg group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold text-dark-heading">
              StellarMarket
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/jobs"
              className="text-dark-text hover:text-dark-heading transition-colors flex items-center gap-2"
            >
              <Briefcase size={16} />
              Jobs
            </Link>
            <Link
              href="/dashboard"
              className="text-dark-text hover:text-dark-heading transition-colors flex items-center gap-2"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <Link
              href="/messages"
              className="relative text-dark-text hover:text-dark-heading transition-colors flex items-center gap-2"
            >
              <MessageSquare size={16} />
              Messages
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-stellar-blue text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg border border-dark-bg animate-pulse">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/post-job"
              className="text-dark-text hover:text-dark-heading transition-colors flex items-center gap-2"
            >
              <PenLine size={16} />
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
            <Link
              href="/jobs"
              className="text-dark-text hover:text-dark-heading flex items-center gap-2"
            >
              <Briefcase size={18} /> Jobs
            </Link>
            <Link
              href="/dashboard"
              className="text-dark-text hover:text-dark-heading flex items-center gap-2"
            >
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <Link
              href="/messages"
              className="text-dark-text hover:text-dark-heading flex items-center gap-2"
            >
              <MessageSquare size={18} /> Messages
              {unreadCount > 0 && (
                <span className="bg-stellar-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/post-job"
              className="text-dark-text hover:text-dark-heading flex items-center gap-2"
            >
              <PenLine size={18} /> Post a Job
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
