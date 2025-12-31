#!/bin/bash

# Script to check GitHub Actions status after a push
# Usage: ./scripts/check_actions.sh [wait_seconds]
# If wait_seconds is provided, will wait that long before checking

set -e

REPO="aussiedatagal/brick"
WAIT_TIME=${1:-30}  # Default to 30 seconds if not provided

echo "🔍 Checking GitHub Actions status for $REPO..."
echo "⏳ Waiting $WAIT_TIME seconds for workflow to start..."

sleep $WAIT_TIME

# Get the latest workflow run
echo "📡 Fetching latest workflow run status..."

# Use GitHub CLI if available, otherwise use API
if command -v gh &> /dev/null; then
    echo "✅ Using GitHub CLI..."
    
    # Get latest run
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo "⚠️  jq not found, using basic parsing..."
        # Get run info without jq
        RUN_INFO=$(gh run list --repo $REPO --limit 1)
        if [ -z "$RUN_INFO" ]; then
            echo "❌ No workflow runs found"
            exit 1
        fi
        RUN_ID=$(echo "$RUN_INFO" | head -1 | awk '{print $NF}')
        RUN_STATUS=$(echo "$RUN_INFO" | head -1 | awk '{print $2}')
        CONCLUSION=$(echo "$RUN_INFO" | head -1 | awk '{print $3}')
    else
        RUN_ID=$(gh run list --repo $REPO --limit 1 --json databaseId --jq '.[0].databaseId')
        
        if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
            echo "❌ No workflow runs found"
            exit 1
        fi
        
        echo "📋 Run ID: $RUN_ID"
        
        # Get run status
        STATUS=$(gh run view $RUN_ID --repo $REPO --json status,conclusion --jq '{status: .status, conclusion: .conclusion}')
        
        RUN_STATUS=$(echo $STATUS | jq -r '.status')
        CONCLUSION=$(echo $STATUS | jq -r '.conclusion')
    fi
    
    echo "📊 Status: $RUN_STATUS"
    echo "📊 Conclusion: $CONCLUSION"
    
    if [ "$RUN_STATUS" = "completed" ]; then
        if [ "$CONCLUSION" = "success" ]; then
            echo "✅ Workflow completed successfully!"
            exit 0
        else
            echo "❌ Workflow failed with conclusion: $CONCLUSION"
            echo ""
            echo "📝 Fetching error details..."
            echo ""
            
            # Get failed jobs
            gh run view $RUN_ID --repo $REPO --log-failed
            
            echo ""
            echo "🔗 View full logs: https://github.com/$REPO/actions/runs/$RUN_ID"
            echo ""
            echo "💡 To fix:"
            echo "   1. Review the error logs above"
            echo "   2. Fix the issue in your code"
            echo "   3. Commit and push the fix"
            echo "   4. Run this script again to verify"
            
            exit 1
        fi
    else
        echo "⏳ Workflow is still running ($RUN_STATUS)"
        echo "🔗 Monitor progress: https://github.com/$REPO/actions/runs/$RUN_ID"
        echo ""
        echo "💡 Run this script again in a minute to check final status"
        exit 2
    fi
else
    # Fallback to API if gh CLI not available
    echo "⚠️  GitHub CLI not found, using API (requires GITHUB_TOKEN)..."
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo "❌ GITHUB_TOKEN environment variable not set"
        echo "💡 Set it with: export GITHUB_TOKEN=your_token"
        echo "   Or install GitHub CLI: brew install gh"
        exit 1
    fi
    
    # Get latest workflow run using API
    RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO/actions/runs?per_page=1")
    
    RUN_ID=$(echo $RESPONSE | jq -r '.workflow_runs[0].id')
    RUN_STATUS=$(echo $RESPONSE | jq -r '.workflow_runs[0].status')
    CONCLUSION=$(echo $RESPONSE | jq -r '.workflow_runs[0].conclusion')
    
    if [ "$RUN_ID" = "null" ] || [ -z "$RUN_ID" ]; then
        echo "❌ No workflow runs found"
        exit 1
    fi
    
    echo "📋 Run ID: $RUN_ID"
    echo "📊 Status: $RUN_STATUS"
    echo "📊 Conclusion: $CONCLUSION"
    
    if [ "$RUN_STATUS" = "completed" ]; then
        if [ "$CONCLUSION" = "success" ]; then
            echo "✅ Workflow completed successfully!"
            exit 0
        else
            echo "❌ Workflow failed with conclusion: $CONCLUSION"
            echo "🔗 View logs: https://github.com/$REPO/actions/runs/$RUN_ID"
            exit 1
        fi
    else
        echo "⏳ Workflow is still running ($RUN_STATUS)"
        echo "🔗 Monitor progress: https://github.com/$REPO/actions/runs/$RUN_ID"
        exit 2
    fi
fi

