/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />

import utils = require("../../utils");
import provider = require("./provider");
import shell = require("../../modules/coreplayer-shared-module/shell");
import right = require("../../modules/wellcomeplayer-moreinforightpanel-module/moreInfoRightPanel");
import conditions = require("../../modules/wellcomeplayer-moreinforightpanel-module/conditionsDialogue");
import coreApp = require("../coreplayer-seadragon-extension/app");

export class App extends coreApp.App {

    $conditionsDialogue: JQuery;
    conditionsDialogue: conditions.ConditionsDialogue;

    constructor(provider: provider.Provider) {
        super(provider);
    }

    create(): void {
        super.create();

        shell.Shell.$rightPanel.empty();
        this.rightPanel = new right.MoreInfoRightPanel(shell.Shell.$rightPanel);

        this.$conditionsDialogue = utils.Utils.createDiv('overlay conditions');
        shell.Shell.$overlays.append(this.$conditionsDialogue);
        this.conditionsDialogue = new conditions.ConditionsDialogue(this.$conditionsDialogue);
    }

}
