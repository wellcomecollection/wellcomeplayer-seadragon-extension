
import IWellcomeProvider = require("../../modules/wellcomeplayer-shared-module/iWellcomeProvider");
import ISeadragonProvider = require("../coreplayer-seadragon-extension/iSeadragonProvider");
import TreeNode = require("../../modules/coreplayer-shared-module/treeNode");
import JournalSortType = require("./journalSortType");

interface IWellcomeSeadragonProvider extends IWellcomeProvider, ISeadragonProvider{
	getAutoCompleteUri(): string;
	getCrop(asset: any, viewer: any, download: boolean, relativeUri: boolean): string;
	getImage(asset: any, highRes: boolean, download: boolean): string;
	getPDF(download: boolean): string;
	getActualImageUri(asset: any): string;
	getConfinedImageUri(asset: any, width: number, height: number): string;
	getSaveInfo(path: string, thumbnail: string, title: string, index: number, label: string): any;
	getSearchUri(terms: string): string;
    getJournalTree(sortType: JournalSortType.JournalSortType): TreeNode;
}

export = IWellcomeSeadragonProvider;