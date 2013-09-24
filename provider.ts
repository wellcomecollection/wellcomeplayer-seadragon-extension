/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />
import coreProvider = require("../coreplayer-seadragon-extension/provider");

export class Provider extends coreProvider.Provider {

    constructor(config: any, pkg: any) {
        super(config, pkg);

        $.extend(true, this.config.options, {
            moreInfoUriTemplate: '{0}{1}',
            autoCompleteUriTemplate: '{0}{1}',
            searchUriTemplate: '{0}/service/search/{1}/{2}?t={3}'
        });
    }

    getMoreInfoUri(): string{
        var baseUri = this.options.dataBaseUri || "";
        var uri = baseUri + this.pkg.bibliographicInformation;

        if (this.options.timestampUris) uri = this.addTimestamp(uri);

        return uri;
    }

    getSearchUri(terms: string): string{
    	var baseUri = this.config.options.dataBaseUri || "";
    	return String.prototype.format(this.config.options.searchUriTemplate, baseUri, this.pkg.identifier, this.assetSequenceIndex, terms);
    }

    getAutoCompletePath(): string{
    	var baseUri = this.config.options.dataBaseUri || "";
    	return String.prototype.format(this.config.options.autoCompleteUriTemplate, baseUri, this.assetSequence.autoCompletePath);
    }
}
