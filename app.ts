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
    $restrictedFileDialogue: JQuery;
    restrictedFileDialogue: restrictedFile.RestrictedFileDialogue;

    searchResults: any;
    sessionTimer: any;

    static SEARCH_RESULTS: string = 'onSearchResults';
    static SEARCH_RESULTS_EMPTY: string = 'onSearchResults';
    static WINDOW_UNLOAD: string = 'onWindowUnload';
    static ESCAPE: string = 'onEscape';
    static RETURN: string = 'onReturn';
    static TRACK_EVENT: string = 'onTrackEvent';
    static CLOSE_ACTIVE_DIALOGUE: string = 'onCloseActiveDialogue';

    constructor(provider: provider.Provider) {
        super(provider);
    }

    create(): void {
        super.create();

        // keyboard events.
        $(document).keyup((e) => {
            if (e.keyCode === 27) $.publish(App.ESCAPE);
            if (e.keyCode === 13) $.publish(App.RETURN);
        });

        $.subscribe(App.ESCAPE, () => {
            if (this.isFullScreen) {
                $.publish(baseApp.BaseApp.TOGGLE_FULLSCREEN);
            }
        });

        // track unload
        $(window).bind('unload', () => {
            this.trackAction("Documents", "Unloaded");
            $.publish(App.WINDOW_UNLOAD);
        });

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

        $.subscribe(restrictedFile.RestrictedFileDialogue.NEXT_ITEM, (e, requestedIndex: number) => {
            this.viewNextAvailableIndex(requestedIndex);
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

        this.$restrictedFileDialogue = utils.Utils.createDiv('overlay restrictedFile');
        shell.Shell.$overlays.append(this.$restrictedFileDialogue);
        this.restrictedFileDialogue = new restrictedFile.RestrictedFileDialogue(this.$restrictedFileDialogue);
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

    viewNextAvailableIndex(requestedIndex: number): void {

        var nextAvailableIndex;

        if (requestedIndex < this.currentAssetIndex) {
            nextAvailableIndex = this.nextAvailableIndex(-1, requestedIndex);
        } else {
            nextAvailableIndex = this.nextAvailableIndex(1, requestedIndex);
        }

        if (nextAvailableIndex) {
            this.viewPage(nextAvailableIndex);
        } else {
            this.showDialogue(this.provider.config.modules.genericDialogue.content.noRemainingVisibleItems);
        }
    }

    // pass direction as 1 or -1.
    nextAvailableIndex(direction: number, requestedIndex: number) {

        for (var i = requestedIndex; i < this.provider.assetSequence.assets.length && i >= 0; i += direction) {
            if (i == requestedIndex) continue;
            if (this.isAuthorised(i)) {
                return i;
            }
        }

        return null;
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

    updateSlidingExpiration(): void {

        // not necessary if content is all open.
        if (this.provider.pkg.extensions.isAllOpen) return;

        // some (or all) of the content requires login.
        // if the user has a session, update the sliding expiration.
        if (!this.isLoggedIn()) return;

        var that = this;

        // get ttl.
        $.ajax({
            url: '/service/ttl',
            type: 'GET',
            success: (time) => {
                time = parseInt(time);

                // don't create a session timer if the session has expired.
                if (time == -1) return;

                var ms = time * 1000;

                if (that.sessionTimer) {
                    clearTimeout(that.sessionTimer);
                }

                that.sessionTimer = setTimeout(function () {
                    that.closeActiveDialogue();
                    that.showDialogue(that.provider.config.modules.genericDialogue.sessionExpired, () => {
                        that.refresh();
                    }, that.provider.config.modules.genericDialogue.refresh, false);
                }, ms);
            }
        });
    }

    closeActiveDialogue(): void{
        $.publish(App.CLOSE_ACTIVE_DIALOGUE);
    }

    trackAction(category, action) {

        var label = this.getTrackActionLabel();

        //log(category, action, label);

        // update sliding session expiration.
        this.updateSlidingExpiration();

        try {
            trackEvent(category, action, label);
        } catch (e) {
            // do nothing
        }
    }

    getTrackActionLabel() {
        return      "bNumber: " + this.provider.pkg.identifier 
                + ", type: " + this.provider.type 
                + ", assetSequenceIndex: " + this.provider.assetSequenceIndex
                + ", asset: " + this.currentAssetIndex 
                + ", isLoggedIn: " + this.isLoggedIn() 
                + ", isHomeDomain: " + this.provider.isHomeDomain 
                + ", uri: " + window.parent.location;
    }
}
