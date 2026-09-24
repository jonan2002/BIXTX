import UIAbility from '@ohos.app.ability.UIAbility';
import hilog from '@ohos.hilog';
import window from '@ohos.window';
import Want from '@ohos.app.ability.Want';
import AbilityConstant from '@ohos.app.ability.AbilityConstant';
import common from '@ohos.app.ability.common';

export default class EntryAbility extends UIAbility {
  onCreate(_want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(0x0000, 'bixtx', '%{public}s', 'Agent starting...');
    // Start background service for persistent C2 connection
    const want: Want = {
      bundleName: 'ai.bixtx.agent',
      abilityName: 'BixtxBackgroundService',
    };
    (this.context as common.UIAbilityContext).startServiceExtensionAbility(want);
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(0x0000, 'bixtx', 'Failed to load page: %{public}s', JSON.stringify(err));
      }
    });
  }

  onDestroy(): void {
    hilog.info(0x0000, 'bixtx', 'Agent stopping');
  }
}
