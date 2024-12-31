import { SignalWatcher } from '@lit-labs/preact-signals';
import { LitElement, html, nothing, css } from 'lit'
import { customElement } from 'lit/decorators.js'
import { match, P } from 'ts-pattern';
import { UserActor } from '../actors/user.js';
import styles from './my-user.css?raw';

const styleSheet = new CSSStyleSheet();
styleSheet.replaceSync(styles);

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('my-user')
export class MyUser extends SignalWatcher(LitElement) {
  static styles = styleSheet;

  user?: UserActor;

  render() {
    const name = `${this.user?.value.value?.firstName} ${this.user?.value.value?.lastName}`;
    const ariaLabel = this.user?.value.value?.isActive ? 'Activate user' : 'Deactivate user';

    return html`
      <button
        part="activity-button"
        aria-label=${ariaLabel}
        @click=${() => this.userClicked()}
        ?disabled=${this.isDisabled()}>
          ${name}
          <span part="icon" class="${this.renderIsIcon()}">
            ${this.renderIsIcon()}
          </span>
      </button>
    `;
  }

  renderIsIcon() {
    const state = this.user?.state.value;
    const isActive = this.user?.value.value?.isActive;
    return match([state, isActive])
      .with(['error', P._], () => '🚨')
      .with(['deactivating', P._], () => '✨')
      .with(['activating', P._], () => '✨')
      .with([P._, true], () => '😎')
      .with([P._, false], () => '😴')
      .otherwise(() => '🔌');
  }

  userClicked() {
    this.user?.toggleActivation();
  }

  isDisabled() {
    return match(this.user?.state)
      .with('activating', () => true)
      .with('deactivating', () => true)
      .with('updating', () => true)
      .otherwise(() => false)
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-user': MyUser
  }
}
