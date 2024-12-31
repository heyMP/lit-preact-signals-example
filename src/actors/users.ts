import { signal, computed } from '@preact/signals';
import { fetchWrapper } from '../lib/fetchWrapper.js';
import { UserActor } from './user.js';
import { User } from '../types.js';

export const States = ['initial', 'updating', 'complete', 'error'] as const;

export type State = typeof States[number];

export class UsersActor {
  value = signal<UserActor[]>([])
  state = signal<State>('initial');
  error = signal<Error>();

  childStates = computed(() => {
    return this.value.value.reduce((acc, curr) => {
      acc.add(curr.state.value);
      return acc;
    }, new Set<UserActor['state']['value']>());
  });

  async update() {
    this.state.value = 'updating';
    const { data, error } = await fetchWrapper<User[]>({ url: 'https://example.com/users' });
    if (error) {
      this.state.value = 'error';
    } else {
      this.value.value = data.map(user => {
        const existing = this.value.value.find(actor => actor.value.value.id === user.id);
        if (existing) {
          existing.value.value = user;
          return existing;
        }
        return new UserActor(user);
      }).filter(i => !!i);
      this.state.value = 'complete';
    }
  }
}
