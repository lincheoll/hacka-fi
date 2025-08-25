#!/bin/bash

# =============================================================================
# 00 - HackaFi Complete Setup Guide
# =============================================================================
# This master script provides an overview and guided setup process for the
# entire HackaFi development environment from system prerequisites to production.
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPTS_DIR")"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BOLD}${BLUE}==== $1 ====${NC}"
}

log_header() {
    echo -e "${BOLD}${CYAN}$1${NC}"
}

# Show the complete setup overview
show_setup_overview() {
    clear
    
    echo -e "${BOLD}${CYAN}"
    echo "🚀 HackaFi Complete Setup Guide"
    echo "==============================="
    echo -e "${NC}"
    
    echo "This guide will help you set up HackaFi from scratch to a fully"
    echo "functional development or production environment."
    echo ""
    
    echo -e "${BOLD}Tech Stack:${NC}"
    echo "  • Frontend:       Next.js 15+ + TypeScript + Tailwind CSS + wagmi v2"
    echo "  • Backend:        NestJS 11+ + Prisma + PostgreSQL/SQLite"
    echo "  • Smart Contracts: Solidity + Foundry"
    echo "  • Infrastructure: Turborepo + Docker Compose"
    echo "  • Blockchain:     Kaia Network (Testnet/Mainnet)"
    echo ""
    
    echo -e "${BOLD}Setup Process (8 Steps):${NC}"
    echo ""
    
    local scripts=(
        "01-system-prerequisites.sh:System Prerequisites:Install Node.js, pnpm, Docker, Foundry"
        "02-foundry-installation.sh:Foundry Installation:Install Ethereum development toolkit"
        "03-project-dependencies.sh:Project Dependencies:Clone project and install all dependencies"
        "04-environment-setup.sh:Environment Setup:Configure environment variables and secrets"
        "05-database-setup.sh:Database Setup:Setup Prisma, run migrations, seed data"
        "06-smart-contracts.sh:Smart Contracts:Compile, test, and deploy contracts"
        "07-development-start.sh:Development Start:Start development servers and tools"
        "08-production-setup.sh:Production Setup:Deploy to production environment"
    )
    
    for i in "${!scripts[@]}"; do
        local script_info=(${scripts[i]//:/ })
        local script_name="${script_info[0]}"
        local step_name="${script_info[1]}"
        local description="${script_info[2]}"
        
        local step_num=$((i + 1))
        
        # Check if script exists and is executable
        local status_icon="⚪"
        local status_text="Ready"
        
        if [[ -f "$SCRIPTS_DIR/$script_name" ]]; then
            if [[ -x "$SCRIPTS_DIR/$script_name" ]]; then
                status_icon="✅"
                status_text="Available"
            else
                status_icon="⚠️"
                status_text="Not Executable"
            fi
        else
            status_icon="❌"
            status_text="Missing"
        fi
        
        echo -e "  ${BOLD}${step_num}.${NC} ${status_icon} ${BOLD}${step_name}${NC}"
        echo -e "     Script: ${script_name} (${status_text})"
        echo -e "     ${description}"
        echo ""
    done
    
    echo -e "${BOLD}Choose Your Path:${NC}"
    echo "  🏃 Quick Start: Run all steps automatically (recommended for first-time setup)"
    echo "  🎯 Step-by-Step: Run individual steps with guidance"
    echo "  📚 Manual Setup: Get commands to run manually"
    echo "  ℹ️  Information: View detailed information about each step"
    echo ""
}

# Quick start - run all steps automatically
run_quick_start() {
    log_step "Quick Start - Automated Setup"
    
    echo "This will run all setup steps automatically with minimal prompts."
    echo "You'll be asked for configuration choices where needed."
    echo ""
    
    log_warning "⚠️  This process may take 15-30 minutes depending on your internet connection."
    echo ""
    
    read -p "Do you want to start the automated setup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi
    
    local scripts=(
        "01-system-prerequisites.sh"
        "02-foundry-installation.sh"
        "03-project-dependencies.sh"
        "04-environment-setup.sh"
        "05-database-setup.sh"
        "06-smart-contracts.sh"
        "07-development-start.sh"
    )
    
    log_info "Starting automated HackaFi setup..."
    
    for script in "${scripts[@]}"; do
        local script_path="$SCRIPTS_DIR/$script"
        
        if [[ -f "$script_path" && -x "$script_path" ]]; then
            log_step "Running $script"
            
            if "$script_path"; then
                log_success "$script completed successfully"
            else
                log_error "$script failed"
                echo ""
                echo "Setup halted. You can continue manually by running:"
                echo "  ./$script_path"
                return 1
            fi
        else
            log_error "Script not found or not executable: $script"
            return 1
        fi
    done
    
    echo ""
    log_success "🎉 Quick start setup completed!"
    echo ""
    echo "Your HackaFi development environment is ready!"
    echo "Access your application at: http://localhost:3000"
}

# Step-by-step guided setup
run_step_by_step() {
    log_step "Step-by-Step Guided Setup"
    
    local scripts=(
        "01-system-prerequisites.sh:System Prerequisites"
        "02-foundry-installation.sh:Foundry Installation"
        "03-project-dependencies.sh:Project Dependencies"
        "04-environment-setup.sh:Environment Setup"
        "05-database-setup.sh:Database Setup"
        "06-smart-contracts.sh:Smart Contracts"
        "07-development-start.sh:Development Start"
        "08-production-setup.sh:Production Setup (Optional)"
    )
    
    echo "Choose which step to run:"
    echo ""
    
    for i in "${!scripts[@]}"; do
        local script_info=(${scripts[i]//:/ })
        local script_name="${script_info[0]}"
        local step_name="${script_info[1]}"
        
        local step_num=$((i + 1))
        echo "  $step_num. $step_name ($script_name)"
    done
    
    echo "  9. Return to main menu"
    echo ""
    
    read -p "Enter step number (1-9): " step_choice
    
    case $step_choice in
        [1-8])
            local script_index=$((step_choice - 1))
            local script_info=(${scripts[script_index]//:/ })
            local script_name="${script_info[0]}"
            local script_path="$SCRIPTS_DIR/$script_name"
            
            if [[ -f "$script_path" && -x "$script_path" ]]; then
                log_info "Running $script_name..."
                "$script_path"
            else
                log_error "Script not found or not executable: $script_name"
            fi
            ;;
        9)
            return
            ;;
        *)
            log_error "Invalid choice: $step_choice"
            ;;
    esac
}

# Show manual setup commands
show_manual_setup() {
    log_step "Manual Setup Commands"
    
    echo "Run these commands in order to set up HackaFi manually:"
    echo ""
    
    echo -e "${BOLD}1. System Prerequisites:${NC}"
    echo "   ./scripts/01-system-prerequisites.sh"
    echo "   # Installs Node.js, pnpm, Docker, and verifies ports"
    echo ""
    
    echo -e "${BOLD}2. Foundry Installation:${NC}"
    echo "   ./scripts/02-foundry-installation.sh"
    echo "   # Installs Foundry toolkit for smart contract development"
    echo ""
    
    echo -e "${BOLD}3. Project Dependencies:${NC}"
    echo "   ./scripts/03-project-dependencies.sh"
    echo "   # Clones project (if needed) and installs all dependencies"
    echo ""
    
    echo -e "${BOLD}4. Environment Setup:${NC}"
    echo "   ./scripts/04-environment-setup.sh"
    echo "   # Configures environment variables and blockchain settings"
    echo ""
    
    echo -e "${BOLD}5. Database Setup:${NC}"
    echo "   ./scripts/05-database-setup.sh"
    echo "   # Sets up Prisma, runs migrations, optionally seeds data"
    echo ""
    
    echo -e "${BOLD}6. Smart Contracts:${NC}"
    echo "   ./scripts/06-smart-contracts.sh"
    echo "   # Compiles, tests, and deploys smart contracts"
    echo ""
    
    echo -e "${BOLD}7. Development Start:${NC}"
    echo "   ./scripts/07-development-start.sh"
    echo "   # Starts development servers with hot reload"
    echo ""
    
    echo -e "${BOLD}8. Production Setup (Optional):${NC}"
    echo "   ./scripts/08-production-setup.sh"
    echo "   # Deploys to production with Docker Compose"
    echo ""
    
    echo -e "${BOLD}Alternative - Start Development Directly:${NC}"
    echo "   pnpm dev"
    echo "   # Starts both API and Web servers (after setup)"
    echo ""
    
    echo -e "${BOLD}Individual Service Commands:${NC}"
    echo "   cd apps/api && pnpm dev     # API server only"
    echo "   cd apps/web && pnpm dev     # Web server only"
    echo "   cd contracts && forge build # Smart contracts only"
    echo ""
}

# Show detailed information
show_detailed_info() {
    log_step "Detailed Setup Information"
    
    echo "Choose a topic for detailed information:"
    echo ""
    echo "  1. System Requirements and Prerequisites"
    echo "  2. Project Structure and Architecture"
    echo "  3. Environment Configuration"
    echo "  4. Database Setup and Prisma"
    echo "  5. Smart Contract Development"
    echo "  6. Development Workflow"
    echo "  7. Production Deployment"
    echo "  8. Troubleshooting Common Issues"
    echo "  9. Return to main menu"
    echo ""
    
    read -p "Enter topic number (1-9): " info_choice
    
    case $info_choice in
        1) show_system_requirements ;;
        2) show_project_structure ;;
        3) show_environment_info ;;
        4) show_database_info ;;
        5) show_smart_contract_info ;;
        6) show_development_workflow ;;
        7) show_production_info ;;
        8) show_troubleshooting ;;
        9) return ;;
        *) log_error "Invalid choice: $info_choice" ;;
    esac
}

# Detailed information functions
show_system_requirements() {
    echo -e "${BOLD}System Requirements${NC}"
    echo ""
    echo "Minimum Requirements:"
    echo "  • OS: macOS 10.15+ or Ubuntu 18.04+"
    echo "  • RAM: 4GB (8GB recommended)"
    echo "  • Storage: 10GB free space"
    echo "  • Node.js: 20+"
    echo "  • Docker: 20.10+"
    echo ""
    echo "Software Prerequisites:"
    echo "  • Node.js 20+ (installed via nvm)"
    echo "  • pnpm 9.0+"
    echo "  • Docker & Docker Compose"
    echo "  • Git"
    echo "  • Foundry (forge, cast, anvil, chisel)"
    echo ""
    echo "Network Requirements:"
    echo "  • Ports: 3000 (Web), 3010 (API), 5432 (DB), 6379 (Redis)"
    echo "  • Internet connection for package downloads"
    echo "  • Access to Kaia blockchain RPC endpoints"
    echo ""
}

show_project_structure() {
    echo -e "${BOLD}Project Structure${NC}"
    echo ""
    echo "HackaFi is a Turborepo monorepo with:"
    echo ""
    echo "📁 Project Layout:"
    echo "  apps/"
    echo "    web/          # Next.js 15+ frontend"
    echo "    api/          # NestJS 11+ backend"
    echo "  contracts/      # Solidity smart contracts"
    echo "  packages/       # Shared packages"
    echo "  scripts/        # Setup and deployment scripts"
    echo ""
    echo "🔧 Technology Stack:"
    echo "  • Frontend: Next.js + TypeScript + Tailwind + wagmi"
    echo "  • Backend: NestJS + Prisma + PostgreSQL/SQLite"
    echo "  • Contracts: Solidity + Foundry"
    echo "  • Infrastructure: Docker + Turborepo"
    echo ""
}

show_environment_info() {
    echo -e "${BOLD}Environment Configuration${NC}"
    echo ""
    echo "Environment Files:"
    echo "  • .env                    # Docker Compose orchestration"
    echo "  • apps/web/.env          # Next.js frontend settings"
    echo "  • apps/api/.env          # NestJS backend settings"
    echo "  • contracts/.env         # Smart contract deployment"
    echo ""
    echo "Key Configuration:"
    echo "  • Blockchain network (Kaia Testnet/Mainnet)"
    echo "  • Database connection (SQLite/PostgreSQL)"
    echo "  • JWT secrets and security settings"
    echo "  • Smart contract addresses"
    echo "  • WalletConnect configuration"
    echo ""
}

show_database_info() {
    echo -e "${BOLD}Database Setup${NC}"
    echo ""
    echo "Database Options:"
    echo "  • SQLite: Default for development (no setup required)"
    echo "  • PostgreSQL: Production and advanced development"
    echo ""
    echo "Prisma Operations:"
    echo "  • prisma generate    # Generate client code"
    echo "  • prisma migrate dev # Create and apply migrations"
    echo "  • prisma db seed     # Seed database with test data"
    echo "  • prisma studio      # Database browser UI"
    echo ""
    echo "Data Models:"
    echo "  • UserProfile: User accounts and profiles"
    echo "  • Hackathon: Competition events"
    echo "  • Participant: Competition entries"
    echo "  • Vote: Judge voting records"
    echo "  • PrizePool: Prize distribution tracking"
    echo ""
}

show_smart_contract_info() {
    echo -e "${BOLD}Smart Contract Development${NC}"
    echo ""
    echo "Foundry Toolkit:"
    echo "  • forge: Build and test contracts"
    echo "  • cast: Interact with blockchain"
    echo "  • anvil: Local blockchain node"
    echo "  • chisel: Solidity REPL"
    echo ""
    echo "Key Contracts:"
    echo "  • HackathonRegistry: Main competition management"
    echo "  • PrizePool: Prize distribution and claiming"
    echo ""
    echo "Deployment Networks:"
    echo "  • Kaia Kairos Testnet (development)"
    echo "  • Kaia Mainnet (production)"
    echo "  • Local Anvil (testing)"
    echo ""
}

show_development_workflow() {
    echo -e "${BOLD}Development Workflow${NC}"
    echo ""
    echo "Daily Development:"
    echo "  1. pnpm dev              # Start all services"
    echo "  2. Code with hot reload enabled"
    echo "  3. Test changes in browser/API"
    echo "  4. Run tests: pnpm test"
    echo "  5. Lint: pnpm lint"
    echo ""
    echo "Database Changes:"
    echo "  1. Modify Prisma schema"
    echo "  2. cd apps/api && pnpm prisma migrate dev"
    echo "  3. pnpm prisma generate"
    echo ""
    echo "Smart Contract Changes:"
    echo "  1. Modify contracts in contracts/src/"
    echo "  2. cd contracts && forge build"
    echo "  3. forge test"
    echo "  4. Deploy if needed"
    echo ""
}

show_production_info() {
    echo -e "${BOLD}Production Deployment${NC}"
    echo ""
    echo "Production Features:"
    echo "  • Optimized Docker builds"
    echo "  • PostgreSQL + Redis"
    echo "  • Security hardening"
    echo "  • Health monitoring"
    echo "  • Automated backups"
    echo ""
    echo "Deployment Process:"
    echo "  1. Configure production environment"
    echo "  2. Build production Docker images"
    echo "  3. Deploy with docker-compose"
    echo "  4. Run database migrations"
    echo "  5. Set up monitoring and backups"
    echo ""
    echo "Production Checklist:"
    echo "  • SSL certificates configured"
    echo "  • Domain names set up"
    echo "  • Environment secrets secured"
    echo "  • Backup strategy implemented"
    echo "  • Monitoring alerts configured"
    echo ""
}

show_troubleshooting() {
    echo -e "${BOLD}Troubleshooting Common Issues${NC}"
    echo ""
    echo "Port Already in Use:"
    echo "  • Check: lsof -i :3000 -i :3010"
    echo "  • Kill process or change ports in .env"
    echo ""
    echo "Docker Issues:"
    echo "  • Start Docker Desktop"
    echo "  • Check: docker info"
    echo "  • Clean up: docker system prune"
    echo ""
    echo "Database Connection:"
    echo "  • Check DATABASE_URL in apps/api/.env"
    echo "  • For PostgreSQL: docker compose up -d db"
    echo "  • Reset SQLite: rm apps/api/prisma/dev.db"
    echo ""
    echo "Smart Contract Issues:"
    echo "  • Check private key in contracts/.env"
    echo "  • Ensure wallet has funds on chosen network"
    echo "  • Verify RPC URL accessibility"
    echo ""
    echo "Build Failures:"
    echo "  • Clear cache: pnpm clean"
    echo "  • Reinstall: rm -rf node_modules && pnpm install"
    echo "  • Check TypeScript errors: pnpm typecheck"
    echo ""
}

# Main menu loop
main_menu() {
    while true; do
        show_setup_overview
        
        echo -e "${BOLD}What would you like to do?${NC}"
        echo ""
        echo "  1. 🏃 Quick Start (Automated setup)"
        echo "  2. 🎯 Step-by-Step Setup"
        echo "  3. 📚 Manual Setup Commands"
        echo "  4. ℹ️  Detailed Information"
        echo "  5. 🚪 Exit"
        echo ""
        
        read -p "Enter your choice (1-5): " main_choice
        
        case $main_choice in
            1) run_quick_start ;;
            2) run_step_by_step ;;
            3) show_manual_setup ;;
            4) show_detailed_info ;;
            5) 
                log_info "Thanks for using HackaFi Setup Guide!"
                exit 0
                ;;
            *)
                log_error "Invalid choice: $main_choice"
                echo ""
                read -p "Press Enter to continue..."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to return to main menu..."
    done
}

# Check if script is run directly or sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is run directly
    cd "$PROJECT_ROOT"
    main_menu
else
    # Script is sourced
    log_info "HackaFi Setup Guide loaded. Run main_menu to start."
fi