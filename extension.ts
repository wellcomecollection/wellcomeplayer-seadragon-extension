/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />

import baseExtension = require("../../modules/coreplayer-shared-module/baseExtension");
import coreExtension = require("../coreplayer-seadragon-extension/extension");
import utils = require("../../utils");
import baseProvider = require("../../modules/coreplayer-shared-module/baseProvider");
import provider = require("./provider");
import shell = require("../../modules/coreplayer-shared-module/shell");
import header = require("../../modules/coreplayer-pagingheaderpanel-module/pagingHeaderPanel");
import left = require("../../modules/coreplayer-treeviewleftpanel-module/treeViewLeftPanel");
import right = require("../../modules/wellcomeplayer-moreinforightpanel-module/moreInfoRightPanel");
import footer = require("../../modules/wellcomeplayer-searchfooterpanel-module/footerPanel");
import login = require("../../modules/wellcomeplayer-dialogues-module/loginDialogue");
import restrictedFile = require("../../modules/wellcomeplayer-dialogues-module/restrictedFileDialogue");
import conditions = require("../../modules/wellcomeplayer-dialogues-module/conditionsDialogue");
import download = require("../../modules/wellcomeplayer-dialogues-module/downloadDialogue");
import center = require("../../modules/wellcomeplayer-seadragoncenterpanel-module/seadragonCenterPanel");
import embed = require("../../extensions/coreplayer-seadragon-extension/embedDialogue");
import help = require("../../modules/coreplayer-dialogues-module/helpDialogue");
import IWellcomeExtension = require("../../modules/wellcomeplayer-shared-module/iWellcomeExtension");
import sharedBehaviours = require("../../modules/wellcomeplayer-shared-module/behaviours");
import IProvider = require("../../modules/coreplayer-shared-module/iProvider");
import ISeadragonProvider = require("../coreplayer-seadragon-extension/iSeadragonProvider");
import IWellcomeProvider = require("../../modules/wellcomeplayer-shared-module/iWellcomeProvider");
import IWellcomeSeadragonProvider = require("./iWellcomeSeadragonProvider");
import IWellcomeSeadragonExtension = require("./iWellcomeSeadragonExtension");

export class Extension extends coreExtension.Extension implements IWellcomeSeadragonExtension{

    $conditionsDialogue: JQuery;
    conditionsDialogue: conditions.ConditionsDialogue;
    $loginDialogue: JQuery;
    loginDialogue: login.LoginDialogue;
    $restrictedFileDialogue: JQuery;
    restrictedFileDialogue: restrictedFile.RestrictedFileDialogue;
    $downloadDialogue: JQuery;
    downloadDialogue: download.DownloadDialogue;
    $helpDialogue: JQuery;
    helpDialogue: help.HelpDialogue;

    searchResults: any;

    static SEARCH_RESULTS: string = 'onSearchResults';
    static SEARCH_RESULTS_EMPTY: string = 'onSearchResults';
    static SAVE: string = 'onSave';

    behaviours: sharedBehaviours;

    constructor(provider: IProvider) {
        this.behaviours = new sharedBehaviours(this);

        super(provider);
    }

    create(): void {
        super.create();

        // track unload
        $(window).bind('unload', () => {
            //this.trackEvent("Documents", "Unloaded");
            $.publish(baseExtension.BaseExtension.WINDOW_UNLOAD);
        });

        $.subscribe(footer.FooterPanel.VIEW_PAGE, (e, index: number) => {
            this.viewPage(index);
        });

        $.subscribe(footer.FooterPanel.SEARCH, (e, terms: string) => {
            this.triggerSocket(footer.FooterPanel.SEARCH, terms);
            this.search(terms);
        });

        $.subscribe(footer.FooterPanel.NEXT_SEARCH_RESULT, () => {
            this.nextSearchResult();
        });

        $.subscribe(footer.FooterPanel.PREV_SEARCH_RESULT, () => {
            this.prevSearchResult();
        });

        $.subscribe(footer.FooterPanel.SAVE, (e) => {
            if (this.isFullScreen) {
                $.publish(baseExtension.BaseExtension.TOGGLE_FULLSCREEN);
            }
            this.save();
        });

        $.subscribe(footer.FooterPanel.DOWNLOAD, (e) => {
            $.publish(download.DownloadDialogue.SHOW_DOWNLOAD_DIALOGUE);
        });

        $.subscribe(login.LoginDialogue.LOGIN, (e, params: any) => {
            this.login(params);
        });

        $.subscribe(restrictedFile.RestrictedFileDialogue.NEXT_ITEM, (e, requestedIndex: number) => {
            this.viewNextAvailableIndex(requestedIndex, (nextAvailableIndex: number) => {
                this.viewPage(nextAvailableIndex);
            });
        });

        $.subscribe(Extension.ASSET_INDEX_CHANGED, (e, index: number) => {
            this.triggerSocket(Extension.ASSET_INDEX_CHANGED, index);
        });

        // publish created event
        $.publish(Extension.CREATED);
    }

    createModules(): void{
        this.headerPanel = new header.PagingHeaderPanel(shell.Shell.$headerPanel);

        if (this.isLeftPanelEnabled()){
            this.leftPanel = new left.TreeViewLeftPanel(shell.Shell.$leftPanel);
        }

        this.centerPanel = new center.SeadragonCenterPanel(shell.Shell.$centerPanel);
        this.rightPanel = new right.MoreInfoRightPanel(shell.Shell.$rightPanel);
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

        this.$embedDialogue = utils.Utils.createDiv('overlay embed');
        shell.Shell.$overlays.append(this.$embedDialogue);
        this.embedDialogue = new embed.EmbedDialogue(this.$embedDialogue);

        this.$downloadDialogue = utils.Utils.createDiv('overlay download');
        shell.Shell.$overlays.append(this.$downloadDialogue);
        this.downloadDialogue = new download.DownloadDialogue(this.$downloadDialogue);

        this.$helpDialogue = utils.Utils.createDiv('overlay help');
        shell.Shell.$overlays.append(this.$helpDialogue);
        this.helpDialogue = new help.HelpDialogue(this.$helpDialogue);

        if (this.isLeftPanelEnabled()){
            this.leftPanel.init();
        }
    }

    search(terms) {

        var searchUri = (<IWellcomeSeadragonProvider>this.provider).getSearchUri(terms);

        var that = this;

        $.getJSON(searchUri, (results) => {
            if (results.length) {
                that.searchResults = results;

                $.publish(Extension.SEARCH_RESULTS, [terms, results]);

                // reload current index as it may contain results.
                that.viewPage(that.currentAssetIndex);
            } else {
                that.showDialogue(that.provider.config.modules.genericDialogue.content.noMatches, () => {
                    $.publish(Extension.SEARCH_RESULTS_EMPTY);
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

                var dziUri = (<ISeadragonProvider>this.provider).getDziUri(asset);

                $.publish(Extension.OPEN_MEDIA, [dziUri]);

                this.setParam(baseProvider.params.assetIndex, assetIndex);

                // todo: add this to more general trackEvent
                this.updateSlidingExpiration();
            });
            
        });
    }

    save(): void {

        if (!this.isLoggedIn()) {
            this.showLoginDialogue({
                successCallback: () => {
                    this.save();
                },
                failureCallback: (message: string) => {
                    this.showDialogue(message, () => {
                        this.save();
                    });
                },
                allowClose: true,
                message: this.provider.config.modules.genericDialogue.content.loginToSave
            });
        } else {
            var path = (<IWellcomeProvider>this.provider).getSaveUri();
            var thumbnail = this.getCropUri(true);
            var title = this.provider.getTitle();
            var asset = this.getCurrentAsset();
            var label = asset.orderLabel;

            var info = (<IWellcomeSeadragonProvider>this.provider).getSaveInfo(path, thumbnail, title, this.currentAssetIndex, label);
            this.triggerSocket(Extension.SAVE, info);
        }
    }

    getViewer() {
        return this.centerPanel.viewer;
    }

    getCropUri(relative: boolean): string {
        var page = this.getCurrentAsset();
        var viewer = this.getViewer();
        return (<IWellcomeSeadragonProvider>this.provider).getCrop(page, viewer, false, relative);
    }

    setParams(): void{
        if (!this.provider.isHomeDomain) return;        

        // check if there are legacy params and reformat.
        // if the string isn't empty and doesn't contain a ? sign it's a legacy hash.
        var hash = parent.document.location.hash;

        if (hash != '' && !hash.contains('?')){
            // split params on '/'.
            var params = hash.replace('#', '').split('/');

            // reset hash to empty.
            parent.document.location.hash = '';

            // assetSequenceIndex
            if (params[0]){
                this.setParam(baseProvider.params.assetSequenceIndex, this.provider.assetSequenceIndex);
            }

            // assetIndex
            if (params[1]){
                this.setParam(baseProvider.params.assetIndex, params[1]);
            }

            // zoom or search
            if (params[2]){
                
                if (params[2].indexOf('=') != -1){
                    // it's a search param.
                    var a = params[2].split('=');

                    utils.Utils.setHashParameter(a[0], a[1], parent.document);
                } else {
                    this.setParam(baseProvider.params.zoom, params[2]);
                }
            }

            // search
            if (params[3]){
                var s = params[3];

                // split into key/val.
                var a = s.split('=');

                utils.Utils.setHashParameter(a[0], a[1], parent.document);
            }
        } else {
            // set assetSequenceIndex hash param.
            this.setParam(baseProvider.params.assetSequenceIndex, this.provider.assetSequenceIndex);
        }
    }

    // everything from here down is common to wellcomplayer extensions.

    viewIndex(assetIndex: number, successCallback?: any): void {
        this.behaviours.viewIndex(assetIndex, successCallback);
    }

    // ensures that a file is in the server cache.
    prefetchAsset(assetIndex: number, successCallback: any): void{
        this.behaviours.prefetchAsset(assetIndex, successCallback);
    }

    authorise(assetIndex: number, successCallback: any, failureCallback: any): void {
        this.behaviours.authorise(assetIndex, successCallback, failureCallback);        
    }

    login(params: any): void {
        this.behaviours.login(params);
    }

    viewNextAvailableIndex(requestedIndex: number, callback: any): void {
        this.behaviours.viewNextAvailableIndex(requestedIndex, callback);        
    }

    // pass direction as 1 or -1.
    nextAvailableIndex(direction: number, requestedIndex: number): number {
        return this.behaviours.nextAvailableIndex(direction, requestedIndex);
    }

    showLoginDialogue(params): void {
        this.behaviours.showLoginDialogue(params);
    }

    isLoggedIn(): boolean {
        return this.behaviours.isLoggedIn();
    }

    hasPermissionToViewCurrentItem(): boolean{
        return this.behaviours.hasPermissionToViewCurrentItem();
    }

    isAuthorised(assetIndex): boolean {
        return this.behaviours.isAuthorised(assetIndex);
    }

    showRestrictedFileDialogue(params): void {
        this.behaviours.showRestrictedFileDialogue(params);
    }

    getInadequatePermissionsMessage(assetIndex): string {
        return this.behaviours.getInadequatePermissionsMessage(assetIndex);
    }

    allowCloseLogin(): boolean {
        return this.behaviours.allowCloseLogin();
    }

    updateSlidingExpiration(): void {
        this.behaviours.updateSlidingExpiration();
    }

    trackEvent(category: string, action: string, label: string, value: string): void {
        this.behaviours.trackEvent(category, action, label, value);
    }

    trackVariable(slot: number, name: string, value: string, scope: number): void{
        this.behaviours.trackVariable(slot, name, value, scope);
    }

    isSaveToLightboxEnabled(): boolean {
        return this.behaviours.isSaveToLightboxEnabled();
    }

    isDownloadEnabled(): boolean {
        return this.behaviours.isDownloadEnabled();
    }
}
