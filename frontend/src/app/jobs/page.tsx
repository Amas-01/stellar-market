"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import JobCard from "@/components/JobCard";
import { Job } from "@/types";

const mockJobs: Job[] = [
  {
    id: "1", title: "Build Soroban DEX Frontend", description: "Looking for a React developer to build the frontend for a decentralized exchange on Soroban. Must have experience with Stellar SDK and DeFi interfaces.", budget: 5000, category: "Frontend", status: "OPEN", createdAt: "2025-01-15T00:00:00Z", client: { id: "c1", walletAddress: "GABCD...", username: "stellarbuilder", role: "CLIENT" }, milestones: [], _count: { applications: 5 },
  },
  {
    id: "2", title: "Smart Contract Audit for Lending Protocol", description: "Need an experienced Soroban developer to audit our lending protocol smart contracts. Focus on security vulnerabilities and gas optimization.", budget: 8000, category: "Smart Contract", status: "OPEN", createdAt: "2025-01-14T00:00:00Z", client: { id: "c2", walletAddress: "GEFGH...", username: "defiteam", role: "CLIENT" }, milestones: [], _count: { applications: 3 },
  },
  {
    id: "3", title: "Design Brand Identity for Stellar Wallet", description: "Create complete brand identity including logo, color palette, typography, and UI component library for a new Stellar wallet application.", budget: 3000, category: "Design", status: "OPEN", createdAt: "2025-01-13T00:00:00Z", client: { id: "c3", walletAddress: "GIJKL...", username: "walletlabs", role: "CLIENT" }, milestones: [], _count: { applications: 8 },
  },
  {
    id: "4", title: "Node.js Backend for NFT Marketplace", description: "Build a scalable REST API with Express and PostgreSQL for an NFT marketplace on Stellar. Includes user auth, listing management, and transaction history.", budget: 6000, category: "Backend", status: "IN_PROGRESS", createdAt: "2025-01-12T00:00:00Z", client: { id: "c4", walletAddress: "GMNOP...", username: "nftstellar", role: "CLIENT" }, milestones: [], _count: { applications: 12 },
  },
  {
    id: "5", title: "Technical Documentation Writer", description: "Write comprehensive developer documentation for our Soroban-based payment protocol including guides, API references, and integration tutorials.", budget: 2000, category: "Documentation", status: "OPEN", createdAt: "2025-01-11T00:00:00Z", client: { id: "c5", walletAddress: "GQRST...", username: "payprotocol", role: "CLIENT" }, milestones: [], _count: { applications: 2 },
  },
  {
    id: "6", title: "Mobile App for Stellar Payments", description: "Develop a cross-platform mobile app (React Native) for sending and receiving Stellar payments with QR code scanning and contact management.", budget: 12000, category: "Mobile", status: "OPEN", createdAt: "2025-01-10T00:00:00Z", client: { id: "c6", walletAddress: "GUVWX...", username: "mobilestellar", role: "CLIENT" }, milestones: [], _count: { applications: 7 },
  },
  {
    id: "7", title: "Implement Governance Module for DAO", description: "Build a governance module with proposal creation, token-weighted voting, and timelock execution for a Stellar-based DAO.", budget: 9000, category: "Smart Contract", status: "OPEN", createdAt: "2025-01-09T00:00:00Z", client: { id: "c7", walletAddress: "GYZA1...", username: "stellardao", role: "CLIENT" }, milestones: [], _count: { applications: 4 },
  },
  {
    id: "8", title: "Data Analytics Dashboard", description: "Create a real-time analytics dashboard showing Stellar network metrics, transaction volumes, and DeFi protocol stats using Next.js and D3.js.", budget: 4500, category: "Frontend", status: "COMPLETED", createdAt: "2025-01-08T00:00:00Z", client: { id: "c8", walletAddress: "GB234...", username: "analyticshub", role: "CLIENT" }, milestones: [], _count: { applications: 6 },
  },
];

const categories = ["All", "Frontend", "Backend", "Smart Contract", "Design", "Mobile", "Documentation"];

export default function JobsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filtered = mockJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || job.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-dark-heading mb-8">
        Browse Jobs
      </h1>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text" size={18} />
          <input
            type="text"
            placeholder="Search jobs..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-stellar-blue text-white"
                  : "bg-dark-card border border-dark-border text-dark-text hover:border-stellar-blue"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Job Listings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-dark-text">
          No jobs found matching your criteria.
        </div>
      )}
    </div>
  );
}
