// ErrorHandler.ts

/**
 * Centralized error handling and logging
 */

class ErrorHandler {
    static logError(error: Error): void {
        console.error(`[ErrorHandler] ${new Date().toISOString()}:`, error);
        // Additional logging logic (e.g., sending to an external service)
    }

    static handleError(error: Error): void {
        this.logError(error);
        // Depending on the error type, we can implement additional action
    }
}

export default ErrorHandler;