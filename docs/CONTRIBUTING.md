# Contributing to StellarMarket

Thank you for your interest in contributing to StellarMarket! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** >= 18
- **Rust** (latest stable) with `wasm32-unknown-unknown` target
- **Soroban CLI**
- **PostgreSQL** >= 14

### Setting Up Locally

1. Fork and clone the repository
2. Install dependencies for each package:

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install

# Contracts (ensure Rust wasm target is installed)
rustup target add wasm32-unknown-unknown
```

3. Set up environment variables:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

4. Set up the database:

```bash
cd backend && npx prisma migrate dev
```

## Project Structure

- `frontend/` — Next.js application (TypeScript, Tailwind CSS)
- `backend/` — Express API server (TypeScript, Prisma, PostgreSQL)
- `contracts/` — Soroban smart contracts (Rust)
  - `escrow/` — Escrow and milestone payment logic
  - `reputation/` — On-chain reputation system
  - `dispute/` — Dispute resolution and arbitration

## Coding Standards

### TypeScript (Frontend & Backend)

- Use TypeScript strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful variable and function names

### Rust (Smart Contracts)

- Follow standard Rust conventions (`cargo fmt`, `cargo clippy`)
- Write comprehensive tests for all contract functions
- Document public functions with doc comments

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a PR with a clear description of changes

## Issue Labels

- `good first issue` — Suitable for newcomers
- `bug` — Something isn't working
- `enhancement` — New feature or improvement
- `smart-contract` — Related to Soroban contracts
- `frontend` — Related to the Next.js app
- `backend` — Related to the Express API
- `documentation` — Documentation improvements

## Code of Conduct

Be respectful and constructive in all interactions. We are committed to providing a welcoming and inclusive experience for everyone.
