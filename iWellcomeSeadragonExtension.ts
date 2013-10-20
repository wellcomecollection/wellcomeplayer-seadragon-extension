
import IWellcomeExtension = require("../../modules/wellcomeplayer-shared-module/iWellcomeExtension");

interface IWellcomeSeadragonExtension extends IWellcomeExtension{
	getMode(): string;
}

export = IWellcomeSeadragonExtension;