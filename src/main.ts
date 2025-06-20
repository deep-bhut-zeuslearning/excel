import './styles/main.css';
import ExcelGrid from './classes/ExcelGrid';

/**
 * Application entry point
 * Initializes the Excel Grid when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        new ExcelGrid();
    } catch (error) {
        console.error('Failed to initialize Excel Grid:', error);
    }
});