
import ISeadragonExtension = require("../coreplayer-seadragon-extension/iSeadragonExtension");

interface IWellcomeSeadragonExtension extends ISeadragonExtension{
    getCropUri(relative: boolean): string;
    getViewer(): any;
}

export = IWellcomeSeadragonExtension;