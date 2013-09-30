/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />
import coreProvider = require("../coreplayer-seadragon-extension/provider");
import utils = require("../../utils");

export class Provider extends coreProvider.Provider {

    constructor(config: any, pkg: any) {
        super(config, pkg);

        $.extend(true, this.config.options, {
            moreInfoUriTemplate: '{0}{1}',
            autoCompleteUriTemplate: '{0}{1}',
            searchUriTemplate: '{0}/service/search/{1}/{2}?t={3}',
            prefetchUriTemplate: '{0}/fc/{1}/{2}?callback=?',
            assetsUriTemplate: '{0}{1}',
            loginUriTemplate: '{0}/service/login?username={1}&password={2}&setCookies=true&t={3}',
            isSecureLogin: false
        });
    }

    getMoreInfoUri(): string{
        var baseUri = this.options.dataBaseUri || "";
        var uri = baseUri + this.pkg.bibliographicInformation;

        if (this.options.timestampUris) uri = this.addTimestamp(uri);

        return uri;
    }

    getSearchUri(terms: string): string{
    	var baseUri = this.config.options.searchBaseUri || this.config.options.dataBaseUri || "";
    	return String.prototype.format(this.config.options.searchUriTemplate, baseUri, this.pkg.identifier, this.assetSequenceIndex, terms);
    }

    getAutoCompleteUri(): string{
    	var baseUri = this.config.options.autoCompleteBaseUri || this.config.options.dataBaseUri || "";
    	return String.prototype.format(this.config.options.autoCompleteUriTemplate, baseUri, this.assetSequence.autoCompletePath);
    }

    getPrefetchUri(asset: any): string{
        var baseUri = this.config.options.prefetchBaseUri || this.config.options.dataBaseUri || "";
        var fileExtension = asset.fileUri.substr(asset.fileUri.indexOf('.') + 1);
        return String.prototype.format(this.config.options.prefetchUriTemplate, baseUri, asset.identifier, fileExtension);
    }

    getAssetUri(asset: any): string {
        var baseUri = this.config.options.assetsBaseUri || this.config.options.dataBaseUri || "";
        return String.prototype.format(this.config.options.assetsUriTemplate, baseUri, asset.fileUri);
    }

    getLoginUri(username: string, password: string) {
        var baseUri = this.config.options.loginBaseUri || this.config.options.dataBaseUri || "";
        var uri = String.prototype.format(this.config.options.loginUriTemplate, baseUri, username, password, utils.Utils.getTimeStamp());
        if (this.config.options.isSecureLogin) uri = uri.replace("http:", "https:");
        return uri;
    }
}
