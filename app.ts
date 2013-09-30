/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />

import baseApp = require("../../modules/coreplayer-shared-module/baseApp");
import coreApp = require("../coreplayer-seadragon-extension/app");
import utils = require("../../utils");
import baseProvider = require("../../modules/coreplayer-shared-module/baseProvider");
import provider = require("./provider");
import shell = require("../../modules/coreplayer-shared-module/shell");
import right = require("../../modules/wellcomeplayer-moreinforightpanel-module/moreInfoRightPanel");
import footer = require("../../modules/wellcomeplayer-footerpanel-module/footerPanel");
import login = require("../../modules/wellcomeplayer-dialogues-module/loginDialogue");
import restrictedFile = require("../../modules/wellcomeplayer-dialogues-module/restrictedFileDialogue");
import conditions = require("../../modules/wellcomeplayer-dialogues-module/conditionsDialogue");

export class App extends coreApp.App {


    $conditionsDialogue: JQuery;
    conditionsDialogue: conditions.ConditionsDialogue;
    $loginDialogue: JQuery;
    loginDialogue: login.LoginDialogue;

    searchResults: any;

    static SEARCH_RESULTS: string = 'onSearchResults';
    static SEARCH_RESULTS_EMPTY: string = 'onSearchResults';
    static RELOAD: string = 'onReload';

    constructor(provider: provider.Provider) {
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

        $.subscribe(login.LoginDialogue.LOGIN, (e, params: any) => {
            this.login(params);
        });

        shell.Shell.$rightPanel.empty();
        this.rightPanel = new right.MoreInfoRightPanel(shell.Shell.$rightPanel);

        shell.Shell.$footerPanel.empty();
        this.footerPanel = new footer.FooterPanel(shell.Shell.$footerPanel);

        this.$conditionsDialogue = utils.Utils.createDiv('overlay conditions');
        shell.Shell.$overlays.append(this.$conditionsDialogue);
        this.conditionsDialogue = new conditions.ConditionsDialogue(this.$conditionsDialogue);

        this.$loginDialogue = utils.Utils.createDiv('overlay login');
        shell.Shell.$overlays.append(this.$loginDialogue);
        this.loginDialogue = new login.LoginDialogue(this.$loginDialogue);
    }

    search(terms) {

        var searchUri = (<provider.Provider>this.provider).getSearchUri(terms);

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

    viewPage(assetIndex: number){

        // authorise.
        this.viewIndex(assetIndex, () => {
            
            // successfully authorised. prefetch asset.
            this.prefetchAsset(assetIndex, () => {

                // successfully prefetched.

                var asset = this.provider.assetSequence.assets[assetIndex];

                var dziUri = (<provider.Provider>this.provider).getDziUri(asset);

                $.publish(App.OPEN_DZI, [dziUri]);

                this.setParam(baseProvider.params.assetIndex, assetIndex);
            });
            
        });
        
    }

    // ensures that a file is in the server cache.
    prefetchAsset(assetIndex: number, successCallback: any): void{
        var asset = this.getAssetByIndex(assetIndex);

        var prefetchUri = (<provider.Provider>this.provider).getPrefetchUri(asset);

        $.getJSON(prefetchUri, function (result) {
            if (result.Success) {
                successCallback(asset.fileUri);
            } else {
                console.log(result.Message);
            }
        });
    }

    viewIndex(assetIndex: number, successCallback?: any): void {
        // authorise.
        this.authorise(assetIndex,
            // success callback
            (reload: boolean) => {
                if (reload) {
                    // reload the package.
                    (<baseProvider.BaseProvider>this.provider).reload(() => {
                        $.publish(App.RELOAD);
                        this.viewIndex(assetIndex, successCallback);
                    });
                } else {
                    
                    this.currentAssetIndex = assetIndex;
                    $.publish(baseApp.BaseApp.ASSET_INDEX_CHANGED, [assetIndex]);

                    if (successCallback) {
                        successCallback(assetIndex);
                    }
                }
            },
            // failure callback.
            (message: string, retry: boolean) => {
                this.showDialogue(message, () => {
                    if (retry) {
                        this.viewIndex(assetIndex, successCallback);
                    }
                });
            }
        );
    }

    authorise(assetIndex: number, successCallback: any, failureCallback: any): void {

        var section = this.getSectionByAssetIndex(assetIndex);

        switch (section.extensions.authStatus.toLowerCase()) {
            case 'allowed':
                successCallback(false);
                break;
            case 'denied':
                if (this.isLoggedIn()) { // inadequate permissions
                    // if it's a restricted file, there are no login
                    // credentials to view it, so show restricted file dialogue.
                    if (section.extensions.accessCondition.toLowerCase() === "restricted files") {
                        this.showRestrictedFileDialogue({
                            requestedIndex: assetIndex,
                            allowClose: this.allowCloseLogin()
                        });
                    } else {
                        this.showLoginDialogue({
                            successCallback: successCallback,
                            failureCallback: failureCallback,
                            inadequatePermissions: true,
                            requestedIndex: assetIndex,
                            allowClose: this.allowCloseLogin(),
                            message: this.getInadequatePermissionsMessage(assetIndex)
                        });
                    }
                } else {
                    this.showLoginDialogue({
                        successCallback: successCallback,
                        failureCallback: failureCallback,
                        requestedIndex: assetIndex,
                        allowClose: this.allowCloseLogin()
                    });
                }
                break;
            case 'expired':
                this.showLoginDialogue({
                    successCallback: successCallback,
                    failureCallback: failureCallback,
                    message: this.provider.config.modules.loginDialogue.loginExpiredMessage,
                    requestedIndex: assetIndex,
                    allowClose: this.allowCloseLogin()
                });
                break;
            case 'notacceptedtermsyet':
                this.showDialogue(this.provider.config.modules.genericDialogue.content.notAcceptedTermsYetMessage);
                break;
        }
    }

    login(params: any) {
        var ajaxOptions = {
            url: (<provider.Provider>this.provider).getLoginUri(params.username, params.password),
            type: "GET",
            dataType: "json",
            xhrFields: { withCredentials: true },
            // success callback
            success: (result: any) => {
                
                $.publish(login.LoginDialogue.HIDE_LOGIN_DIALOGUE);

                if (result.Message.toLowerCase() == "success") {
                    this.triggerSocket(login.LoginDialogue.LOGIN, result.DisplayNameBase64);
                    params.successCallback(true);
                } else {
                    params.failureCallback(result.Message, true);
                }
            },
            // error callback
            error: (result: any) => {
                 $.publish(login.LoginDialogue.HIDE_LOGIN_DIALOGUE);

                params.failureCallback(this.provider.config.modules.genericDialogue.content.error, true);
            }
        };

        $.ajax(ajaxOptions);
    }


    showLoginDialogue(params): void {
        // this needs to be postponed otherwise
        // it will trigger before the login event
        // handler is registered.
        setTimeout(() => {
            $.publish(login.LoginDialogue.SHOW_LOGIN_DIALOGUE, [params]);
        }, 1);
    }

    isLoggedIn(): boolean {
        return document.cookie.indexOf("wlauth") >= 0;
    }

    hasPermissionToViewCurrentItem(): boolean{
        return this.isAuthorised(this.currentAssetIndex);
    }

    isAuthorised(assetIndex): boolean {

        var section = this.getSectionByAssetIndex(assetIndex);

        if (section.extensions.authStatus.toLowerCase() == "allowed") {
            return true;
        }

        return false;
    }

    showRestrictedFileDialogue(params) {
        $.publish(restrictedFile.RestrictedFileDialogue.SHOW_RESTRICTED_FILE_DIALOGUE, [params]);
    }

    getInadequatePermissionsMessage(assetIndex): string {

        var section = this.getSectionByAssetIndex(assetIndex);

        switch (section.extensions.accessCondition.toLowerCase()) {
            case 'requires registration':
                return this.provider.config.modules.loginDialogue.requiresRegistrationPermissionsMessage;
            case 'clinical images':
                return this.provider.config.modules.loginDialogue.clinicalImagesPermissionsMessage;
            case 'restricted files':
                return this.provider.config.modules.loginDialogue.restrictedFilesPermissionsMessage;
            case 'closed':
                return this.provider.config.modules.loginDialogue.closedPermissionsMessage;
        }

        return this.provider.config.modules.loginDialogue.inadequatePermissionsMessage;
    }

    allowCloseLogin(): boolean {

        // if there's only one file in the package, you must login to see anything,
        // so don't allow it to be closed.
        // necessary for video/audio which have no ui to trigger
        // new login event.
        return this.provider.assetSequence.assets.length != 1;
    }
}
