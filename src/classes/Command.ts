/**
 * Base interface for all commands in the command pattern
 * Enables undo/redo functionality for all grid operations
 */
export interface ICommand {
    /**
     * Executes the command
     * @returns {boolean} True if the command was executed successfully
     */
    execute(): boolean;
    
    /**
     * Undoes the command
     * @returns {boolean} True if the command was undone successfully
     */
    undo(): boolean;
    
    /**
     * Gets a description of the command for debugging
     * @returns {string} Command description
     */
    getDescription(): string;
}

/**
 * Abstract base class for all commands
 * Provides common functionality for command implementations
 */
export abstract class BaseCommand implements ICommand {
    /** @type {Date} Timestamp when the command was created */
    protected _timestamp: Date;
    
    /** @type {string} Description of this command */
    protected _description: string;

    /**
     * Initializes a new BaseCommand instance
     * @param {string} description - Description of the command
     */
    constructor(description: string) {
        this._timestamp = new Date();
        this._description = description;
    }

    /**
     * Gets the timestamp when this command was created
     * @returns {Date} Creation timestamp
     */
    get timestamp(): Date {
        return this._timestamp;
    }

    /**
     * Gets the description of this command
     * @returns {string} Command description
     */
    getDescription(): string {
        return this._description;
    }

    /**
     * Abstract method to execute the command
     * Must be implemented by derived classes
     * @returns {boolean} True if execution was successful
     */
    abstract execute(): boolean;

    /**
     * Abstract method to undo the command
     * Must be implemented by derived classes
     * @returns {boolean} True if undo was successful
     */
    abstract undo(): boolean;
}

export { BaseCommand }