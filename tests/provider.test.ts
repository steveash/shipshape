import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadProfile, providerEnv } from '../src/core/config.js';

function tmp(): string {
  return mkdtempSync(join(tmpdir(), 'shipshape-provider-'));
}

describe('provider config', () => {
  it('defaults to anthropic with no env injection', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'p.yaml'), 'name: p\n');
    const profile = loadProfile(join(dir, 'p.yaml'));
    expect(profile.provider.type).toBe('anthropic');
    expect(providerEnv(profile.provider)).toEqual({});
  });

  it('maps bedrock settings to the Claude Code runtime env surface', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'p.yaml'),
      `name: p
provider:
  type: bedrock
  region: us-west-2
  baseUrl: https://gw.example.com
  regionPrefix: global
  serviceTier: priority
  env:
    AWS_PROFILE: team-bedrock
    ANTHROPIC_DEFAULT_SONNET_MODEL: us.anthropic.claude-sonnet-4-6
`,
    );
    const env = providerEnv(loadProfile(join(dir, 'p.yaml')).provider);
    expect(env).toEqual({
      CLAUDE_CODE_USE_BEDROCK: '1',
      AWS_REGION: 'us-west-2',
      ANTHROPIC_BEDROCK_BASE_URL: 'https://gw.example.com',
      ANTHROPIC_BEDROCK_REGION_PREFIX: 'global',
      ANTHROPIC_BEDROCK_SERVICE_TIER: 'priority',
      AWS_PROFILE: 'team-bedrock',
      ANTHROPIC_DEFAULT_SONNET_MODEL: 'us.anthropic.claude-sonnet-4-6',
    });
  });

  it('rejects in-namespace env keys that are code-execution vectors', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'p.yaml'),
      `name: p
provider:
  type: bedrock
  env:
    AWS_CONFIG_FILE: /tmp/evil-config
`,
    );
    expect(() => loadProfile(join(dir, 'p.yaml'))).toThrow(/must not set/);
  });

  it("a child provider block without 'type' keeps the parent's bedrock type", () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'base.yaml'),
      `name: base
provider:
  type: bedrock
  region: us-east-1
`,
    );
    writeFileSync(
      join(dir, 'child.yaml'),
      `name: child
extends: ./base.yaml
provider:
  env:
    ANTHROPIC_DEFAULT_HAIKU_MODEL: us.anthropic.claude-haiku-4-5-20251001-v1:0
`,
    );
    const p = loadProfile(join(dir, 'child.yaml'));
    expect(p.provider.type).toBe('bedrock');
    expect(providerEnv(p.provider).CLAUDE_CODE_USE_BEDROCK).toBe('1');
  });

  it('rejects env keys outside the provider namespaces', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'p.yaml'),
      `name: p
provider:
  type: bedrock
  env:
    PATH: /evil
`,
    );
    expect(() => loadProfile(join(dir, 'p.yaml'))).toThrow(/provider\.env keys/);
  });

  it('field-merges provider across extends (child wins, env unions)', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'base.yaml'),
      `name: base
provider:
  type: bedrock
  region: us-east-1
  env:
    AWS_PROFILE: base-profile
`,
    );
    writeFileSync(
      join(dir, 'child.yaml'),
      `name: child
extends: ./base.yaml
provider:
  type: bedrock
  region: eu-west-1
  env:
    ANTHROPIC_DEFAULT_HAIKU_MODEL: eu.anthropic.claude-haiku-4-5-20251001-v1:0
`,
    );
    const p = loadProfile(join(dir, 'child.yaml'));
    expect(p.provider.region).toBe('eu-west-1');
    expect(p.provider.env).toEqual({
      AWS_PROFILE: 'base-profile',
      ANTHROPIC_DEFAULT_HAIKU_MODEL: 'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
    });
  });

  it('ignores bedrock-only fields when type is anthropic', () => {
    const dir = tmp();
    writeFileSync(
      join(dir, 'p.yaml'),
      `name: p
provider:
  type: anthropic
  region: us-east-1
  env:
    ANTHROPIC_MODEL: claude-sonnet-4-6
`,
    );
    const env = providerEnv(loadProfile(join(dir, 'p.yaml')).provider);
    // Passthrough env still applies, but no bedrock switches are set.
    expect(env).toEqual({ ANTHROPIC_MODEL: 'claude-sonnet-4-6' });
  });
});
