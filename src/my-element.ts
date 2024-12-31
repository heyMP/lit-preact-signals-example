import { SignalWatcher } from '@lit-labs/preact-signals';
import { signal } from '@preact/signals';
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
import { createRef, ref } from 'lit/directives/ref.js';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { match, P } from 'ts-pattern';
import { UsersActor } from './actors/users.js';
import { initMocks } from './mocks/init.js';
import './elements/my-params-form.js';
import './elements/my-user.js';
import { UserActor } from './actors/user.js';
import { MyUser } from './elements/my-user.js';

await initMocks();

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('my-element')
export class MyElement extends SignalWatcher(LitElement) {
  users = new UsersActor();

  searchFilter = signal<string>('');

  letterFilter = signal<string>('');

  statusFilter = signal<boolean | 'error' | 'all'>('all');

  viewTransitionsStyleSheet = new CSSStyleSheet();

  private formRef = createRef<HTMLFormElement>();

  private myUserRef = createRef<MyUser>();

  private viewTransition?: ViewTransition;

  connectedCallback(): void {
    super.connectedCallback();
    this.users.update();
    this.users.value.subscribe(() => {
      this._updateViewTranstitionsStyleSheet();
    });

    // attach view Transitions to root host
    const root = this.getRootNode() as Document;
    if (root) {
      root.adoptedStyleSheets.push(this.viewTransitionsStyleSheet);
    }
  }

  private _updateViewTranstitionsStyleSheet() {
    const styles = this.users.value.value
      .map(i => `
        my-element::part(user-${i.value.value.id}) { view-transition-name: user-${i.value.value.id};}
      `)
      .join('');
    this.viewTransitionsStyleSheet.replaceSync(styles);
  }

  performUpdate() {
    this.viewTransition?.skipTransition();
    if (!document.startViewTransition) {
      super.performUpdate();
      return;
    }
    this.viewTransition = document.startViewTransition(() => {
      super.performUpdate();
    });
  }

  render() {
    const content = match(this.users.state.value)
      .with('initial', () => this.renderLoadingState())
      .with('updating', () => this.renderDefaultState())
      .with('complete', () => this.renderDefaultState())
      .with('error', () => this.renderErrorState())
      .exhaustive();

    return html`
      <div part="base">
        <my-params-form part"my-params-form"></my-params-form>
        ${this.renderUserListForm()}
        <div class="user-list">
          <div>Service State: ${this.renderState()}</div>
          <div>Service Children State: ${this.renderChildStatus()}</div>
          <button @click=${() => this.refresh()}>refresh</button>
          ${content}
        </div>
      </div>
    `;
  }

  /**
   * Refresh the user list
   */
  public refresh() {
    this.users.update();
  }

  renderLoadingState() {
    return html`fetching users...`;
  }

  renderDefaultState() {
    const users = this.getFilteredUserList() ?? [];

    users.sort((a, b) => {
      return (a.value.value?.isActive === b.value.value?.isActive) ? 0 : a.value.value?.isActive ? -1 : 1;
    });

    return html`
      <button @click=${() => this.refresh()}>refresh</button>
      <div>(${users.length})</div>
      <ul part="list">
        ${repeat(users, (i) => i, (i) => this.renderUserListItem(i))}
      </ul>
    `;
  }

  renderErrorState() {
    return html`oops there was an error 🫠`;
  }

  renderUserListItem(user: UserActor) {
    const id = user.value.value.id;
    return html`<li part="user-${id}" ${live}>
      <my-user
        .user=${user}
        ${ref(this.myUserRef)}
        exportparts="icon, activity-button"
      >
      </my-user>
    </li>`;
  }

  renderState() {
    return match(this.users.state.value)
      .with('error', () => html`🚨`)
      .with('complete', () => html`✅`)
      .otherwise(() => html`✨`)
  }

  renderChildStatus() {
    return match(this.users.childStates.value)
      .with(P.when(set => set.size === 0), () => html`🔌`)
      .with(P.when(set => set.has('error')), () => html`🚨`)
      .with(P.when(set =>
        (set.size === 1 || set.size === 2) &&
        Array.from(set).every(value => value === 'complete' || value === 'initial')
      ), () => html`✅`)
      .otherwise(() => html`✨`)
  }

  renderUserListForm() {
    return html`
      <details>
        <summary>Filter</summary>
        <form @input=${this.formUpdated} ${ref(this.formRef)}>
          <details open>
            <summary>Search filter</summary
            <label for="search-filter" name="search-filter">Filter</label>
            <input id="search-filter" name="search-filter" type="text" .value=${this.searchFilter.value}>
          </details>
          <details open>
            <summary for="letter-filter">Filter by starting letter of last name</summary>
            <input id="letter-filter-none" type="radio" value="" name="letter-filter" checked>
              <label for="letter-filter-none">none</label>
            </input>
            ${'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => html`
              <input id="letter-filter-${letter}" type="radio" value=${letter} name="letter-filter">
                <label for="letter-filter-${letter}">${letter}</label>
              </input>
            `)}
          </details>
          <details open>
            <summary for="status-filter">Filter by user status</summary>
            <input id="status-filter-all" type="radio" value="all" name="status-filter" checked>
              <label for="status-filter-all">All</label>
            </input>
            <input id="status-filter-active" type="radio" value="true" name="status-filter">
              <label for="status-filter-active">Active</label>
            </input>
            <input id="status-filter-inactive" type="radio" value="false" name="status-filter">
              <label for="status-filter-inactive">Inactive</label>
            </input>
            <input id="status-filter-error" type="radio" value="error" name="status-filter">
              <label for="status-filter-error">Error</label>
            </input>
          </details>
        </form>
      </details>
    `;
  }

  formUpdated(e: Event) {
    e.preventDefault();

    if (!this.formRef.value) { return; }

    const formData = new FormData(this.formRef.value);

    this.letterFilter.value = formData.get('letter-filter') as typeof this.letterFilter.value;
    this.searchFilter.value = formData.get('search-filter') as typeof this.searchFilter.value;
    this.statusFilter.value = formData.get('status-filter') as typeof this.statusFilter.value;
  }

  getFilteredUserList() {
    const letter = this.letterFilter.value.toLowerCase();
    const search = this.searchFilter.value.toLowerCase();
    const status = this.statusFilter.value;

    return this.users.value.value?.filter(user => {
      if (!user.value.value?.lastName.toLowerCase().startsWith(letter)) {
        return false;
      }

      if (!user.value.value?.lastName.toLowerCase().startsWith(letter)) {
        return false;
      }

      if (!`${user.value.value?.firstName}${user.value.value?.lastName}`.toLowerCase().includes(search)) {
        return false;
      }

      if (status !== "all") {
        const userStatus = user.state.value === 'error' ? 'error' : user.value.value?.isActive.toString();
        if (status !== userStatus) {
          return false;
        }
      }

      return true;
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement
  }
}
