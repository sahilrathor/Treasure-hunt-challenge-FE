import { describe, it, expect } from 'vitest';
import { generateTeamCode } from '@/features/admin/AdminPage';

describe('generateTeamCode', () => {
  it('converts team name to lowercase and replaces spaces with underscores', () => {
    expect(generateTeamCode('Code Crusaders')).toBe('code_crusaders');
    expect(generateTeamCode('Cyber Knights')).toBe('cyber_knights');
    expect(generateTeamCode('Alpha Team One')).toBe('alpha_team_one');
  });

  it('handles multiple consecutive spaces and mixed casing', () => {
    expect(generateTeamCode('TECH   TITANS')).toBe('tech_titans');
    expect(generateTeamCode('Delta   Force   X')).toBe('delta_force_x');
  });

  it('handles single word team names', () => {
    expect(generateTeamCode('Invincible')).toBe('invincible');
    expect(generateTeamCode('PHOENIX')).toBe('phoenix');
  });
});
