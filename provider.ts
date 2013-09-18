/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />
import coreProvider = require("../coreplayer-seadragon-extension/provider");

export class Provider extends coreProvider.Provider {

    constructor(config: any, pkg: any) {
        super(config, pkg);
    }

    getMoreInfoUri(): string{
        var baseUri = this.options.dataBaseUri || "";
        var uri = baseUri + this.pkg.bibliographicInformation;

        if (this.options.timestampUris) uri = this.addTimestamp(uri);

        return uri;
    }

}
