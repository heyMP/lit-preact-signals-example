// import { State, SignalUpdatedEvent } from '@heymp/signals';
import { signal, Signal } from '@preact/signals';
import { User } from '../types.js';
import { fetchWrapper } from '../lib/fetchWrapper.js';

export const States = ['initial', 'updating', 'activating', 'deactivating', 'complete', 'error'] as const;

export type State = typeof States[number];

export class UserActor {
  state = signal<State>('initial');
  error = signal<Error>();
  value: Signal<User>;

  constructor(user: User) {
    this.value = signal(user);
  }

  async activate() {
    this.state.value = 'activating';
    const { data, error } = await fetchWrapper<User>({
      url: `https://example.com/users/${this.value.value?.id}/activate`,
      options: { method: 'POST' }
    });

    if (error) {
      this.state.value = 'error';
      this.error.value = error;
      return { error };
    } else {
      if (this.value.value) {
        this.value.value = data;
      }
      this.state.value = 'complete';
    }
    return { data };
  }

  async deactivate() {
    this.state.value = 'deactivating';
    const { data, error } = await fetchWrapper<User>({
      url: `https://example.com/users/${this.value.value?.id}/deactivate`,
      options: { method: 'POST' }
    });

    if (error) {
      this.state.value = 'error';
      this.error.value = error;
      return { error };
    } else {
      if (this.value.value) {
        this.value.value = data;
      }
      this.state.value = 'complete';
    }
  }

  async toggleActivation() {
    if (this.value.value.isActive) {
      return this.deactivate();
    }
    return this.activate();
  }
}
