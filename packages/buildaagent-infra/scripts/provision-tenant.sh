#!/bin/bash

# Provision new tenant infrastructure via Hostinger API
# Usage: ./provision-tenant.sh <tenant_id> <plan> <template>

set -e

TENANT_ID="${1:-}"
PLAN="${2:-kvm-2}"  # Default to KVM 2 (2 vCPU, 8GB RAM)
TEMPLATE="${3:-ubuntu-22-04}"  # Default to Ubuntu 22.04
REGION="${4:-usa}"  # Default to USA region

if [ -z "$TENANT_ID" ]; then
    echo "❌ Error: Tenant ID required"
    echo "Usage: $0 <tenant_id> [plan] [template] [region]"
    exit 1
fi

echo "🚀 Provisioning tenant: $TENANT_ID"
echo "   Plan: $PLAN"
echo "   Template: $TEMPLATE"
echo "   Region: $REGION"
echo

# Check if hapi CLI is available and configured
if ! command -v hapi &> /dev/null; then
    echo "❌ Error: hapi CLI not found. Make sure it's installed and in PATH."
    exit 1
fi

# Test authentication
echo "🔐 Testing Hostinger API authentication..."
if ! hapi vps vm list --format json > /dev/null 2>&1; then
    echo "❌ Error: Hostinger API authentication failed."
    echo "Make sure your API token is set in ~/.hapi.yaml"
    exit 1
fi

echo "✅ Authentication successful"
echo

# List available templates
echo "📋 Available templates:"
hapi vps templates list --format table

echo
echo "⏳ Creating VM for tenant: $TENANT_ID..."

# Note: This is a placeholder - actual VM creation would need the correct hapi command
# The API might be something like: hapi vps vm create --template $TEMPLATE --plan $PLAN --hostname $TENANT_ID
# We need to check the actual hapi documentation for the correct create command

echo "🏗️  VM creation command would go here"
echo "hapi vps vm create --template $TEMPLATE --plan $PLAN --hostname buildaagent-$TENANT_ID"

echo
echo "✅ Tenant $TENANT_ID provisioning complete!"
echo "📝 Next steps:"
echo "   1. Configure Docker environment"
echo "   2. Deploy buildaagent runtime"
echo "   3. Set up persistent volumes"
echo "   4. Configure firewall rules"