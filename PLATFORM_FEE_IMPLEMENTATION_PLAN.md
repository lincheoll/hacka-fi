# Platform Fee System Implementation Plan

## Overview

Implementation plan for integrating the new platform fee system into the full-stack application following smart contract updates.

## Smart Contract Changes Completed ✅

- Added `platformFeeRate` and `platformFeeRecipient` state variables
- Extended `PrizeConfiguration` struct with `lockedFeeRate` field
- Implemented fee management functions: `setPlatformFeeRate()`, `setPlatformFeeRecipient()`, `getPlatformFeeInfo()`
- Added platform fee collection events
- Updated `distributePrizes()` logic to deduct fees before distribution

---

## Phase 1: Backend Foundation Works 🏗️

### 1.1 Contract Deployment Preparation ✅

- [x] Compile and test updated PrizePool contract
- [x] Write migration scripts for contract upgrade
- [x] Test fee calculation logic with various scenarios
- [x] Verify all new functions work correctly
- [x] Fix test compatibility issues with new fee system
- [x] Create comprehensive fee system test suite (7 tests)

### 1.2 Database Schema Updates ✅

- [x] Add `locked_fee_rate` column to `prize_pools` table
- [x] Add `token_address` column to `prize_pools` table for ERC20 support
- [x] Create `platform_fee_history` table for fee rate change tracking
- [x] Create `platform_fee_collections` table for fee collection records
- [x] Update Prisma schema and generate migration (`20250826101421_add_platform_fee_system`)
- [x] Test database migrations on development environment
- [x] Generate updated Prisma client with new models and types

### 1.3 Backend Service Layer Extension

- [ ] Extend `PrizePoolService` with fee-related methods:
  - `setPlatformFeeRate(rate: number)`
  - `setPlatformFeeRecipient(address: string)`
  - `getPlatformFeeInfo()`
  - `calculateFeeDistribution(hackathonId: string)`
- [ ] Update contract event listeners for new events:
  - `PlatformFeeRateUpdated`
  - `PlatformFeeRecipientUpdated`
  - `PlatformFeeCollected`
- [ ] Add fee calculation utilities
- [ ] Update Web3 service integration

### 1.4 API Endpoints Development

- [ ] **Admin APIs**:
  - `POST /api/admin/platform-fee/rate` - Update fee rate
  - `POST /api/admin/platform-fee/recipient` - Update fee recipient
  - `GET /api/admin/platform-fee/history` - Get fee change history
  - `GET /api/admin/fee-collections` - Get fee collection records
- [ ] **Public APIs**:
  - `GET /api/platform/fee-info` - Get current fee information
  - `GET /api/hackathons/:id/fee-details` - Get hackathon-specific fee info
- [ ] **Updated APIs**:
  - Modify `GET /api/hackathons/:id` to include fee-adjusted prize amounts
  - Update prize pool creation responses with fee preview

---

## Phase 2: Frontend UI Integration 🎨

### 2.1 Web3 Integration Updates

- [ ] Update contract ABI files with new functions
- [ ] Extend `useContract` hooks with fee management functions
- [ ] Add transaction handlers for fee-related operations
- [ ] Update contract event listeners in React components
- [ ] Test Web3 integration with MetaMask/wallet connections

### 2.2 Hackathon Page UI Improvements

- [ ] **Prize Display Enhancement**:
  - Show both total prize pool and actual distribution amount
  - Add fee percentage display: "Total: 1000 USDT → Distributed: 975 USDT (2.5% platform fee)"
  - Create fee info tooltip/modal for transparency
- [ ] **Prize Pool Creation Flow**:
  - Add fee preview component during pool creation
  - Show fee calculation in real-time as user enters amount
  - Add fee disclosure checkbox/acknowledgment
- [ ] **Winner Distribution Display**:
  - Update winner payout calculations to reflect fee-adjusted amounts
  - Maintain clear separation between gross and net amounts

### 2.3 Admin Dashboard Development

- [ ] **Fee Management Page**:
  - Fee rate adjustment interface with validation
  - Fee recipient address management
  - Real-time fee rate preview with impact calculation
- [ ] **Analytics Dashboard**:
  - Total fees collected metrics
  - Fee collection history charts
  - Platform revenue analytics
- [ ] **Settings History**:
  - Fee rate change timeline
  - Admin action logs
  - Impact analysis of rate changes

---

## Phase 3: Testing & Deployment 🚀

### 3.1 Integration Testing

- [ ] **E2E Test Scenarios**:
  - Complete hackathon flow with fee collection
  - Fee rate changes during different hackathon phases
  - Admin dashboard functionality testing
  - Multi-token fee collection (KAIA + USDT)
- [ ] **Edge Case Testing**:
  - Zero fee rate scenarios
  - Maximum fee rate scenarios
  - Failed fee transfer handling
  - Fee recipient address changes
- [ ] **Performance Testing**:
  - Fee calculation performance with large prize pools
  - Database query optimization for fee history
  - UI responsiveness with real-time fee updates

### 3.2 Deployment & Monitoring

- [ ] **Staging Deployment**:
  - Deploy updated contracts to testnet
  - Deploy backend with fee APIs
  - Deploy frontend with fee UI
  - Comprehensive staging testing
- [ ] **Production Deployment**:
  - Contract deployment to mainnet
  - Backend deployment with database migration
  - Frontend deployment with feature flags
  - Gradual rollout strategy
- [ ] **Monitoring Setup**:
  - Fee collection tracking and alerts
  - Contract event monitoring
  - Revenue dashboard setup
  - Error tracking for fee-related operations

---

## Technical Specifications

### Database Schema Changes

```sql
-- Add to hackathons table
ALTER TABLE hackathons ADD COLUMN locked_fee_rate INTEGER DEFAULT 250;

-- New tables
CREATE TABLE platform_fee_history (
  id SERIAL PRIMARY KEY,
  old_rate INTEGER,
  new_rate INTEGER,
  changed_by VARCHAR(42),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fee_collections (
  id SERIAL PRIMARY KEY,
  hackathon_id INTEGER REFERENCES hackathons(id),
  amount VARCHAR(78),
  token_address VARCHAR(42),
  collected_at TIMESTAMP,
  transaction_hash VARCHAR(66)
);
```

### API Response Updates

```typescript
interface HackathonDetail {
  // ... existing fields
  feeInfo: {
    lockedFeeRate: number; // Fee rate locked at creation (basis points)
    totalPrizePool: string; // Original prize pool amount
    platformFee: string; // Platform fee amount
    distributionAmount: string; // Amount actually distributed to winners
  };
}

interface PlatformFeeInfo {
  currentFeeRate: number; // Current platform fee rate (basis points)
  feeRecipient: string; // Address receiving fees
  lastUpdated: string; // Timestamp of last update
}
```

---

## Risk Mitigation

### Technical Risks

- **Contract Upgrade Risk**: Thorough testing of new contract functions
- **Database Migration Risk**: Backup and rollback procedures
- **UI Breaking Changes**: Gradual rollout with feature flags

### Business Risks

- **User Acceptance**: Clear communication about fee introduction
- **Fee Transparency**: Prominent display of all fees and calculations
- **Competitive Impact**: Monitor user adoption and feedback

---

## Success Metrics

### Technical Metrics

- [ ] 100% successful fee collection transactions
- [ ] <100ms response time for fee calculation APIs
- [ ] Zero database migration issues

### Business Metrics

- [ ] Platform fee collection accuracy (100% of expected)
- [ ] User retention rate (maintain >90% of pre-fee levels)
- [ ] Admin dashboard usage and efficiency

---

## Timeline Estimate

**Phase 1 (Backend)**: 7-10 days
**Phase 2 (Frontend)**: 7-10 days  
**Phase 3 (Testing & Deployment)**: 3-5 days

**Total Estimated Duration**: 2.5-3.5 weeks

---

## Team Responsibilities

### Smart Contract Developer

- Contract testing and deployment
- Migration script development

### Backend Developer

- API development and database changes
- Event listener implementation

### Frontend Developer

- UI/UX implementation
- Web3 integration updates

### DevOps Engineer

- Deployment pipeline setup
- Monitoring and alerting configuration

---

_Last Updated: 2025-01-26_
_Status: Planning Phase - Ready for Implementation_
