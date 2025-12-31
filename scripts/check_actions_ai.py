#!/usr/bin/env python3
"""
Script to check GitHub Actions status and format errors for AI assistance.
Usage: python scripts/check_actions_ai.py [wait_seconds]
"""

import sys
import time
import json
import subprocess
import os
from pathlib import Path

REPO = "aussiedatagal/brick"
DEFAULT_WAIT = 30


def run_command(cmd, capture_output=True):
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=capture_output,
            text=True,
            check=False
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)


def check_with_gh_cli():
    """Check Actions status using GitHub CLI."""
    # Get latest run
    success, output, _ = run_command(f"gh run list --repo {REPO} --limit 1 --json databaseId,status,conclusion,displayTitle")
    
    if not success or not output.strip():
        return None, "No workflow runs found or GitHub CLI error"
    
    try:
        runs = json.loads(output)
        if not runs:
            return None, "No workflow runs found"
        
        run = runs[0]
        run_id = run.get('databaseId')
        status = run.get('status')
        conclusion = run.get('conclusion')
        title = run.get('displayTitle', 'Unknown')
        
        return {
            'id': run_id,
            'status': status,
            'conclusion': conclusion,
            'title': title
        }, None
    except json.JSONDecodeError:
        return None, "Failed to parse GitHub CLI output"


def get_failed_jobs(run_id):
    """Get details of failed jobs."""
    success, output, _ = run_command(
        f"gh run view {run_id} --repo {REPO} --json jobs --jq '.jobs[] | select(.conclusion == \"failure\") | {{name: .name, conclusion: .conclusion, steps: .steps}}'"
    )
    
    if not success:
        return []
    
    try:
        jobs = json.loads(output)
        # If single job, wrap in array
        if isinstance(jobs, dict):
            jobs = [jobs]
        return jobs
    except (json.JSONDecodeError, TypeError):
        return []


def get_failed_logs(run_id, job_name):
    """Get logs for a failed job."""
    success, output, _ = run_command(
        f"gh run view {run_id} --repo {REPO} --log-failed --job {job_name} 2>&1"
    )
    return output if success else "Could not retrieve logs"


def format_for_ai(run_info, failed_jobs):
    """Format error information for AI assistant."""
    output = []
    output.append("=" * 80)
    output.append("GITHUB ACTIONS FAILURE REPORT")
    output.append("=" * 80)
    output.append("")
    output.append(f"Repository: {REPO}")
    output.append(f"Run ID: {run_info['id']}")
    output.append(f"Status: {run_info['status']}")
    output.append(f"Conclusion: {run_info['conclusion']}")
    output.append(f"Title: {run_info['title']}")
    output.append(f"URL: https://github.com/{REPO}/actions/runs/{run_info['id']}")
    output.append("")
    output.append("=" * 80)
    output.append("FAILED JOBS")
    output.append("=" * 80)
    output.append("")
    
    for job in failed_jobs:
        job_name = job.get('name', 'Unknown')
        output.append(f"Job: {job_name}")
        output.append("-" * 80)
        
        steps = job.get('steps', [])
        failed_steps = [s for s in steps if s.get('conclusion') == 'failure']
        
        for step in failed_steps:
            step_name = step.get('name', 'Unknown')
            output.append(f"  Failed Step: {step_name}")
            
            # Try to get logs for this step
            logs = get_failed_logs(run_info['id'], job_name)
            if logs and "Could not retrieve logs" not in logs:
                # Extract relevant error lines (last 50 lines usually contain the error)
                log_lines = logs.split('\n')
                error_lines = [line for line in log_lines if any(
                    keyword in line.lower() for keyword in ['error', 'failed', 'fatal', 'exception', '❌']
                )]
                
                if error_lines:
                    output.append("  Error Summary:")
                    for line in error_lines[-20:]:  # Last 20 error lines
                        output.append(f"    {line}")
                else:
                    # If no error keywords, show last 30 lines
                    output.append("  Last log lines:")
                    for line in log_lines[-30:]:
                        output.append(f"    {line}")
        
        output.append("")
    
    output.append("=" * 80)
    output.append("HOW TO FIX")
    output.append("=" * 80)
    output.append("")
    output.append("1. Review the errors above")
    output.append("2. Fix the issues in your code")
    output.append("3. Test locally: npm test -- --run")
    output.append("4. Commit and push the fix")
    output.append("5. Run this script again to verify")
    output.append("")
    output.append("=" * 80)
    
    return "\n".join(output)


def main():
    wait_time = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WAIT
    
    print(f"🔍 Checking GitHub Actions status for {REPO}...")
    print(f"⏳ Waiting {wait_time} seconds for workflow to start...")
    time.sleep(wait_time)
    
    # Check if gh CLI is available
    success, _, _ = run_command("which gh", capture_output=True)
    if not success:
        print("❌ GitHub CLI (gh) not found. Please install it:")
        print("   brew install gh")
        print("   gh auth login")
        sys.exit(1)
    
    # Check authentication
    success, _, _ = run_command("gh auth status", capture_output=True)
    if not success:
        print("❌ Not authenticated with GitHub CLI. Please run:")
        print("   gh auth login")
        sys.exit(1)
    
    print("📡 Fetching latest workflow run status...")
    run_info, error = check_with_gh_cli()
    
    if error:
        print(f"❌ {error}")
        sys.exit(1)
    
    if not run_info:
        print("❌ Could not retrieve workflow run information")
        sys.exit(1)
    
    print(f"📋 Run ID: {run_info['id']}")
    print(f"📊 Status: {run_info['status']}")
    print(f"📊 Conclusion: {run_info['conclusion']}")
    print(f"📝 Title: {run_info['title']}")
    print()
    
    if run_info['status'] == 'completed':
        if run_info['conclusion'] == 'success':
            print("✅ Workflow completed successfully!")
            sys.exit(0)
        else:
            print(f"❌ Workflow failed with conclusion: {run_info['conclusion']}")
            print()
            print("📝 Fetching detailed error information...")
            print()
            
            failed_jobs = get_failed_jobs(run_info['id'])
            
            if failed_jobs:
                # Format for AI
                ai_report = format_for_ai(run_info, failed_jobs)
                
                # Print to console
                print(ai_report)
                print()
                
                # Also save to file
                report_file = Path("actions_error_report.txt")
                report_file.write_text(ai_report)
                print(f"💾 Full report saved to: {report_file}")
                print()
                print("💡 Copy the report above and paste it into your AI assistant for help fixing the issues.")
            else:
                print("⚠️  Could not retrieve detailed job information")
                print(f"🔗 View logs manually: https://github.com/{REPO}/actions/runs/{run_info['id']}")
            
            sys.exit(1)
    else:
        print(f"⏳ Workflow is still running ({run_info['status']})")
        print(f"🔗 Monitor progress: https://github.com/{REPO}/actions/runs/{run_info['id']}")
        print()
        print("💡 Run this script again in a minute to check final status:")
        print(f"   python scripts/check_actions_ai.py {wait_time}")
        sys.exit(2)


if __name__ == "__main__":
    main()

