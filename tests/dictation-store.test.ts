import { describe, it, expect, beforeEach } from 'vitest';
import { useDictationStore } from '../src/renderer/dictation/store';

const store = () => useDictationStore.getState();

describe('dictation store', () => {
  beforeEach(() => store().reset());

  it('starts idle and clear', () => {
    expect(store().state).toBe('idle');
    expect(store().finals).toBe('');
    expect(store().interim).toBe('');
  });

  it('accumulates finals with spaces and clears interim', () => {
    store().setInterim('hello wor');
    store().addFinal('hello world');
    expect(store().finals).toBe('hello world');
    expect(store().interim).toBe('');
    store().addFinal('this is dictation');
    expect(store().finals).toBe('hello world this is dictation');
  });

  it('streams cleaned text by appending deltas', () => {
    store().appendCleaned('Hello ');
    store().appendCleaned('world.');
    expect(store().cleaned).toBe('Hello world.');
  });

  it('setError moves to error state with a message', () => {
    store().setError('mic denied');
    expect(store().state).toBe('error');
    expect(store().error).toBe('mic denied');
  });

  it('reset clears everything back to idle', () => {
    store().setState('listening');
    store().addFinal('something');
    store().appendCleaned('cleaned');
    store().reset();
    expect(store()).toMatchObject({ state: 'idle', finals: '', cleaned: '', interim: '', error: '' });
  });
});
