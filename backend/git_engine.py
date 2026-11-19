#!/usr/bin/env python3
"""
NEVEA AI — Universal Git & Code Hosting Automation Engine
==========================================================
Handles:
1. Remote Git API interactions (GitHub, GitLab, Codeberg, Forgejo) using `requests`.
2. Local repository operations (clone, pull, commit, push, status, init) using `subprocess`.
3. Unified `execute_git_action` function with robust authentication & system error handling.
"""

import sys
import os
import json
import subprocess
from typing import Dict, Any, Optional

try:
    import requests
except ImportError:
    requests = None

try:
    import git as git_python
except ImportError:
    git_python = None

import urllib.request
import urllib.error


# -----------------------------------------------------------------------------
# 1. AUTHENTICATION & VAULT RESOLUTION
# -----------------------------------------------------------------------------
def get_platform_token(platform: str) -> str:
    """
    Retrieve personal access token for GitHub, GitLab, Codeberg, or Forgejo.
    Resolves from environment variables or local electron-store vault files.
    """
    plat = platform.lower().strip()
    env_map = {
        "github": "GITHUB_TOKEN",
        "gitlab": "GITLAB_TOKEN",
        "codeberg": "CODEBERG_TOKEN",
        "forgejo": "FORGEJO_TOKEN",
        "gitea": "FORGEJO_TOKEN",
    }
    env_var = env_map.get(plat, f"{plat.upper()}_TOKEN")
    token = os.environ.get(env_var, "")

    if not token:
        # Check local persistent vaults (including Universal Vault backend/vault.json)
        vault_paths = [
            os.path.join(os.path.dirname(__file__), "vault.json"),
            os.path.join(os.getcwd(), "backend", "vault.json"),
            os.path.join(os.getcwd(), "Nevea_Backup", "hybrid_vault.json"),
            os.path.join(os.getcwd(), "Nevea_Backup", "credentials.json"),
            os.path.join(os.path.dirname(__file__), "..", "Nevea_Backup", "hybrid_vault.json"),
            os.path.join(os.path.dirname(__file__), "..", "Nevea_Backup", "credentials.json"),
        ]
        for p in vault_paths:
            if os.path.isfile(p):
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        creds_dict = data.get("credentials", {}) if isinstance(data.get("credentials"), dict) else {}
                        custom_dict = data.get("custom_services", {}) if isinstance(data.get("custom_services"), dict) else {}
                        token = (
                            data.get(f"{plat}Token")
                            or data.get(f"{plat}_token")
                            or data.get(env_var)
                            or creds_dict.get(env_var)
                            or custom_dict.get(env_var)
                            or ""
                        )
                        if token:
                            break
                except Exception:
                    pass

    return token.strip()


# -----------------------------------------------------------------------------
# 2. REMOTE REST API INTERACTIONS (GitHub, GitLab, Codeberg)
# -----------------------------------------------------------------------------
def api_create_repo(
    platform: str,
    repo_name: str,
    private: bool = False,
    description: str = "NEVEA AI Autonomous Swarm Project"
) -> Dict[str, Any]:
    """
    Create a new remote repository via REST API.
    Handles authentication errors (401, 403), duplicate names (422), and connectivity issues.
    """
    plat = platform.lower().strip()
    token = get_platform_token(plat)
    clean_name = repo_name.split("/")[-1]

    if not token:
        return {
            "success": False,
            "error_type": "AUTH_MISSING",
            "error": f"Missing {plat.upper()}_TOKEN. Please add your personal access token in ModelHub -> Version Control or .env file."
        }

    # Setup platform-specific endpoints and headers
    if plat == "github":
        url = "https://api.github.com/user/repos"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "NEVEA-AI-Agent",
        }
        payload = {
            "name": clean_name,
            "private": private,
            "description": description,
            "auto_init": True,
        }
    elif plat == "gitlab":
        url = "https://gitlab.com/api/v4/projects"
        headers = {
            "PRIVATE-TOKEN": token,
            "User-Agent": "NEVEA-AI-Agent",
        }
        payload = {
            "name": clean_name,
            "visibility": "private" if private else "public",
            "description": description,
            "initialize_with_readme": True,
        }
    elif plat == "codeberg":
        url = "https://codeberg.org/api/v1/user/repos"
        headers = {
            "Authorization": f"token {token}",
            "User-Agent": "NEVEA-AI-Agent",
        }
        payload = {
            "name": clean_name,
            "private": private,
            "description": description,
            "auto_init": True,
        }
    elif plat in ["forgejo", "gitea"]:
        base = os.environ.get("FORGEJO_BASE_URL", "https://codeberg.org")
        url = f"{base}/api/v1/user/repos"
        headers = {
            "Authorization": f"token {token}",
            "User-Agent": "NEVEA-AI-Agent",
        }
        payload = {
            "name": clean_name,
            "private": private,
            "description": description,
            "auto_init": True,
        }
    else:
        return {
            "success": False,
            "error_type": "UNSUPPORTED_PLATFORM",
            "error": f"Unsupported Git hosting platform: {platform}. Supported: github, gitlab, codeberg, forgejo."
        }

    # Execute with requests library
    if requests is not None:
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=20)
            if resp.status_code in [200, 201]:
                data = resp.json()
                html_url = data.get("html_url") or data.get("web_url") or f"https://{plat}.com/{clean_name}"
                clone_url = data.get("clone_url") or data.get("http_url_to_repo") or f"{html_url}.git"
                return {
                    "success": True,
                    "platform": plat,
                    "repo_name": clean_name,
                    "html_url": html_url,
                    "clone_url": clone_url,
                    "status_code": resp.status_code,
                    "message": f"Successfully created repository '{clean_name}' on {plat.capitalize()}!"
                }
            elif resp.status_code == 401:
                return {
                    "success": False,
                    "error_type": "AUTH_INVALID",
                    "status_code": 401,
                    "error": f"Authentication failed on {plat.capitalize()}. Invalid or expired {plat.upper()}_TOKEN."
                }
            elif resp.status_code == 403:
                return {
                    "success": False,
                    "error_type": "AUTH_FORBIDDEN",
                    "status_code": 403,
                    "error": f"Access forbidden or rate limit exceeded on {plat.capitalize()}. Ensure token has 'repo' write scope."
                }
            elif resp.status_code == 422:
                return {
                    "success": False,
                    "error_type": "REPO_EXISTS",
                    "status_code": 422,
                    "error": f"Repository '{clean_name}' already exists on {plat.capitalize()}."
                }
            else:
                return {
                    "success": False,
                    "error_type": "API_ERROR",
                    "status_code": resp.status_code,
                    "error": f"API Error {resp.status_code}: {resp.text[:300]}"
                }
        except requests.exceptions.Timeout:
            return {"success": False, "error_type": "TIMEOUT", "error": f"Connection timed out contacting {plat.capitalize()} API."}
        except requests.exceptions.ConnectionError as ce:
            return {"success": False, "error_type": "NETWORK_ERROR", "error": f"Network error contacting {plat.capitalize()}: {ce}"}
        except Exception as e:
            return {"success": False, "error_type": "EXCEPTION", "error": str(e)}

    # Fallback to standard library urllib if requests is absent
    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data_bytes, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            html_url = data.get("html_url") or data.get("web_url") or f"https://{plat}.com/{clean_name}"
            clone_url = data.get("clone_url") or data.get("http_url_to_repo") or f"{html_url}.git"
            return {
                "success": True,
                "platform": plat,
                "repo_name": clean_name,
                "html_url": html_url,
                "clone_url": clone_url,
                "message": f"Successfully created repository '{clean_name}' on {plat.capitalize()}!"
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        err_type = "AUTH_INVALID" if e.code in [401, 403] else "API_ERROR"
        return {"success": False, "error_type": err_type, "status_code": e.code, "error": f"HTTP {e.code} ({plat}): {err_body[:250]}"}
    except Exception as e:
        return {"success": False, "error_type": "EXCEPTION", "error": str(e)}


# -----------------------------------------------------------------------------
# 3. LOCAL GIT CLI OPERATIONS (via subprocess)
# -----------------------------------------------------------------------------
def cli_git_command(args: list, cwd: Optional[str] = None, timeout: int = 45) -> Dict[str, Any]:
    """
    Execute a local git CLI command via subprocess with comprehensive error handling:
    - Missing Git binary in PATH
    - Command timeouts
    - Execution exit codes, stdout, and stderr
    """
    cmd = ["git"] + args
    working_dir = cwd or os.getcwd()

    try:
        proc = subprocess.run(
            cmd,
            cwd=working_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout
        )
        return {
            "success": proc.returncode == 0,
            "command": " ".join(cmd),
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
            "returncode": proc.returncode,
            "cwd": working_dir,
        }
    except FileNotFoundError:
        return {
            "success": False,
            "error_type": "GIT_NOT_INSTALLED",
            "error": "The 'git' executable was not found in system PATH. Please install Git from https://git-scm.com/.",
            "returncode": -1
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error_type": "TIMEOUT",
            "error": f"Git command 'git {' '.join(args)}' timed out after {timeout} seconds.",
            "returncode": -2
        }
    except Exception as e:
        return {
            "success": False,
            "error_type": "SUBPROCESS_ERROR",
            "error": str(e),
            "returncode": -3
        }


# -----------------------------------------------------------------------------
# 4. UNIFIED EXECUTE_GIT_ACTION ENTRYPOINT
# -----------------------------------------------------------------------------
def execute_git_action(
    action: str,
    platform: str = "github",
    repo_name: str = "",
    file_path: str = "",
    commit_message: str = "Update from NEVEA AI Swarm",
    content: str = "",
    local_path: Optional[str] = None,
    private: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Unified entrypoint for all remote API interactions and local git CLI operations.

    Actions:
    - 'create_repo' | 'create_remote_repo': Create remote repository via API
    - 'clone' | 'git_clone': Clone remote repository to local directory
    - 'commit' | 'git_commit': Stage files and commit locally
    - 'push' | 'git_push': Push commits to remote upstream
    - 'pull' | 'git_pull': Pull latest commits from remote upstream
    - 'status' | 'git_status': Check current branch and dirty working tree status
    - 'upload_file' | 'upload_file_to_repo': Write file content, stage, and commit
    - 'init' | 'git_init': Initialize a new local Git repository
    """
    act = action.lower().strip()
    plat = platform.lower().strip()

    # 1. Remote API Actions (GitHub, GitLab, Codeberg, Forgejo)
    if act in ["create_repo", "create_remote_repo"]:
        return api_create_repo(
            platform=plat,
            repo_name=repo_name,
            private=private,
            description=kwargs.get("description", "NEVEA AI Project")
        )

    # 2. Local Git Operations (subprocess)
    elif act in ["clone", "git_clone"]:
        target_dir = local_path or repo_name.split("/")[-1]
        token = get_platform_token(plat)
        url = repo_name

        if not url.startswith("http://") and not url.startswith("https://") and not url.startswith("git@"):
            domain = "codeberg.org" if plat == "codeberg" else ("gitlab.com" if plat == "gitlab" else "github.com")
            url = f"https://{domain}/{repo_name}.git"

        # Inject auth token into clone URL for private repositories
        if token and "@" not in url and url.startswith("https://"):
            url = url.replace("https://", f"https://oauth2:{token}@")

        res = cli_git_command(["clone", url, target_dir])
        res["action"] = "clone"
        res["target_dir"] = target_dir
        return res

    elif act in ["commit", "git_commit"]:
        # Stage target file or everything
        cli_git_command(["add", file_path or "."], cwd=local_path)
        res = cli_git_command(["commit", "-m", commit_message], cwd=local_path)
        res["action"] = "commit"
        res["commit_message"] = commit_message
        return res

    elif act in ["push", "git_push"]:
        # Try pushing main branch, fallback to current active branch
        res = cli_git_command(["push", "origin", "main"], cwd=local_path)
        if not res["success"]:
            res = cli_git_command(["push", "-u", "origin", "HEAD"], cwd=local_path)
        res["action"] = "push"
        return res

    elif act in ["pull", "git_pull"]:
        res = cli_git_command(["pull"], cwd=local_path)
        res["action"] = "pull"
        return res

    elif act in ["status", "git_status"]:
        res = cli_git_command(["status"], cwd=local_path)
        res["action"] = "status"
        return res

    elif act in ["init", "git_init"]:
        res = cli_git_command(["init"], cwd=local_path)
        res["action"] = "init"
        return res

    elif act in ["upload_file", "upload_file_to_repo"]:
        base_dir = local_path or os.getcwd()
        target_file = os.path.join(base_dir, file_path)
        os.makedirs(os.path.dirname(os.path.abspath(target_file)), exist_ok=True)
        try:
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            return {"success": False, "error_type": "IO_ERROR", "error": f"Failed to write file '{file_path}': {e}"}

        cli_git_command(["add", file_path], cwd=base_dir)
        commit_res = cli_git_command(["commit", "-m", commit_message], cwd=base_dir)
        return {
            "success": True,
            "action": "upload_file",
            "file": file_path,
            "commit": commit_res
        }

    else:
        return {
            "success": False,
            "error_type": "UNKNOWN_ACTION",
            "error": f"Unknown git action: '{action}'. Allowed: create_repo, clone, commit, push, pull, status, init, upload_file."
        }


# -----------------------------------------------------------------------------
# 5. CLI TESTING ENTRYPOINT
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    action_arg = sys.argv[1] if len(sys.argv) > 1 else "status"
    platform_arg = sys.argv[2] if len(sys.argv) > 2 else "github"
    repo_arg = sys.argv[3] if len(sys.argv) > 3 else "nevea-demo"
    output = execute_git_action(action=action_arg, platform=platform_arg, repo_name=repo_arg)
    print(json.dumps(output, indent=2))
