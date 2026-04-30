'use strict';

const https = require('https');
const { execSync } = require('child_process');

// Parse any GitHub repo format into { owner, repo, full }
function parseGithubRepo(input) {
  const cleaned = input.trim()
    .replace(/\.git$/, '')
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^git@github\.com:/, '');

  const parts = cleaned.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], repo: parts[1], full: `${parts[0]}/${parts[1]}` };
}

// Check if a GitHub repo exists and whether the token has push access
function checkGithubAccess(owner, repo, token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CreateAppAgents/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const req = https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({
              exists: true,
              canPush: json.permissions?.push === true || json.permissions?.admin === true,
              private: json.private,
            });
          } catch {
            resolve({ exists: true, canPush: false });
          }
        } else if (res.statusCode === 404) {
          resolve({ exists: false, canPush: false });
        } else if (res.statusCode === 401) {
          resolve({ exists: null, canPush: false, authError: true, status: 401 });
        } else if (res.statusCode === 403) {
          resolve({ exists: null, canPush: false, authError: true, status: 403 });
        } else {
          resolve({ exists: null, canPush: false, status: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ exists: null, canPush: false, networkError: err.message });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ exists: null, canPush: false, networkError: 'timeout' });
    });
  });
}

// Create a new GitHub repo under the authenticated user
function createGithubRepo(repoName, token, isPrivate = true) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ name: repoName, private: isPrivate, auto_init: false });
    const options = {
      hostname: 'api.github.com',
      path: '/user/repos',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'CreateAppAgents/1.0',
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          try {
            const json = JSON.parse(data);
            reject(new Error(json.message || `HTTP ${res.statusCode}`));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Shared git setup: init, identity, branch, remote
function _gitSetup(run, remoteUrl) {
  try { run('git rev-parse --git-dir'); } catch { run('git init'); }
  try { run('git config user.email'); } catch { run('git config user.email "agents@createapp.ai"'); }
  try { run('git config user.name');  } catch { run('git config user.name "CreateApp Agents"'); }
  try { run('git branch -M main'); } catch { /* already named */ }
  try { run('git remote add origin ' + remoteUrl); }
  catch { run('git remote set-url origin ' + remoteUrl); }
}

// Push a checkpoint after a layer completes — non-fatal, returns { success, error }
function pushCheckpoint(outputDir, owner, repo, token, layerLabel) {
  try {
    const remoteUrl = `https://${token}@github.com/${owner}/${repo}.git`;
    const run = (cmd) => execSync(cmd, { cwd: outputDir, stdio: 'pipe' }).toString().trim();

    _gitSetup(run, remoteUrl);
    run('git add -A');

    // Skip commit if working tree is clean
    const status = run('git status --porcelain');
    if (status) {
      run(`git commit -m "Checkpoint: ${layerLabel}"`);
    }

    run('git push -u origin main --force');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Push the final generated code from outputDir to GitHub — throws on failure
function pushToGithub(outputDir, owner, repo, token) {
  const remoteUrl = `https://${token}@github.com/${owner}/${repo}.git`;
  const run = (cmd) => execSync(cmd, { cwd: outputDir, stdio: 'pipe' }).toString().trim();

  _gitSetup(run, remoteUrl);
  run('git add -A');

  try { run('git commit -m "Build complete — generated by CreateApp Agents"'); } catch { /* nothing new */ }

  run('git push -u origin main --force');
}

module.exports = { parseGithubRepo, checkGithubAccess, createGithubRepo, pushCheckpoint, pushToGithub };
