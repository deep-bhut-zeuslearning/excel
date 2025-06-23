import { BaseCommand } from './Command';
import type DataManager from './DataManager';
import Column from './Column'; // Import Column to use its static method

/**
 * Command for inserting a column.
 * Supports undo/redo of column insertion.
 */
export default class InsertColumnCommand extends BaseCommand {
    private _dataManager: DataManager;
    private _colIndex: number;

    /**
     * Initializes a new InsertColumnCommand instance.
     * @param dataManager The DataManager instance.
     * @param colIndex The index at which to insert the column.
     * @param description Optional description for the command.
     */
    constructor(dataManager: DataManager, colIndex: number, description: string = "Insert Column") {
        const colLabel = Column.getLabel(colIndex);
        super(description + ` ${colLabel}`);
        this._dataManager = dataManager;
        this._colIndex = colIndex;
    }

    /**
     * Executes the column insertion.
     * @returns True if the command executed successfully, false otherwise.
     */
    execute(): boolean {
        const success = this._dataManager.insertColumn(this._colIndex);
        return success;
    }

    /**
     * Undoes the column insertion.
     * @returns True if the command was undone successfully, false otherwise.
     */
    undo(): boolean {
        const success = this._dataManager.deleteColumn(this._colIndex);
        return success;
    }

    /**
     * Gets the column index for this command.
     * @returns The column index.
     */
    get colIndex(): number {
        return this._colIndex;
    }
}
