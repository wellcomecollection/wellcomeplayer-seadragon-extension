/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />

import coreApp = require("../coreplayer-seadragon-extension/app");
import utils = require("../../utils");
import wellcomeProvider = require("./provider");
import shell = require("../../modules/coreplayer-shared-module/shell");
import right = require("../../modules/wellcomeplayer-moreinforightpanel-module/moreInfoRightPanel");
import conditions = require("../../modules/wellcomeplayer-moreinforightpanel-module/conditionsDialogue");
import footer = require("../../modules/wellcomeplayer-footerpanel-module/footerPanel");

export class App extends coreApp.App {

    $conditionsDialogue: JQuery;
    conditionsDialogue: conditions.ConditionsDialogue;

    searchResults: any;

    static SEARCH_RESULTS: string = 'onSearchResults';
    static SEARCH_RESULTS_EMPTY: string = 'onSearchResults';

    constructor(provider: wellcomeProvider.Provider) {
        super(provider);
    }

    create(): void {
        super.create();

        $.subscribe(footer.FooterPanel.VIEW_PAGE, (e, index: number) => {
            this.viewPage(index);
        });

        $.subscribe(footer.FooterPanel.SEARCH, (e, terms: string) => {
            this.search(terms);
        });

        $.subscribe(footer.FooterPanel.NEXT_SEARCH_RESULT, () => {
            this.nextSearchResult();
        });

        $.subscribe(footer.FooterPanel.PREV_SEARCH_RESULT, () => {
            this.prevSearchResult();
        });

        shell.Shell.$rightPanel.empty();
        this.rightPanel = new right.MoreInfoRightPanel(shell.Shell.$rightPanel);

        shell.Shell.$footerPanel.empty();
        this.footerPanel = new footer.FooterPanel(shell.Shell.$footerPanel);

        this.$conditionsDialogue = utils.Utils.createDiv('overlay conditions');
        shell.Shell.$overlays.append(this.$conditionsDialogue);
        this.conditionsDialogue = new conditions.ConditionsDialogue(this.$conditionsDialogue);
    }

    search(terms) {

        var searchUri = (<wellcomeProvider.Provider>this.provider).getSearchUri(terms);

        var that = this;

        $.getJSON(searchUri, (results) => {
            if (results.length) {
                that.searchResults = results;

                $.publish(App.SEARCH_RESULTS, [terms, results]);

                // reload current index as it may contain results.
                that.viewPage(that.currentAssetIndex);
            } else {
                that.showDialogue(that.provider.config.modules.genericDialogue.content.noMatches, () => {
                    $.publish(App.SEARCH_RESULTS_EMPTY);
                });
            }
        });
    }

    clearSearch() {
        this.searchResults = null;

        // reload current index as it may contain results.
        this.viewPage(this.currentAssetIndex);
    }

    prevSearchResult() {

        // get the first result with an index less than the current index.
        for (var i = this.searchResults.length - 1; i >= 0; i--) {
            var result = this.searchResults[i];

            if (result.index < this.currentAssetIndex) {
                this.viewPage(result.index);
                break;
            }
        }
    }

    nextSearchResult() {

        // get the first result with an index greater than the current index.
        for (var i = 0; i < this.searchResults.length; i++) {
            var result = this.searchResults[i];

            if (result.index > this.currentAssetIndex) {
                this.viewPage(result.index);
                break;
            }
        }
    }

    hasPermissionToViewCurrentItem(): boolean{
        return this.isAuthorised(this.currentAssetIndex);
    }

    isAuthorised(index): boolean {

        var section = this.getSectionByAssetIndex(index);

        if (section.extensions.authStatus.toLowerCase() == "allowed") {
            return true;
        }

        return false;
    }
}
