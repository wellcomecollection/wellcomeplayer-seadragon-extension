/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />
import coreProvider = require("../coreplayer-seadragon-extension/iiifProvider");
import utils = require("../../utils");
import IWellcomeSeadragonProvider = require("./iWellcomeSeadragonProvider");
import TreeNode = require("../../modules/coreplayer-shared-module/treeNode");
import journalSortType = require("./journalSortType");

export class Provider extends coreProvider.Provider implements IWellcomeSeadragonProvider{

    moreInfo: any;

    constructor(config: any, manifest: any) {
        super(config, manifest);

        $.extend(true, this.config.options, {
            moreInfoUriTemplate: '{0}{1}',
            autoCompleteUriTemplate: '{0}{1}',
            searchUriTemplate: '{0}/service/search/{1}/{2}?t={3}',
            prefetchUriTemplate: '{0}/fc/{1}/{2}?callback=?',
            assetsUriTemplate: '{0}{1}',
            loginUriTemplate: '{0}/service/login?username={1}&password={2}&setCookies=true&t={3}',
            cropImageUriTemplate: '{0}/crop/{1}/{2}/{3}/jp2?left={4}&top={5}&width={6}&height={7}&scaleWidth={8}&scaleHeight={9}&origWidth={10}&origHeight={11}&RGN={12}',
            actualImageUriTemplate: '{0}/actual/{1}/{2}/{3}/jp2',
            confineImageUriTemplate: '{0}/confine/{1}/{2}/{3}/jp2?boundingWidth={4}&boundingHeight={5}&origWidth={6}&origHeight={7}',
            pdfUriTemplate: '{0}/pdf/{1}/{2}/{3}_{2}.pdf',
            isSecureLogin: false,
            embedScriptUri: 'http://wellcomelibrary.org/spas/player/build/wellcomeplayer/js/embed.js'
        });
    }

    getMoreInfoUri(): string{
        var baseUri = this.options.dataBaseUri || "";
        var uri = baseUri + this.manifest.bibliographicInformation;

        if (this.options.timestampUris) uri = this.addTimestamp(uri);

        return uri;
    }

    getSearchUri(terms: string): string{
        var baseUri = this.config.options.searchBaseUri || this.config.options.dataBaseUri || "";
        return String.prototype.format(this.config.options.searchUriTemplate, baseUri, this.manifest.identifier, this.sequenceIndex, terms);
    }

    getAutoCompleteUri(): string{
        var baseUri = this.config.options.autoCompleteBaseUri || this.config.options.dataBaseUri || "";
        return String.prototype.format(this.config.options.autoCompleteUriTemplate, baseUri, this.sequence.autoCompletePath);
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

    getLoginUri(username: string, password: string): string {
        var baseUri = this.config.options.loginBaseUri || this.config.options.dataBaseUri || "";
        var uri = String.prototype.format(this.config.options.loginUriTemplate, baseUri, username, password, utils.Utils.getTimeStamp());
        if (this.config.options.isSecureLogin) uri = uri.replace("http:", "https:");
        return uri;
    }

    getCrop(asset: any, viewer: any, download: boolean = false, relativeUri: boolean = false): string {

        var bounds = viewer.viewport.getBounds(true);
        var size = viewer.viewport.getContainerSize();
        var zoom = viewer.viewport.getZoom(true);

        var top = bounds.y;
        var left = bounds.x;
        var height = bounds.height;
        var width = bounds.width;

        // change top and height to be normalised values proportional to height of image, not width (as per seadragon).
        top = 1 / (asset.height / parseInt(String(asset.width * top)));
        height = 1 / (asset.height / parseInt(String(asset.width * height)));

        // get on-screen pixel sizes.

        var viewportWidthPx = size.x;
        var viewportHeightPx = size.y;

        var imageWidthPx = parseInt(String(viewportWidthPx * zoom));
        var ratio = asset.width / imageWidthPx;
        var imageHeightPx = parseInt(String(asset.height / ratio));

        var viewportLeftPx = parseInt(String(left * imageWidthPx));
        var viewportTopPx = parseInt(String(top * imageHeightPx));

        var rect1Left = 0;
        var rect1Right = imageWidthPx;
        var rect1Top = 0;
        var rect1Bottom = imageHeightPx;

        var rect2Left = viewportLeftPx;
        var rect2Right = viewportLeftPx + viewportWidthPx;
        var rect2Top = viewportTopPx;
        var rect2Bottom = viewportTopPx + viewportHeightPx;

        var cropWidth = Math.max(0, Math.min(rect1Right, rect2Right) - Math.max(rect1Left, rect2Left))
        var cropHeight = Math.max(0, Math.min(rect1Bottom, rect2Bottom) - Math.max(rect1Top, rect2Top));

        // end get on-screen pixel sizes.

        // get original image pixel sizes.

        var ratio2 = asset.width / imageWidthPx;

        var widthPx = parseInt(String(cropWidth * ratio2));
        var heightPx = parseInt(String(cropHeight * ratio2));

        var topPx = parseInt(String(asset.height * top));
        var leftPx = parseInt(String(asset.width * left));

        if (topPx < 0) topPx = 0;
        if (leftPx < 0) leftPx = 0;

        // end get original image pixel sizes.

        var rgn = left + "," + top + "," + width + "," + height;

        var baseUri = this.config.options.cropBaseUri || this.config.options.dataBaseUri || "";
        var uri = String.prototype.format(this.config.options.cropImageUriTemplate, baseUri, this.manifest.identifier, this.sequenceIndex, asset.identifier, leftPx, topPx, widthPx, heightPx, cropWidth, cropHeight, asset.width, asset.height, rgn);

        if (download) {
            uri += "&download=true";
        }

        if (relativeUri) {
            // convert to relative uri.
            uri = utils.Utils.convertToRelativeUrl(uri);
        }

        return uri;
    }

    getImage(asset: any, highRes: boolean, download: boolean = false): string {

        var uri;

        if (highRes) {
            uri = this.getActualImageUri(asset);
            if (download) uri += "?download=true";
        } else {
            uri = this.getConfinedImageUri(asset, 1000, 1000);
            if (download) uri += "&download=true";
        }

        return uri;
    }

    getPDF(download: boolean = false): string {

        var baseUri = this.config.options.pdfBaseUri || this.config.options.dataBaseUri || "";
        var uri = String.prototype.format(this.config.options.pdfUriTemplate, baseUri, this.manifest.identifier, this.sequenceIndex, this.manifest.identifier);

        if (download){
            uri += "?download=true";
        }

        return uri;
    }

    getActualImageUri(asset: any): string {
        var baseUri = this.config.options.actualImageBaseUri || this.config.options.dataBaseUri || "";
        return String.prototype.format(this.config.options.actualImageUriTemplate, baseUri, this.manifest.identifier, this.sequenceIndex, asset.identifier);
    }

    getConfinedImageUri(asset: any, width: number, height: number): string {
        var baseUri = this.config.options.confineImageBaseUri || this.config.options.dataBaseUri || "";
        return String.prototype.format(this.config.options.confineImageUriTemplate, baseUri, this.manifest.identifier, this.sequenceIndex, asset.identifier, width, height, asset.width, asset.height);
    }

    getSaveUri(): string {
        var absUri = parent.document.URL;
        var parts = utils.Utils.getUrlParts(absUri);
        var relUri = parts.pathname + parent.document.location.hash;

        if (!relUri.startsWith("/")) {
            relUri = "/" + relUri;
        }

        return relUri;
    }

    getSaveInfo(path: string, thumbnail: string, title: string, index: number, label: string): any {
        return {
            "CaptureType": "i",
            "Path": path,
            "Thumbnail": thumbnail,
            "Title": title,
            "ImageIndex": index,
            "PageNumber": label
        }
    }

    getJournalTree(sortType: journalSortType.JournalSortType): TreeNode {
        return new TreeNode();
    }
}
