'use strict';

const nock = require('nock');
const { parseGithubRepo, checkGithubAccess, createGithubRepo, pushCheckpoint, pushToGithub } = require('../../src/github');

afterEach(() => {
  nock.cleanAll();
});

// ── parseGithubRepo ──────────────────────────────────────────────────────────
describe('parseGithubRepo', () => {
  test('parses owner/repo shorthand', () => {
    const result = parseGithubRepo('myuser/myrepo');
    expect(result).toEqual({ owner: 'myuser', repo: 'myrepo', full: 'myuser/myrepo' });
  });

  test('parses full HTTPS URL', () => {
    const result = parseGithubRepo('https://github.com/myuser/myrepo');
    expect(result).toEqual({ owner: 'myuser', repo: 'myrepo', full: 'myuser/myrepo' });
  });

  test('parses SSH URL', () => {
    const result = parseGithubRepo('git@github.com:myuser/myrepo.git');
    expect(result).toEqual({ owner: 'myuser', repo: 'myrepo', full: 'myuser/myrepo' });
  });

  test('strips .git suffix', () => {
    const result = parseGithubRepo('myuser/myrepo.git');
    expect(result).toEqual({ owner: 'myuser', repo: 'myrepo', full: 'myuser/myrepo' });
  });

  test('returns null for invalid input', () => {
    expect(parseGithubRepo('notarepo')).toBeNull();
    expect(parseGithubRepo('')).toBeNull();
    expect(parseGithubRepo('a/b/c')).toBeNull();
  });

  test('trims whitespace', () => {
    const result = parseGithubRepo('  myuser/myrepo  ');
    expect(result).toEqual({ owner: 'myuser', repo: 'myrepo', full: 'myuser/myrepo' });
  });
});

// ── checkGithubAccess ────────────────────────────────────────────────────────
describe('checkGithubAccess', () => {
  test('returns exists=true and canPush=true when repo is accessible with push', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .reply(200, { private: false, permissions: { push: true, admin: false } });

    const result = await checkGithubAccess('myuser', 'myrepo', 'test-token');
    expect(result.exists).toBe(true);
    expect(result.canPush).toBe(true);
  });

  test('returns canPush=true when admin permission is set', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .reply(200, { private: true, permissions: { push: false, admin: true } });

    const result = await checkGithubAccess('myuser', 'myrepo', 'test-token');
    expect(result.canPush).toBe(true);
  });

  test('returns canPush=false when only read access', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .reply(200, { private: false, permissions: { push: false, admin: false } });

    const result = await checkGithubAccess('myuser', 'myrepo', 'test-token');
    expect(result.exists).toBe(true);
    expect(result.canPush).toBe(false);
  });

  test('returns exists=false on 404', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/missing')
      .reply(404, { message: 'Not Found' });

    const result = await checkGithubAccess('myuser', 'missing', 'test-token');
    expect(result.exists).toBe(false);
    expect(result.canPush).toBe(false);
  });

  test('returns authError=true on 401', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .reply(401, { message: 'Bad credentials' });

    const result = await checkGithubAccess('myuser', 'myrepo', 'bad-token');
    expect(result.authError).toBe(true);
    expect(result.status).toBe(401);
  });

  test('returns authError=true on 403', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .reply(403, { message: 'Forbidden' });

    const result = await checkGithubAccess('myuser', 'myrepo', 'test-token');
    expect(result.authError).toBe(true);
    expect(result.status).toBe(403);
  });

  test('returns networkError on connection failure', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .replyWithError('connection refused');

    const result = await checkGithubAccess('myuser', 'myrepo', 'test-token');
    expect(result.networkError).toBeDefined();
    expect(result.canPush).toBe(false);
  });
});

// ── createGithubRepo ─────────────────────────────────────────────────────────
describe('createGithubRepo', () => {
  test('resolves with repo data on 201', async () => {
    const mockRepo = { id: 123, name: 'newrepo', full_name: 'myuser/newrepo', html_url: 'https://github.com/myuser/newrepo' };
    nock('https://api.github.com')
      .post('/user/repos')
      .reply(201, mockRepo);

    const result = await createGithubRepo('newrepo', 'test-token', true);
    expect(result.name).toBe('newrepo');
    expect(result.full_name).toBe('myuser/newrepo');
  });

  test('rejects with error message on 422 (repo already exists)', async () => {
    nock('https://api.github.com')
      .post('/user/repos')
      .reply(422, { message: 'Repository creation failed: name already exists' });

    await expect(createGithubRepo('existing-repo', 'test-token', true))
      .rejects.toThrow('Repository creation failed: name already exists');
  });

  test('rejects on 401 authentication error', async () => {
    nock('https://api.github.com')
      .post('/user/repos')
      .reply(401, { message: 'Bad credentials' });

    await expect(createGithubRepo('newrepo', 'bad-token', true))
      .rejects.toThrow('Bad credentials');
  });

  test('sends correct payload for private repo', async () => {
    let capturedBody;
    nock('https://api.github.com')
      .post('/user/repos', (body) => { capturedBody = body; return true; })
      .reply(201, { name: 'myrepo' });

    await createGithubRepo('myrepo', 'test-token', true);
    expect(capturedBody.private).toBe(true);
    expect(capturedBody.auto_init).toBe(false);
    expect(capturedBody.name).toBe('myrepo');
  });

  test('rejects on network error', async () => {
    nock('https://api.github.com')
      .post('/user/repos')
      .replyWithError('ECONNREFUSED');

    await expect(createGithubRepo('newrepo', 'test-token', true))
      .rejects.toThrow();
  });
});

// ── checkGithubAccess edge cases ─────────────────────────────────────────────
describe('checkGithubAccess edge cases', () => {
  test('returns exists=true canPush=false when 200 body is malformed JSON', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .reply(200, 'not-json-at-all');

    const result = await checkGithubAccess('myuser', 'myrepo', 'test-token');
    expect(result.exists).toBe(true);
    expect(result.canPush).toBe(false);
  });

  test('returns status code on unexpected HTTP status', async () => {
    nock('https://api.github.com')
      .get('/repos/myuser/myrepo')
      .reply(503, 'Service Unavailable');

    const result = await checkGithubAccess('myuser', 'myrepo', 'test-token');
    expect(result.status).toBe(503);
    expect(result.canPush).toBe(false);
  });
});

// ── pushCheckpoint ───────────────────────────────────────────────────────────
describe('pushCheckpoint', () => {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');

  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-push-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns success=false gracefully when git is not initialized', () => {
    // tmpDir has no git repo, push will fail — must not throw
    const result = pushCheckpoint(tmpDir, 'myuser', 'myrepo', 'bad-token', 'Layer 1');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('returns success=false gracefully when remote is unreachable', () => {
    try {
      execSync('git init', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'pipe' });
      fs.writeFileSync(path.join(tmpDir, 'file.txt'), 'content');
      execSync('git add -A && git commit -m "init"', { cwd: tmpDir, stdio: 'pipe' });
    } catch { /* ignore setup errors */ }

    // Push to non-existent remote — must return { success: false } not throw
    const result = pushCheckpoint(tmpDir, 'no-such-user', 'no-such-repo', 'bad-token', 'Layer 1');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
